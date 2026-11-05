#!/usr/bin/env python3
"""
Hunza Valley - Cinematic 3D Environment
=======================================
A complete, self-contained Blender scene generator for a professional
tourism-style visualization of Hunza Valley, Gilgit-Baltistan.

Builds Karakoram peaks, a turquoise river, terraced fields, a stone village,
Baltit Fort, Altit Fort, orchards, poplars, pine slopes, a wooden bridge,
atmospheric haze and a set of cinematic cameras.

Requirements
------------
Blender 4.2+ (the script uses stable bpy / Cycles APIs).

Run (background, recommended)
-----------------------------
    blender -b -P hunza_valley.py

Quick preview render:
    blender -b -P hunza_valley.py -- --samples 24 --percent 50

Build the scene without rendering:
    blender -b -P hunza_valley.py -- --no-render

Outputs (default):
    ~/HimalayaConnect_Renders/hunza_valley.blend
    ~/HimalayaConnect_Renders/hunza_valley.png

Everything is procedural. No external textures, HDRIs or models are used.
"""

import bpy
import bmesh
import math
import os
import random
import sys
from mathutils import Vector, Matrix, noise as mnoise

# =============================================================================
# CONFIGURATION
# =============================================================================

SEED = 90210
RES_X, RES_Y = 1920, 1080
SAMPLES = 64
RES_PERCENT = 100
OUTPUT_DIR = os.environ.get(
    "HUNZA_OUTPUT_DIR",
    os.path.join(os.path.expanduser("~"), "HimalayaConnect_Renders"),
)
BLEND_NAME = "hunza_valley.blend"
RENDER_NAME = "hunza_valley.png"


def _arg_value(flag, default):
    if flag in sys.argv:
        i = sys.argv.index(flag)
        if i + 1 < len(sys.argv):
            return sys.argv[i + 1]
    return default


SAMPLES = int(_arg_value("--samples", SAMPLES))
RES_PERCENT = int(_arg_value("--percent", RES_PERCENT))
NO_RENDER = "--no-render" in sys.argv
FORCE_CPU = "--cpu" in sys.argv

rng = random.Random(SEED)
random.seed(SEED)

TAU = math.tau
COL = {}
MATS = {}


# =============================================================================
# MATH / NOISE
# =============================================================================


def clamp(x, lo=0.0, hi=1.0):
    return lo if x < lo else hi if x > hi else x


def smoothstep(a, b, x):
    if a == b:
        return 0.0
    t = clamp((x - a) / (b - a))
    return t * t * (3.0 - 2.0 * t)


def lerp(a, b, t):
    return a + (b - a) * t


def mix3(a, b, t):
    return tuple(lerp(a[i], b[i], t) for i in range(3))


def fbm(p, octaves=5, lacunarity=2.0, gain=0.5):
    total = 0.0
    amp = 1.0
    freq = 1.0
    norm = 0.0
    for _ in range(octaves):
        total += amp * mnoise.noise(Vector((p.x * freq, p.y * freq, p.z * freq)))
        norm += amp
        amp *= gain
        freq *= lacunarity
    return total / max(norm, 1e-9)


def ridged(p, octaves=6, lacunarity=2.07, gain=0.5):
    total = 0.0
    amp = 1.0
    freq = 1.0
    norm = 0.0
    for _ in range(octaves):
        n = 1.0 - abs(mnoise.noise(Vector((p.x * freq, p.y * freq, p.z * freq))))
        n *= n
        total += n * amp
        norm += amp
        amp *= gain
        freq *= lacunarity
    return total / max(norm, 1e-9)


# =============================================================================
# SCENE RESET / COLLECTIONS
# =============================================================================


def reset_scene():
    if bpy.context.object and bpy.context.object.mode != "OBJECT":
        try:
            bpy.ops.object.mode_set(mode="OBJECT")
        except Exception:
            pass
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    for collection in list(bpy.data.collections):
        bpy.data.collections.remove(collection)
    for datablocks in (
        bpy.data.meshes,
        bpy.data.curves,
        bpy.data.materials,
        bpy.data.lights,
        bpy.data.cameras,
        bpy.data.worlds,
        bpy.data.images,
    ):
        for block in list(datablocks):
            if block.users == 0:
                datablocks.remove(block)
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = 1.0
    return scene


def make_collections():
    names = (
        "Karakoram_Mountains",
        "Hunza_Terrain",
        "Hunza_River",
        "Traditional_Village",
        "Baltit_Fort",
        "Altit_Fort",
        "Vegetation",
        "Lighting",
        "Cameras",
    )
    for name in names:
        col = bpy.data.collections.new(name)
        bpy.context.scene.collection.children.link(col)
        COL[name] = col


# =============================================================================
# MATERIALS
# =============================================================================


def _rgba(color):
    if len(color) == 4:
        return color
    return (color[0], color[1], color[2], 1.0)


def set_socket(node, names, value):
    if isinstance(names, str):
        names = (names,)
    for name in names:
        sock = node.inputs.get(name)
        if sock is not None:
            try:
                sock.default_value = value
                return True
            except Exception:
                pass
    return False


def new_material(name):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    for node in list(nt.nodes):
        nt.nodes.remove(node)
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    out.location = (700, 0)
    return mat, nt, out


def new_principled(name, color, roughness=0.8, metallic=0.0):
    mat, nt, out = new_material(name)
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.location = (350, 0)
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    set_socket(bsdf, "Base Color", _rgba(color))
    set_socket(bsdf, "Roughness", roughness)
    set_socket(bsdf, "Metallic", metallic)
    mat.diffuse_color = _rgba(color)
    return mat, nt, bsdf


def add_noise_bump(
    nt,
    bsdf,
    scale=8.0,
    strength=0.25,
    distance=0.06,
    detail=8.0,
    roughness=0.55,
    distortion=0.0,
    coord="Object",
):
    tc = nt.nodes.new("ShaderNodeTexCoord")
    tc.location = (-700, -300)
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.location = (-500, -300)
    set_socket(noise, "Scale", scale)
    set_socket(noise, "Detail", detail)
    set_socket(noise, "Roughness", roughness)
    set_socket(noise, "Distortion", distortion)
    nt.links.new(tc.outputs[coord], noise.inputs["Vector"])
    bump = nt.nodes.new("ShaderNodeBump")
    bump.location = (-200, -300)
    set_socket(bump, "Strength", strength)
    set_socket(bump, "Distance", distance)
    nt.links.new(noise.outputs["Fac"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return noise


def add_ramp(nt, stops, location=(-250, 200), interpolation="LINEAR"):
    node = nt.nodes.new("ShaderNodeValToRGB")
    node.location = location
    ramp = node.color_ramp
    while len(ramp.elements) > 1:
        ramp.elements.remove(ramp.elements[-1])
    ramp.elements[0].position = stops[0][0]
    ramp.elements[0].color = _rgba(stops[0][1])
    for pos, col in stops[1:]:
        element = ramp.elements.new(pos)
        element.color = _rgba(col)
    ramp.interpolation = interpolation
    return node


def new_mix_color(nt, location=(0, 200), blend_type="MIX"):
    try:
        node = nt.nodes.new("ShaderNodeMixRGB")
        node.blend_type = blend_type
        node.location = location
        return node, node.inputs[0], node.inputs[1], node.inputs[2], node.outputs[0]
    except RuntimeError:
        node = nt.nodes.new("ShaderNodeMix")
        node.data_type = "RGBA"
        node.blend_type = blend_type
        node.location = location
        return node, node.inputs[0], node.inputs[6], node.inputs[7], node.outputs[2]


def build_materials():
    # snow -------------------------------------------------------------------
    mat, nt, bsdf = new_principled("Hunza_Snow", (0.84, 0.88, 0.95), 0.38)
    set_socket(bsdf, "Subsurface Weight", 0.05)
    set_socket(bsdf, "Subsurface Radius", (0.2, 0.3, 0.5))
    add_noise_bump(nt, bsdf, scale=18.0, strength=0.12, distance=0.05, detail=6.0)
    MATS["snow"] = mat

    # mountain rock + snow ---------------------------------------------------
    mat, nt, out = new_material("Karakoram_SnowRock")
    bsdf_rock = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf_rock.location = (250, 180)
    set_socket(bsdf_rock, "Roughness", 0.95)
    set_socket(bsdf_rock, "Specular IOR Level", 0.25)
    tc = nt.nodes.new("ShaderNodeTexCoord")
    tc.location = (-1000, 200)
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.location = (-780, 200)
    set_socket(noise, "Scale", 0.02)
    set_socket(noise, "Detail", 12.0)
    set_socket(noise, "Roughness", 0.62)
    set_socket(noise, "Distortion", 0.3)
    nt.links.new(tc.outputs["Object"], noise.inputs["Vector"])
    rock_ramp = add_ramp(
        nt,
        [
            (0.26, (0.025, 0.024, 0.022)),
            (0.52, (0.085, 0.078, 0.070)),
            (0.82, (0.20, 0.185, 0.165)),
        ],
        (-500, 200),
    )
    nt.links.new(noise.outputs["Fac"], rock_ramp.inputs["Fac"])
    nt.links.new(rock_ramp.outputs["Color"], bsdf_rock.inputs["Base Color"])
    add_noise_bump(nt, bsdf_rock, scale=0.006, strength=0.65, distance=9.0, detail=12.0)

    bsdf_snow = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf_snow.location = (250, -220)
    set_socket(bsdf_snow, "Base Color", (0.78, 0.83, 0.91, 1.0))
    set_socket(bsdf_snow, "Roughness", 0.44)
    set_socket(bsdf_snow, "Subsurface Weight", 0.04)
    set_socket(bsdf_snow, "Specular IOR Level", 0.45)
    add_noise_bump(nt, bsdf_snow, scale=0.012, strength=0.22, distance=2.5, detail=8.0)

    attr = nt.nodes.new("ShaderNodeAttribute")
    attr.attribute_name = "SnowMask"
    attr.location = (-520, -420)
    breakup = nt.nodes.new("ShaderNodeTexNoise")
    breakup.location = (-780, -520)
    set_socket(breakup, "Scale", 0.08)
    set_socket(breakup, "Detail", 6.0)
    nt.links.new(tc.outputs["Object"], breakup.inputs["Vector"])
    breakup_ramp = add_ramp(
        nt, [(0.42, (0.7, 0.7, 0.7)), (0.6, (1.0, 1.0, 1.0))], (-520, -520)
    )
    nt.links.new(breakup.outputs["Fac"], breakup_ramp.inputs["Fac"])
    snow_fac = nt.nodes.new("ShaderNodeMath")
    snow_fac.operation = "MULTIPLY"
    snow_fac.location = (-240, -430)
    nt.links.new(attr.outputs["Fac"], snow_fac.inputs[0])
    nt.links.new(breakup_ramp.outputs["Color"], snow_fac.inputs[1])
    mix = nt.nodes.new("ShaderNodeMixShader")
    mix.location = (520, 0)
    nt.links.new(snow_fac.outputs[0], mix.inputs[0])
    nt.links.new(bsdf_rock.outputs["BSDF"], mix.inputs[1])
    nt.links.new(bsdf_snow.outputs["BSDF"], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs["Surface"])
    MATS["mountain"] = mat

    # terrain ----------------------------------------------------------------
    mat, nt, out = new_material("Hunza_Terrain_Mat")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.location = (300, 0)
    set_socket(bsdf, "Roughness", 0.93)
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    attr = nt.nodes.new("ShaderNodeAttribute")
    attr.attribute_name = "GroundColor"
    attr.location = (-650, 200)
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.location = (-650, -250)
    set_socket(noise, "Scale", 0.32)
    set_socket(noise, "Detail", 9.0)
    set_socket(noise, "Roughness", 0.6)
    tc = nt.nodes.new("ShaderNodeTexCoord")
    tc.location = (-900, -250)
    nt.links.new(tc.outputs["Object"], noise.inputs["Vector"])
    detail_ramp = add_ramp(
        nt, [(0.25, (0.55, 0.55, 0.5)), (0.75, (1.0, 1.0, 0.92))], (-350, -250)
    )
    nt.links.new(noise.outputs["Fac"], detail_ramp.inputs["Fac"])
    mix, fac, col_a, col_b, mix_out = new_mix_color(nt, (-100, 100), "MULTIPLY")
    fac.default_value = 0.32
    nt.links.new(attr.outputs["Color"], col_a)
    nt.links.new(detail_ramp.outputs["Color"], col_b)
    nt.links.new(mix_out, bsdf.inputs["Base Color"])
    add_noise_bump(nt, bsdf, scale=1.4, strength=0.3, distance=0.35, detail=10.0)
    MATS["terrain"] = mat

    # rock -------------------------------------------------------------------
    mat, nt, bsdf = new_principled("Hunza_Rock", (0.17, 0.155, 0.135), 0.95)
    add_noise_bump(nt, bsdf, scale=2.0, strength=0.5, distance=0.35, detail=10.0)
    MATS["rock"] = mat

    # stone walls ------------------------------------------------------------
    mat, nt, out = new_material("Hunza_Stone_Wall")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.location = (350, 0)
    set_socket(bsdf, "Roughness", 0.9)
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    tc = nt.nodes.new("ShaderNodeTexCoord")
    tc.location = (-700, 100)
    brick = nt.nodes.new("ShaderNodeTexBrick")
    brick.location = (-450, 100)
    set_socket(brick, "Scale", 1.3)
    set_socket(brick, "Mortar Size", 0.02)
    set_socket(brick, "Mortar Smooth", 0.3)
    set_socket(brick, "Brick Width", 0.72)
    set_socket(brick, "Row Height", 0.32)
    set_socket(brick, "Color1", (0.23, 0.21, 0.18, 1.0))
    set_socket(brick, "Color2", (0.36, 0.33, 0.28, 1.0))
    set_socket(brick, "Mortar", (0.09, 0.08, 0.07, 1.0))
    nt.links.new(tc.outputs["Object"], brick.inputs["Vector"])
    nt.links.new(brick.outputs["Color"], bsdf.inputs["Base Color"])
    add_noise_bump(nt, bsdf, scale=5.0, strength=0.3, distance=0.06, detail=9.0)
    MATS["stone_wall"] = mat

    mat, nt, bsdf = new_principled("Hunza_Dressed_Stone", (0.34, 0.32, 0.28), 0.88)
    add_noise_bump(nt, bsdf, scale=3.0, strength=0.28, distance=0.08, detail=9.0)
    MATS["stone"] = mat

    mat, nt, bsdf = new_principled("Hunza_Path", (0.28, 0.25, 0.21), 0.92)
    add_noise_bump(nt, bsdf, scale=4.5, strength=0.32, distance=0.1, detail=8.0)
    MATS["path"] = mat

    mat, nt, out = new_material("Fort_Stone")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.location = (350, 0)
    set_socket(bsdf, "Roughness", 0.93)
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    tc = nt.nodes.new("ShaderNodeTexCoord")
    tc.location = (-700, 100)
    brick = nt.nodes.new("ShaderNodeTexBrick")
    brick.location = (-450, 100)
    set_socket(brick, "Scale", 0.85)
    set_socket(brick, "Mortar Size", 0.025)
    set_socket(brick, "Mortar Smooth", 0.25)
    set_socket(brick, "Brick Width", 0.85)
    set_socket(brick, "Row Height", 0.38)
    set_socket(brick, "Color1", (0.105, 0.095, 0.08, 1.0))
    set_socket(brick, "Color2", (0.22, 0.20, 0.165, 1.0))
    set_socket(brick, "Mortar", (0.045, 0.04, 0.033, 1.0))
    nt.links.new(tc.outputs["Object"], brick.inputs["Vector"])
    nt.links.new(brick.outputs["Color"], bsdf.inputs["Base Color"])
    add_noise_bump(nt, bsdf, scale=3.2, strength=0.4, distance=0.08, detail=10.0)
    MATS["fort_stone"] = mat

    # wood -------------------------------------------------------------------
    mat, nt, out = new_material("Hunza_Wood")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.location = (300, 0)
    set_socket(bsdf, "Roughness", 0.72)
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    tc = nt.nodes.new("ShaderNodeTexCoord")
    tc.location = (-700, 0)
    wave = nt.nodes.new("ShaderNodeTexWave")
    wave.location = (-450, 0)
    wave.wave_type = "BANDS"
    wave.bands_direction = "Z"
    set_socket(wave, "Scale", 4.0)
    set_socket(wave, "Distortion", 8.0)
    set_socket(wave, "Detail", 4.0)
    nt.links.new(tc.outputs["Object"], wave.inputs["Vector"])
    ramp = add_ramp(
        nt,
        [(0.12, (0.035, 0.02, 0.011)), (0.7, (0.12, 0.068, 0.035))],
        (-250, 0),
    )
    nt.links.new(wave.outputs["Fac"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
    add_noise_bump(nt, bsdf, scale=9.0, strength=0.18, distance=0.04, detail=7.0)
    MATS["wood"] = mat

    mat, nt, bsdf = new_principled("Hunza_Warm_Wood", (0.18, 0.10, 0.05), 0.7)
    add_noise_bump(nt, bsdf, scale=4.0, strength=0.18, distance=0.05, detail=8.0)
    MATS["wood_light"] = mat

    # whitewash / plaster ----------------------------------------------------
    mat, nt, bsdf = new_principled("Hunza_Whitewash", (0.68, 0.63, 0.54), 0.86)
    add_noise_bump(nt, bsdf, scale=3.5, strength=0.16, distance=0.05, detail=8.0)
    MATS["white"] = mat

    # water ------------------------------------------------------------------
    mat, nt, out = new_material("Hunza_Turquoise_Water")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.location = (300, 0)
    set_socket(bsdf, "Base Color", (0.02, 0.38, 0.40, 1.0))
    set_socket(bsdf, "Roughness", 0.055)
    set_socket(bsdf, "IOR", 1.333)
    set_socket(bsdf, "Transmission Weight", 0.4)
    set_socket(bsdf, "Specular IOR Level", 0.6)
    set_socket(bsdf, "Coat Weight", 0.35)
    set_socket(bsdf, "Coat Roughness", 0.04)
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    add_noise_bump(nt, bsdf, scale=1.4, strength=0.22, distance=0.15, detail=7.0)
    MATS["water"] = mat

    mat, nt, bsdf = new_principled("Hunza_Riverbed", (0.28, 0.27, 0.23), 0.85)
    add_noise_bump(nt, bsdf, scale=2.0, strength=0.4, distance=0.2, detail=9.0)
    MATS["riverbed"] = mat

    mat, nt, bsdf = new_principled("Whitewater_Foam", (0.82, 0.86, 0.86), 0.55)
    MATS["foam"] = mat

    # ice --------------------------------------------------------------------
    mat, nt, bsdf = new_principled("Glacier_Ice", (0.62, 0.79, 0.88), 0.3)
    set_socket(bsdf, "Transmission Weight", 0.12)
    set_socket(bsdf, "Subsurface Weight", 0.08)
    add_noise_bump(nt, bsdf, scale=0.25, strength=0.35, distance=0.5, detail=8.0)
    MATS["ice"] = mat

    # crops and vegetation ---------------------------------------------------
    mat, nt, bsdf = new_principled("Crop_Green", (0.055, 0.135, 0.025), 0.88)
    add_noise_bump(nt, bsdf, scale=3.0, strength=0.25, distance=0.05, detail=8.0)
    MATS["crop"] = mat

    mat, nt, bsdf = new_principled("Crop_Rows", (0.035, 0.095, 0.017), 0.9)
    MATS["crop_row"] = mat

    mat, nt, bsdf = new_principled("Pine_Needles", (0.016, 0.06, 0.024), 0.9)
    add_noise_bump(nt, bsdf, scale=6.0, strength=0.3, distance=0.04, detail=8.0)
    MATS["pine"] = mat

    mat, nt, bsdf = new_principled("Poplar_Leaves", (0.045, 0.115, 0.028), 0.87)
    add_noise_bump(nt, bsdf, scale=5.0, strength=0.2, distance=0.05, detail=8.0)
    MATS["poplar"] = mat

    mat, nt, bsdf = new_principled("Apricot_Leaves", (0.09, 0.17, 0.035), 0.85)
    add_noise_bump(nt, bsdf, scale=5.0, strength=0.2, distance=0.05, detail=8.0)
    MATS["apricot"] = mat

    mat, nt, bsdf = new_principled("Tree_Trunk", (0.055, 0.033, 0.018), 0.92)
    MATS["trunk"] = mat

    mat, nt, bsdf = new_principled("Grass_Tuft", (0.07, 0.15, 0.03), 0.86)
    MATS["grass"] = mat

    mat, nt, bsdf = new_principled("Hunza_Gold", (0.9, 0.56, 0.14), 0.25, 0.9)
    MATS["gold"] = mat

    mat, nt, bsdf = new_principled("Window_Dark", (0.008, 0.009, 0.011), 0.4)
    MATS["glass"] = mat

    mat, nt, bsdf = new_principled("Rope", (0.06, 0.045, 0.03), 0.9)
    MATS["rope"] = mat

    for name, color in (
        ("Flag_Blue", (0.015, 0.16, 0.55)),
        ("Flag_White", (0.82, 0.82, 0.78)),
        ("Flag_Red", (0.62, 0.025, 0.018)),
        ("Flag_Green", (0.015, 0.33, 0.07)),
        ("Flag_Yellow", (0.85, 0.52, 0.015)),
    ):
        mat, nt, out = new_material(name)
        bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
        bsdf.location = (300, 100)
        set_socket(bsdf, "Base Color", _rgba(color))
        set_socket(bsdf, "Roughness", 0.78)
        trans = nt.nodes.new("ShaderNodeBsdfTranslucent")
        trans.location = (300, -150)
        set_socket(trans, "Color", _rgba(color))
        mix = nt.nodes.new("ShaderNodeMixShader")
        mix.location = (550, 0)
        mix.inputs[0].default_value = 0.28
        nt.links.new(bsdf.outputs["BSDF"], mix.inputs[1])
        nt.links.new(trans.outputs["BSDF"], mix.inputs[2])
        nt.links.new(mix.outputs[0], out.inputs["Surface"])
        MATS[name] = mat

    # atmosphere -------------------------------------------------------------
    mat, nt, out = new_material("Hunza_Haze")
    vol = nt.nodes.new("ShaderNodeVolumePrincipled")
    vol.location = (300, 0)
    set_socket(vol, "Color", (0.66, 0.78, 0.94, 1.0))
    set_socket(vol, "Density", 0.00009)
    set_socket(vol, "Anisotropy", 0.5)
    nt.links.new(vol.outputs["Volume"], out.inputs["Volume"])
    MATS["haze"] = mat

    mat, nt, out = new_material("Valley_Mist")
    vol = nt.nodes.new("ShaderNodeVolumePrincipled")
    vol.location = (300, 0)
    set_socket(vol, "Color", (0.82, 0.88, 0.96, 1.0))
    set_socket(vol, "Density", 0.00010)
    set_socket(vol, "Anisotropy", 0.35)
    nt.links.new(vol.outputs["Volume"], out.inputs["Volume"])
    MATS["mist"] = mat


# =============================================================================
# MESH HELPERS
# =============================================================================


def finish_bmesh(bm, name, collection, materials, smooth=False, location=(0, 0, 0), parent=None):
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    mesh.validate()
    mesh.update()
    if materials is not None:
        if not isinstance(materials, (list, tuple)):
            materials = [materials]
        for mat in materials:
            mesh.materials.append(mat)
    for poly in mesh.polygons:
        poly.use_smooth = smooth
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    obj.location = Vector(location)
    if parent is not None:
        obj.parent = parent
    return obj


def add_box(
    name,
    location,
    size,
    material,
    collection,
    rotation=(0.0, 0.0, 0.0),
    bevel=0.0,
    smooth=False,
    parent=None,
):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector((size[0], size[1], size[2])), verts=list(bm.verts))
    if bevel > 0.0:
        safe = min(bevel, 0.45 * max(min(size), 1e-5))
        try:
            bmesh.ops.bevel(
                bm, geom=list(bm.edges), offset=safe, segments=2, affect="EDGES"
            )
        except Exception:
            pass
    obj = finish_bmesh(
        bm, name, collection, material, smooth=smooth, location=location, parent=parent
    )
    obj.rotation_euler = rotation
    return obj


def add_cylinder(
    name,
    location,
    radius,
    depth,
    material,
    collection,
    segments=16,
    rotation=(0.0, 0.0, 0.0),
    smooth=True,
    parent=None,
    radius_top=None,
):
    bm = bmesh.new()
    r2 = radius if radius_top is None else radius_top
    bmesh.ops.create_cone(
        bm,
        cap_ends=True,
        cap_tris=False,
        segments=segments,
        radius1=radius,
        radius2=r2,
        depth=depth,
    )
    obj = finish_bmesh(
        bm, name, collection, material, smooth=smooth, location=location, parent=parent
    )
    obj.rotation_euler = rotation
    return obj


def add_cone(
    name,
    location,
    radius1,
    radius2,
    depth,
    material,
    collection,
    segments=12,
    rotation=(0.0, 0.0, 0.0),
    smooth=True,
    parent=None,
):
    return add_cylinder(
        name,
        location,
        radius1,
        depth,
        material,
        collection,
        segments=segments,
        rotation=rotation,
        smooth=smooth,
        parent=parent,
        radius_top=radius2,
    )


def _icosphere(bm, subdivisions, radius):
    try:
        bmesh.ops.create_icosphere(bm, subdivisions=subdivisions, radius=radius)
    except TypeError:
        bmesh.ops.create_icosphere(bm, subdivisions=subdivisions, diameter=radius * 2.0)


def add_icosphere(
    name,
    location,
    radius,
    material,
    collection,
    scale=(1.0, 1.0, 1.0),
    subdivisions=2,
    smooth=True,
    parent=None,
):
    bm = bmesh.new()
    _icosphere(bm, subdivisions, radius)
    bmesh.ops.scale(bm, vec=Vector(scale), verts=list(bm.verts))
    return finish_bmesh(
        bm, name, collection, material, smooth=smooth, location=location, parent=parent
    )


def add_beam_between(
    name,
    start,
    end,
    thickness,
    material,
    collection,
    parent=None,
    smooth=False,
    size_y=None,
):
    start = Vector(start)
    end = Vector(end)
    direction = end - start
    length = direction.length
    if length <= 1e-5:
        return None
    obj = add_box(
        name,
        (start + end) * 0.5,
        (thickness, size_y if size_y is not None else thickness, length),
        material,
        collection,
        parent=parent,
        smooth=smooth,
    )
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = direction.to_track_quat("Z", "Y")
    return obj


def add_mesh_object(name, verts, faces, material, collection, smooth=False, parent=None):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.validate()
    mesh.update()
    if material is not None:
        if not isinstance(material, (list, tuple)):
            material = [material]
        for mat in material:
            mesh.materials.append(mat)
    for poly in mesh.polygons:
        poly.use_smooth = smooth
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    if parent is not None:
        obj.parent = parent
    return obj


def mesh_normal_z(mesh):
    try:
        return [v.vector.z for v in mesh.vertex_normals]
    except Exception:
        try:
            return [v.normal.z for v in mesh.vertices]
        except Exception:
            return [1.0] * len(mesh.vertices)


def add_color_attribute(mesh, name, values, alpha=1.0):
    attribute = mesh.color_attributes.new(name=name, type="FLOAT_COLOR", domain="POINT")
    for i, value in enumerate(values):
        if hasattr(value, "__len__"):
            attribute.data[i].color = _rgba(value)
        else:
            attribute.data[i].color = (value, value, value, alpha)


# =============================================================================
# TERRAIN
# =============================================================================


def river_x(y):
    return (
        60.0 * math.sin(y * 0.0040)
        + 20.0 * math.sin(y * 0.011 + 1.4)
        + 6.0 * math.sin(y * 0.033)
    )


def terrain_height(x, y):
    p = Vector((x, y, 0.0))
    cx = river_x(y)
    d = abs(x - cx)
    floor = 4.0 + 2.0 * fbm(p * 0.009 + Vector((1.3, 4.1, 0.0)), 5)
    floor += 0.8 * fbm(p * 0.055 + Vector((8.0, 2.0, 0.0)), 3)
    rise = (
        0.38
        * min(max(0.0, d - 58.0), 300.0)
        * smoothstep(55.0, 130.0, d)
        * (0.78 + 0.22 * fbm(p * 0.004 + Vector((4.0, 9.0, 0.0)), 4))
    )
    hills = 9.0 * smoothstep(180.0, 700.0, d) * (0.5 + 0.5 * ridged(p * 0.006, 4))
    gullies = 4.5 * smoothstep(70.0, 190.0, d) * (ridged(p * 0.024 + Vector((3.0, 7.0, 0.0)), 4) - 0.35)
    gullies += 9.0 * smoothstep(300.0, 900.0, d) * (ridged(p * 0.008 + Vector((9.0, 2.0, 0.0)), 5) - 0.4)
    h = floor + rise + hills + gullies

    # local hillocks for the two forts
    for hx, hy, amp, radius in ((165.0, 118.0, 52.0, 95.0), (-140.0, 40.0, 45.0, 82.0)):
        h += amp * math.exp(-(((x - hx) ** 2 + (y - hy) ** 2) / (2.0 * radius * radius)))

    # elevated valley head with the glacier
    h += 38.0 * smoothstep(820.0, 1250.0, y) * (
        0.3 + 0.7 * smoothstep(35.0, 150.0, d)
    )

    # carve the river channel
    channel = 1.0 - smoothstep(12.0, 32.0, d)
    bed = -2.6 + 0.35 * fbm(p * 0.08 + Vector((3.0, 1.0, 0.0)), 3)
    h = lerp(h, bed, channel * 0.96)
    return h


def terrain_color(x, y, z, normal_z):
    p = Vector((x, y, z))
    n = fbm(p * 0.045 + Vector((1.0, 2.0, 3.0)), 4) * 0.5 + 0.5
    n2 = fbm(p * 0.19 + Vector((4.0, 1.0, 2.0)), 3) * 0.5 + 0.5
    grass_a = (0.030, 0.055, 0.014)
    grass_b = (0.085, 0.135, 0.038)
    grass = mix3(grass_a, grass_b, n)
    rock = (0.18, 0.16, 0.13)
    dirt = (0.20, 0.15, 0.09)
    if z < 0.5:
        # river bed
        return mix3((0.19, 0.18, 0.15), (0.33, 0.31, 0.26), n2)
    slope = smoothstep(0.62, 0.94, normal_z)
    color = mix3(rock, grass, slope)
    color = mix3(color, dirt, 0.35 * n2 * (1.0 - slope))
    dry = smoothstep(0.55, 0.85, n2) * smoothstep(0.3, 0.75, 1.0 - slope)
    color = mix3(color, (0.17, 0.15, 0.08), dry * 0.4)
    scree = smoothstep(0.35, 0.72, n2) * smoothstep(0.55, 0.9, 1.0 - normal_z)
    color = mix3(color, (0.16, 0.15, 0.13), scree * 0.65)
    return color


def build_terrain():
    size = 2400.0
    segments = 190
    verts = []
    for j in range(segments + 1):
        y = (j / segments - 0.5) * size + 250.0
        for i in range(segments + 1):
            x = (i / segments - 0.5) * size
            verts.append((x, y, terrain_height(x, y)))
    faces = []
    for j in range(segments):
        for i in range(segments):
            a = j * (segments + 1) + i
            faces.append((a, a + 1, a + segments + 2, a + segments + 1))
    obj = add_mesh_object(
        "Hunza_Valley_Terrain",
        verts,
        faces,
        MATS["terrain"],
        COL["Hunza_Terrain"],
        smooth=True,
    )
    mesh = obj.data
    nz = mesh_normal_z(mesh)
    colors = []
    for i, v in enumerate(mesh.vertices):
        colors.append(terrain_color(v.co.x, v.co.y, v.co.z, nz[i]))
    add_color_attribute(mesh, "GroundColor", colors)

    build_river()
    build_riverbed()
    build_terraces()
    build_paths()
    build_bridge()


# --- river -------------------------------------------------------------------


def build_river():
    rows = 240
    cols = 8
    y_start, y_end = -520.0, 1280.0
    verts = []
    for r in range(rows + 1):
        t = r / rows
        y = lerp(y_start, y_end, t)
        cx = river_x(y)
        half = 21.0 + 5.0 * math.sin(y * 0.017 + 1.0) + 2.5 * math.sin(y * 0.051)
        for c in range(cols + 1):
            u = c / cols * 2.0 - 1.0
            x = cx + u * half
            z = 0.55 + 0.12 * math.sin(y * 0.11 + u * 4.0) + 0.05 * fbm(
                Vector((x * 0.05, y * 0.05, 7.0)), 3
            )
            verts.append((x, y, z))
    faces = []
    for r in range(rows):
        for c in range(cols):
            a = r * (cols + 1) + c
            faces.append((a, a + 1, a + cols + 2, a + cols + 1))
    add_mesh_object(
        "Hunza_River",
        verts,
        faces,
        MATS["water"],
        COL["Hunza_River"],
        smooth=True,
    )


def build_riverbed():
    rows = 130
    cols = 4
    y_start, y_end = -500.0, 1260.0
    verts = []
    for r in range(rows + 1):
        t = r / rows
        y = lerp(y_start, y_end, t)
        cx = river_x(y)
        half = 26.0 + 5.0 * math.sin(y * 0.017 + 1.0)
        for c in range(cols + 1):
            u = c / cols * 2.0 - 1.0
            x = cx + u * half
            verts.append((x, y, -2.0 + 0.2 * fbm(Vector((x * 0.04, y * 0.04, 2.0)), 3)))
    faces = []
    for r in range(rows):
        for c in range(cols):
            a = r * (cols + 1) + c
            faces.append((a, a + 1, a + cols + 2, a + cols + 1))
    add_mesh_object(
        "Hunza_Riverbed",
        verts,
        faces,
        MATS["riverbed"],
        COL["Hunza_River"],
        smooth=True,
    )


# --- terraces ----------------------------------------------------------------


def build_terrace_strip(name, x_center, y_center, width, length, z_edge):
    col = COL["Hunza_Terrain"]
    top = z_edge
    add_box(
        name + "_Field",
        (x_center, y_center, top - 0.35),
        (width, length, 0.7),
        MATS["crop"],
        col,
        bevel=0.03,
    )
    # earth retaining wall on the downhill (river) side
    add_box(
        name + "_Wall",
        (x_center - width * 0.5 - 0.25, y_center, top - 1.15),
        (0.8, length, 2.1),
        MATS["stone_wall"],
        col,
        bevel=0.03,
    )
    add_box(
        name + "_WallCap",
        (x_center - width * 0.5 - 0.25, y_center, top + 0.03),
        (1.0, length, 0.16),
        MATS["stone"],
        col,
    )
    # crop rows
    for i in range(4):
        rx = x_center - width * 0.5 + width * (i + 0.5) / 4.0
        add_box(
            f"{name}_Row_{i}",
            (rx, y_center, top + 0.05),
            (width / 8.0, length * 0.95, 0.1),
            MATS["crop_row"],
            col,
        )
    # irrigation channel
    add_box(
        name + "_Channel",
        (x_center + width * 0.5 - 0.5, y_center, top + 0.03),
        (0.45, length * 0.95, 0.1),
        MATS["water"],
        col,
    )


def build_terraces():
    # Fields on the east bank below the village, stepped up the hillside.
    for i in range(7):
        x = 54.0 + i * 12.0
        y = -55.0 + i * 5.0
        z = terrain_height(x - 6.0, y) + 1.05
        build_terrace_strip(f"Terrace_East_{i}", x, y, 12.0, 58.0, z)

    # Small contour fields near Altit.
    for i in range(4):
        x = -205.0 + i * 11.5
        y = 8.0 + i * 9.0
        z = terrain_height(x - 5.5, y) + 0.95
        build_terrace_strip(f"Terrace_Altit_{i}", x, y, 11.0, 46.0, z)

# --- paths -------------------------------------------------------------------


def chaikin(points, iterations=2):
    pts = [Vector((p[0], p[1])) for p in points]
    for _ in range(iterations):
        refined = [pts[0]]
        for i in range(len(pts) - 1):
            p0, p1 = pts[i], pts[i + 1]
            refined.append(p0 * 0.75 + p1 * 0.25)
            refined.append(p0 * 0.25 + p1 * 0.75)
        refined.append(pts[-1])
        pts = refined
    return pts


def build_path_ribbon(name, control_points, width):
    pts = chaikin(control_points, 2)
    left = []
    right = []
    for i, p in enumerate(pts):
        prev = pts[max(0, i - 1)]
        nxt = pts[min(len(pts) - 1, i + 1)]
        tangent = nxt - prev
        if tangent.length < 1e-5:
            tangent = Vector((0.0, 1.0))
        tangent.normalize()
        normal = Vector((-tangent.y, tangent.x))
        x = p.x
        y = p.y
        z = terrain_height(x, y) + 0.12
        half = width * 0.5
        left.append((x + normal.x * half, y + normal.y * half, z))
        right.append((x - normal.x * half, y - normal.y * half, z))
    verts = left + right
    faces = []
    n = len(pts)
    for i in range(n - 1):
        a = i
        b = i + 1
        c = n + i + 1
        d = n + i
        faces.append((a, d, c, b))
    add_mesh_object(
        name, verts, faces, MATS["path"], COL["Hunza_Terrain"], smooth=True
    )


def build_paths():
    build_path_ribbon(
        "Path_Bridge_To_Baltit",
        (
            (-2.0, -60.0),
            (18.0, -45.0),
            (42.0, -22.0),
            (65.0, 4.0),
            (92.0, 30.0),
            (120.0, 58.0),
            (148.0, 88.0),
            (165.0, 112.0),
        ),
        width=3.1,
    )
    build_path_ribbon(
        "Path_River_To_Altit",
        (
            (-6.0, -62.0),
            (-30.0, -45.0),
            (-58.0, -25.0),
            (-88.0, -5.0),
            (-116.0, 18.0),
            (-138.0, 36.0),
        ),
        width=3.4,
    )
    build_path_ribbon(
        "Path_Village_Lane",
        (
            (52.0, -28.0),
            (72.0, -10.0),
            (86.0, 16.0),
            (104.0, 42.0),
            (132.0, 66.0),
            (160.0, 92.0),
        ),
        width=2.2,
    )


# --- bridge ------------------------------------------------------------------


def build_bridge():
    y = -60.0
    cx = river_x(y)
    deck_z = 5.2
    col = COL["Hunza_Terrain"]
    for side in (-1, 1):
        px = cx + side * 15.0
        add_box(
            f"Bridge_Pier_{side}",
            (px, y, deck_z * 0.5 - 1.0),
            (2.6, 4.2, deck_z + 2.0),
            MATS["stone_wall"],
            col,
            bevel=0.04,
        )
    add_box(
        "Bridge_Deck",
        (cx, y, deck_z),
        (34.0, 4.2, 0.38),
        MATS["wood_light"],
        col,
        bevel=0.02,
    )
    # planks
    for i in range(16):
        x = cx - 16.0 + i * 2.1
        add_box(
            f"Bridge_Plank_{i}",
            (x, y, deck_z + 0.26),
            (1.85, 4.0, 0.12),
            MATS["wood"],
            col,
        )
    for side in (-1, 1):
        sy = y + side * 1.9
        for i in range(5):
            x = cx - 14.0 + i * 7.0
            add_box(
                f"Bridge_Post_{side}_{i}",
                (x, sy, deck_z + 1.2),
                (0.16, 0.16, 2.2),
                MATS["wood"],
                col,
            )
        add_box(
            f"Bridge_Rail_{side}",
            (cx, sy, deck_z + 2.15),
            (32.0, 0.12, 0.12),
            MATS["wood_light"],
            col,
        )
    # suspension cables
    for side in (-1, 1):
        sy = y + side * 1.9
        curve = bpy.data.curves.new(f"Bridge_Cable_{side}", "CURVE")
        curve.dimensions = "3D"
        curve.bevel_depth = 0.035
        spline = curve.splines.new("POLY")
        n = 20
        spline.points.add(n - 1)
        for i in range(n):
            t = i / (n - 1)
            x = cx + lerp(-16.0, 16.0, t)
            z = deck_z + 2.2 + 2.2 * math.sin(t * math.pi) * 0.12 + 1.4 * math.sin(
                t * math.pi
            )
            spline.points[i].co = (x, sy, z, 1.0)
        obj = bpy.data.objects.new(f"Bridge_Cable_{side}", curve)
        col.objects.link(obj)
        curve.materials.append(MATS["rope"])


# =============================================================================
# MOUNTAINS AND GLACIER
# =============================================================================


def mountain_height_fn(seed, peaks):
    offset = Vector((seed * 3.71, seed * 1.93, seed * 0.77))

    def height(u, v):
        r = math.hypot(u, v)
        if r >= 1.0:
            return 0.0
        env = 1.0 - smoothstep(0.62, 1.0, r)
        ridge = ridged(Vector((u * 2.45, v * 2.45, 0.0)) + offset, 6)
        ridge2 = ridged(Vector((u * 5.9, v * 5.9, 0.0)) + offset * 0.6, 5)
        peak = 0.0
        for px, py, ph, pr in peaks:
            d = math.hypot(u - px, v - py)
            k = max(0.0, 1.0 - d / pr)
            peak = max(peak, ph * (k ** 1.15))
        spine = ridged(Vector((u * 4.6, v * 4.6, 0.0)) + offset * 1.7, 5)
        peak *= 0.55 + 0.55 * spine
        h = env * (peak * (0.46 + 0.62 * ridge) + 0.36 * ridge2 * (1.0 - r))
        return max(0.0, h)

    return height


def build_mountain(name, center, radius, height, peaks, snowline, seed):
    rings, segments = 64, 112
    height_fn = mountain_height_fn(seed, peaks)
    base_z = -25.0
    verts = []
    verts.append((center[0], center[1], base_z + height * height_fn(0.0, 0.0)))
    ring_starts = []
    for i in range(1, rings + 1):
        r = i / rings
        ring_starts.append(len(verts))
        for s in range(segments):
            theta = TAU * s / segments
            u = r * math.cos(theta)
            v = r * math.sin(theta)
            h = height_fn(u, v)
            verts.append(
                (
                    center[0] + u * radius,
                    center[1] + v * radius,
                    base_z + h * height,
                )
            )
    faces = []
    first = ring_starts[0]
    for s in range(segments):
        faces.append((0, first + s, first + (s + 1) % segments))
    for k in range(rings - 1):
        a0 = ring_starts[k]
        b0 = ring_starts[k + 1]
        for s in range(segments):
            s2 = (s + 1) % segments
            faces.append((a0 + s, b0 + s, b0 + s2, a0 + s2))

    obj = add_mesh_object(
        name, verts, faces, MATS["mountain"], COL["Karakoram_Mountains"], smooth=True
    )
    mesh = obj.data
    nz = mesh_normal_z(mesh)
    max_h = max(v.co.z for v in mesh.vertices) - base_z
    snow = []
    for i, v in enumerate(mesh.vertices):
        rel = (v.co.z - base_z) / max(max_h, 1.0)
        patch = 0.5 + 0.5 * fbm(Vector((v.co.x * 0.006, v.co.y * 0.006, 8.1)), 3)
        alt = smoothstep(snowline, snowline + 0.16, rel + (patch - 0.5) * 0.20)
        flatness = smoothstep(0.42, 0.86, nz[i])
        value = clamp(alt * (0.03 + 0.97 * flatness)) * 0.90
        snow.append((value, value, value))
    add_color_attribute(mesh, "SnowMask", snow)
    return obj


def build_mountains():
    massifs = (
        dict(
            name="Rakaposhi",
            center=(1200.0, 1700.0),
            radius=620.0,
            height=700.0,
            snowline=0.63,
            seed=101,
            peaks=(
                (0.0, 0.0, 1.0, 0.42),
                (-0.24, -0.14, 0.82, 0.16),
                (0.22, -0.06, 0.78, 0.14),
                (-0.35, -0.22, 0.62, 0.32),
                (0.34, -0.16, 0.58, 0.30),
                (0.04, 0.34, 0.50, 0.32),
            ),
        ),
        dict(
            name="Ultar_Sar",
            center=(300.0, 1380.0),
            radius=470.0,
            height=520.0,
            snowline=0.68,
            seed=113,
            peaks=((0.0, 0.05, 1.0, 0.38), (-0.22, -0.12, 0.8, 0.14), (-0.3, -0.2, 0.58, 0.28)),
        ),
        dict(
            name="Lady_Finger",
            center=(2050.0, 2000.0),
            radius=360.0,
            height=660.0,
            snowline=0.61,
            seed=127,
            peaks=((0.0, 0.0, 1.0, 0.28), (0.08, -0.05, 0.85, 0.12)),
        ),
        dict(
            name="Peak_Far_Left",
            center=(-700.0, 1750.0),
            radius=620.0,
            height=560.0,
            snowline=0.66,
            seed=139,
            peaks=((0.05, 0.0, 1.0, 0.58),),
        ),
        dict(
            name="Peak_Sky",
            center=(250.0, 3400.0),
            radius=900.0,
            height=620.0,
            snowline=0.70,
            seed=151,
            peaks=((0.0, 0.0, 1.0, 0.66), (-0.25, -0.12, 0.55, 0.35)),
        ),
        dict(
            name="Foothill_West",
            center=(-430.0, 720.0),
            radius=240.0,
            height=180.0,
            snowline=0.68,
            seed=163,
            peaks=((0.0, 0.0, 1.0, 0.62),),
        ),
        dict(
            name="Foothill_East",
            center=(610.0, 950.0),
            radius=280.0,
            height=230.0,
            snowline=0.62,
            seed=179,
            peaks=((0.0, 0.0, 1.0, 0.62),),
        ),
    )
    for item in massifs:
        build_mountain(
            item["name"],
            item["center"],
            item["radius"],
            item["height"],
            item["peaks"],
            item["snowline"],
            item["seed"],
        )
    build_glacier()


def build_glacier():
    # A glacier tongue descending the upper east slope toward the valley head.
    rows = 36
    cols = 6
    verts = []
    for r in range(rows + 1):
        t = r / rows
        y = lerp(860.0, 1180.0, t)
        cx = lerp(100.0, 36.0, t) + 18.0 * math.sin(t * 5.0)
        width = lerp(58.0, 22.0, t)
        for c in range(cols + 1):
            u = c / cols * 2.0 - 1.0
            x = cx + u * width
            z = terrain_height(x, y) + 1.8
            verts.append((x, y, z))
    faces = []
    for r in range(rows):
        for c in range(cols):
            a = r * (cols + 1) + c
            faces.append((a, a + 1, a + cols + 2, a + cols + 1))
    add_mesh_object(
        "Glacier_Tongue",
        verts,
        faces,
        MATS["ice"],
        COL["Karakoram_Mountains"],
        smooth=True,
    )
    # seracs
    for i in range(12):
        t = (i + 0.5) / 12.0
        y = lerp(880.0, 1160.0, t)
        x = lerp(100.0, 36.0, t) + 18.0 * math.sin(t * 5.0) + rng.uniform(-18, 18)
        z = terrain_height(x, y) + 2.0
        add_icosphere(
            f"Serac_{i}",
            (x, y, z + 1.0),
            rng.uniform(2.0, 5.0),
            MATS["ice"],
            COL["Karakoram_Mountains"],
            scale=(1.2, 1.4, 1.6),
            subdivisions=1,
            smooth=False,
        )


# =============================================================================
# ARCHITECTURE HELPERS
# =============================================================================


def local_point(base, rot, offset):
    ca, sa = math.cos(rot), math.sin(rot)
    return Vector(
        (
            base[0] + offset[0] * ca - offset[1] * sa,
            base[1] + offset[0] * sa + offset[1] * ca,
            base[2] + offset[2],
        )
    )


def local_box(col, name, base, rot, offset, size, mat, bevel=0.0):
    return add_box(
        name,
        local_point(base, rot, offset),
        size,
        mat,
        col,
        rotation=(0.0, 0.0, rot),
        bevel=bevel,
    )


def add_window_panel(col, base, rot, offset, width, height, frame_mat):
    local_box(
        col,
        "Window_Glass",
        base,
        rot,
        (offset[0], offset[1] - 0.03, offset[2]),
        (width, 0.08, height),
        MATS["glass"],
    )
    for dx, dz, sx, sz in (
        (0.0, height * 0.5, width + 0.22, 0.14),
        (0.0, -height * 0.5, width + 0.22, 0.14),
        (-width * 0.5, 0.0, 0.14, height),
        (width * 0.5, 0.0, 0.14, height),
    ):
        local_box(
            col,
            "Window_Frame",
            base,
            rot,
            (offset[0] + dx, offset[1], offset[2] + dz),
            (sx, 0.16, sz),
            frame_mat,
        )
    local_box(
        col,
        "Window_Sill",
        base,
        rot,
        (offset[0], offset[1] - 0.12, offset[2] - height * 0.5 - 0.08),
        (width + 0.36, 0.34, 0.12),
        MATS["stone"],
    )


def add_merlons(col, base, rot, offset, width, depth, z, mat, name="Merlon"):
    step = 1.8
    count_x = max(2, int(width / step))
    count_y = max(2, int(depth / step))
    for i in range(count_x):
        x = -width * 0.5 + width * (i + 0.5) / count_x
        for y in (-depth * 0.5, depth * 0.5):
            local_box(
                col,
                f"{name}_X_{i}",
                base,
                rot,
                (offset[0] + x, offset[1] + y, offset[2] + z),
                (1.18, 0.52, 0.95),
                mat,
            )
    for i in range(count_y):
        y = -depth * 0.5 + depth * (i + 0.5) / count_y
        for x in (-width * 0.5, width * 0.5):
            local_box(
                col,
                f"{name}_Y_{i}",
                base,
                rot,
                (offset[0] + x, offset[1] + y, offset[2] + z),
                (0.52, 1.18, 0.95),
                mat,
            )


def add_roof_parapet(col, base, rot, offset, width, depth, z, mat):
    local_box(
        col, "Parapet_F", base, rot, (offset[0], offset[1] - depth * 0.5, offset[2] + z), (width, 0.35, 0.55), mat
    )
    local_box(
        col, "Parapet_B", base, rot, (offset[0], offset[1] + depth * 0.5, offset[2] + z), (width, 0.35, 0.55), mat
    )
    local_box(
        col, "Parapet_L", base, rot, (offset[0] - width * 0.5, offset[1], offset[2] + z), (0.35, depth, 0.55), mat
    )
    local_box(
        col, "Parapet_R", base, rot, (offset[0] + width * 0.5, offset[1], offset[2] + z), (0.35, depth, 0.55), mat
    )


def add_roof_beams(col, base, rot, offset, width, depth, z, count=7):
    for i in range(count):
        x = -width * 0.5 + width * (i + 0.5) / count
        for y in (-depth * 0.5 - 0.22, depth * 0.5 + 0.22):
            add_cylinder(
                "Roof_Beam",
                local_point(base, rot, (offset[0] + x, offset[1] + y, offset[2] + z)),
                0.11,
                1.05,
                MATS["wood"],
                col,
                segments=7,
                rotation=(math.pi * 0.5, 0.0, rot),
                smooth=True,
            )


def add_wood_balcony(col, base, rot, offset, width, depth, z, front=-1.0):
    floor_off = (offset[0], offset[1] + front * depth * 0.5, offset[2] + z)
    local_box(
        col, "Balcony_Floor", base, rot, floor_off, (width, depth, 0.18), MATS["wood_light"]
    )
    local_box(
        col,
        "Balcony_Fascia",
        base,
        rot,
        (floor_off[0], floor_off[1] + front * depth * 0.5, floor_off[2] - 0.2),
        (width, 0.15, 0.32),
        MATS["wood"],
    )
    posts = 6
    for i in range(posts):
        x = -width * 0.5 + width * i / (posts - 1)
        local_box(
            col,
            "Balcony_Post",
            base,
            rot,
            (offset[0] + x, floor_off[1] + front * depth * 0.45, floor_off[2] + 0.6),
            (0.12, 0.12, 1.2),
            MATS["wood"],
        )
    local_box(
        col,
        "Balcony_Rail",
        base,
        rot,
        (offset[0], floor_off[1] + front * depth * 0.45, floor_off[2] + 1.18),
        (width, 0.14, 0.12),
        MATS["wood_light"],
    )
    local_box(
        col,
        "Balcony_Midrail",
        base,
        rot,
        (offset[0], floor_off[1] + front * depth * 0.45, floor_off[2] + 0.62),
        (width, 0.08, 0.08),
        MATS["wood"],
    )


# =============================================================================
# VILLAGE
# =============================================================================


def build_house(name, x, y, width, depth, height, rot, storeys=1, with_room=False):
    col = COL["Traditional_Village"]
    z = terrain_height(x, y)
    base = (x, y, z)

    # buried foundation / terrace
    local_box(
        col,
        f"{name}_Foundation",
        base,
        rot,
        (0.0, 0.0, -2.2),
        (width + 1.4, depth + 1.4, 5.4),
        MATS["stone_wall"],
        bevel=0.05,
    )
    local_box(
        col,
        f"{name}_Plinth",
        base,
        rot,
        (0.0, 0.0, 0.3),
        (width + 0.8, depth + 0.8, 0.6),
        MATS["stone"],
        bevel=0.03,
    )
    local_box(
        col,
        f"{name}_Walls",
        base,
        rot,
        (0.0, 0.0, 0.6 + height * 0.5),
        (width, depth, height),
        MATS["stone_wall"],
        bevel=0.05,
    )

    roof_z = 0.6 + height
    local_box(
        col,
        f"{name}_PlasterBand",
        base,
        rot,
        (0.0, 0.0, roof_z - 0.45),
        (width + 0.1, depth + 0.1, 0.65),
        MATS["white"],
        bevel=0.02,
    )
    local_box(
        col,
        f"{name}_Roof",
        base,
        rot,
        (0.0, 0.0, roof_z + 0.16),
        (width + 0.9, depth + 0.9, 0.32),
        MATS["wood_light"],
        bevel=0.02,
    )
    add_roof_parapet(
        col, base, rot, (0.0, 0.0, 0.0), width + 0.8, depth + 0.8, roof_z + 0.55, MATS["stone_wall"]
    )
    add_roof_beams(col, base, rot, (0.0, 0.0, 0.0), width + 0.2, depth + 0.2, roof_z + 0.02)

    # small rooftop room
    if with_room:
        local_box(
            col,
            f"{name}_RoofRoom",
            base,
            rot,
            (width * 0.15, depth * 0.1, roof_z + 1.9),
            (width * 0.42, depth * 0.38, 2.5),
            MATS["stone_wall"],
            bevel=0.03,
        )
        local_box(
            col,
            f"{name}_RoofRoomTop",
            base,
            rot,
            (width * 0.15, depth * 0.1, roof_z + 3.22),
            (width * 0.5, depth * 0.46, 0.25),
            MATS["wood"],
        )

    # door + windows on the valley-facing side (local -Y)
    local_box(
        col,
        f"{name}_Door",
        base,
        rot,
        (-width * 0.22, -depth * 0.5 - 0.05, 1.6),
        (1.15, 0.12, 2.1),
        MATS["wood"],
    )
    local_box(
        col,
        f"{name}_DoorLintel",
        base,
        rot,
        (-width * 0.22, -depth * 0.5 - 0.03, 2.75),
        (1.6, 0.3, 0.25),
        MATS["wood_light"],
    )
    for i, offset_x in enumerate((-width * 0.0, width * 0.26)):
        window_z = 1.9 if storeys == 1 else 2.0
        add_window_panel(
            col,
            base,
            rot,
            (offset_x, -depth * 0.5 - 0.02, window_z),
            0.85,
            1.0,
            MATS["wood"],
        )

    # balcony at first-floor level
    if storeys > 1:
        add_wood_balcony(
            col,
            base,
            rot,
            (0.0, -depth * 0.5, 0.0),
            width * 0.78,
            1.6,
            height * 0.52,
        )
    else:
        add_wood_balcony(
            col,
            base,
            rot,
            (0.0, -depth * 0.5, 0.0),
            width * 0.55,
            1.2,
            height * 0.45,
        )

    # stone terrace / yard in front
    local_box(
        col,
        f"{name}_Yard",
        base,
        rot,
        (0.0, -depth * 0.5 - 2.0, -0.4),
        (width + 1.0, 3.5, 1.0),
        MATS["path"],
    )


def build_village():
    houses = (
        ("House_01", 78.0, -28.0, 10.0, 8.0, 6.0, -1.30, 1, False),
        ("House_02", 101.0, -8.0, 12.0, 9.0, 7.5, -1.42, 2, True),
        ("House_03", 127.0, 10.0, 9.0, 7.0, 6.0, -1.22, 1, False),
        ("House_04", 84.0, 28.0, 11.0, 8.0, 7.0, -1.52, 2, False),
        ("House_05", 116.0, 46.0, 13.0, 9.0, 8.0, -1.38, 2, True),
        ("House_06", 148.0, 62.0, 10.0, 8.0, 6.5, -1.28, 1, False),
        ("House_07", 72.0, 62.0, 9.0, 7.0, 5.5, -1.46, 1, False),
        ("House_08", 97.0, 84.0, 12.0, 9.0, 8.0, -1.56, 2, True),
        ("House_09", 133.0, 102.0, 10.0, 8.0, 7.0, -1.34, 1, False),
        ("House_10", 68.0, 105.0, 8.0, 7.0, 5.0, -1.20, 1, False),
        ("House_11", 172.0, 32.0, 9.0, 7.0, 6.0, -1.50, 1, True),
        ("House_12", 160.0, -12.0, 8.0, 7.0, 5.5, -1.35, 1, False),
        ("House_13", 42.0, 12.0, 8.5, 7.0, 5.0, -1.55, 1, False),
        ("House_14", 54.0, 82.0, 8.0, 6.5, 5.0, -1.25, 1, False),
    )
    for args in houses:
        build_house(*args)

    # a small stone watchtower by the river
    x, y = 40.0, -55.0
    z = terrain_height(x, y)
    col = COL["Traditional_Village"]
    base = (x, y, z)
    local_box(col, "Watchtower_Base", base, -1.3, (0, 0, 1.5), (6.0, 6.0, 7.0), MATS["stone_wall"], bevel=0.04)
    local_box(col, "Watchtower_Top", base, -1.3, (0, 0, 5.3), (7.0, 7.0, 0.35), MATS["wood"], bevel=0.02)
    add_merlons(col, base, -1.3, (0, 0, 0), 6.4, 6.4, 5.9, MATS["stone_wall"], "Watchtower_Merlon")


# =============================================================================
# FORTS
# =============================================================================


def build_baltit_fort():
    x, y = 165.0, 118.0
    z = terrain_height(x, y)
    col = COL["Baltit_Fort"]
    root = bpy.data.objects.new("Baltit_Root", None)
    root.empty_display_type = "PLAIN_AXES"
    root.empty_display_size = 6.0
    root.location = (x, y, z)
    col.objects.link(root)

    def fbox(name, off, size, mat, bevel=0.0, rot=0.0):
        return add_box(
            name,
            local_point((x, y, z), rot, off),
            size,
            mat,
            col,
            rotation=(0.0, 0.0, rot),
            bevel=bevel,
        )

    # foundation, courtyard, retaining walls
    fbox("Baltit_Foundation", (0.0, 0.0, -4.0), (46.0, 38.0, 14.0), MATS["fort_stone"], 0.08)
    fbox("Baltit_Courtyard", (0.0, 0.0, 1.0), (42.0, 34.0, 1.6), MATS["stone"], 0.04)
    add_box(
        "Baltit_RetainingWall",
        (x, y, z - 1.0),
        (43.0, 35.0, 4.0),
        MATS["fort_stone"],
        col,
        bevel=0.05,
    )

    # exposed rock shoulder under the platform
    add_cylinder(
        "Baltit_RockShoulder",
        (x, y, z - 5.0),
        32.0,
        10.0,
        MATS["rock"],
        col,
        segments=18,
        smooth=False,
        radius_top=29.0,
    )

    # main keep
    fbox("Baltit_Keep", (-2.0, 2.0, 7.0), (24.0, 18.0, 10.0), MATS["fort_stone"], 0.08)
    fbox("Baltit_Keep_Band", (-2.0, 2.0, 10.2), (24.3, 18.3, 0.6), MATS["wood"])
    fbox("Baltit_Keep_Upper", (-1.0, 2.0, 16.6), (17.0, 13.0, 7.0), MATS["white"], 0.06)
    fbox("Baltit_Keep_Roof", (-1.0, 2.0, 20.25), (18.2, 14.2, 0.45), MATS["wood_light"], 0.03)
    add_roof_parapet(
        col,
        (x, y, z),
        0.0,
        (-1.0, 2.0, 20.5),
        17.4,
        13.4,
        0.35,
        MATS["fort_stone"],
    )
    add_roof_beams(
        col, (x, y, z), 0.0, (-1.0, 2.0, 20.45), 17.0, 13.0, 0.0, 7
    )

    # tower
    fbox("Baltit_Tower", (11.0, -7.0, 12.0), (9.0, 9.0, 24.0), MATS["fort_stone"], 0.06)
    fbox("Baltit_Tower_Band", (11.0, -7.0, 18.0), (9.4, 9.4, 0.6), MATS["wood"])
    fbox("Baltit_Tower_Roof", (11.0, -7.0, 24.3), (10.4, 10.4, 0.6), MATS["wood_light"], 0.04)
    add_roof_parapet(
        col,
        (x, y, z),
        0.0,
        (11.0, -7.0, 24.5),
        9.8,
        9.8,
        0.35,
        MATS["fort_stone"],
    )
    add_merlons(
        col, (x, y, z), 0.0, (11.0, -7.0, 24.7), 9.8, 9.8, 0.0, MATS["fort_stone"], "Baltit_Merlon"
    )

    # windows on the keep front
    for zoff in (4.5, 8.4):
        for xoff in (-9.0, -4.0, 1.5, 6.5):
            fbox(
                "Baltit_Window_Frame",
                (xoff, -7.05, zoff),
                (1.05, 0.14, 1.3),
                MATS["wood"],
            )
            fbox("Baltit_Window", (xoff, -7.09, zoff), (0.86, 0.1, 1.08), MATS["glass"])
    for zoff in (13.8, 16.8):
        for xoff in (-6.0, 0.0, 6.0):
            fbox(
                "Baltit_UpperWindow_Frame",
                (xoff, -4.55, zoff),
                (0.95, 0.14, 1.2),
                MATS["wood"],
            )
            fbox("Baltit_UpperWindow", (xoff, -4.59, zoff), (0.78, 0.1, 0.98), MATS["glass"])

    # main door and steps
    fbox("Baltit_DoorFrame", (-5.0, -7.1, 3.2), (2.8, 0.3, 3.9), MATS["stone"])
    fbox("Baltit_Door", (-5.0, -7.3, 2.95), (2.0, 0.16, 3.2), MATS["wood"])
    for i in range(5):
        fbox(
            f"Baltit_Step_{i}",
            (-5.0, -7.8 - i * 0.6, 0.9 - i * 0.38),
            (3.4, 0.65, 0.45),
            MATS["stone"],
        )

    # wooden balconies
    add_wood_balcony(
        col, (x, y, z), 0.0, (-2.0, -7.0, 0.0), 11.0, 2.0, 5.2
    )
    add_wood_balcony(
        col, (x, y, z), 0.0, (-1.0, -4.5, 0.0), 8.0, 1.6, 12.5
    )

    # courtyard perimeter wall and gate
    for sx, sy, w, d in (
        (0.0, -16.0, 41.0, 0.9),
        (0.0, 16.0, 41.0, 0.9),
        (-20.0, 0.0, 0.9, 31.0),
        (20.0, 0.0, 0.9, 31.0),
    ):
        fbox("Baltit_Courtyard_Wall", (sx, sy, 2.2), (w, d, 2.2), MATS["fort_stone"], 0.03)
    fbox("Baltit_Gate", (0.0, -16.2, 3.2), (5.5, 0.5, 4.0), MATS["wood"])
    add_merlons(
        col, (x, y, z), 0.0, (0.0, -16.0, 3.3), 40.0, 0.6, 0.0, MATS["fort_stone"], "Gate_Merlon"
    )

    # surrounding huts
    for i, (hx, hy, hw, hd) in enumerate(
        ((-28.0, -10.0, 7.0, 6.0), (-26.0, 12.0, 6.0, 5.0), (28.0, 4.0, 6.0, 6.0))
    ):
        fbox(
            f"Baltit_Hut_{i}",
            (hx, hy, 2.0),
            (hw, hd, 4.0),
            MATS["fort_stone"],
            0.04,
        )
        fbox(
            f"Baltit_Hut_Roof_{i}",
            (hx, hy, 4.2),
            (hw + 0.7, hd + 0.7, 0.3),
            MATS["wood"],
        )

    # prayer flags from the tower to a pole in the courtyard
    tower_top = local_point((x, y, z), 0.0, (11.0, -7.0, 26.0))
    pole_top = add_flag_pole(
        "Baltit_FlagPole", (x - 18.0, y - 12.0, z), 14.0, COL["Baltit_Fort"]
    )
    add_flag_line(
        "Baltit_Flags",
        tower_top,
        pole_top,
        sag=2.2,
        count=22,
        collection=COL["Baltit_Fort"],
        seed_offset=1,
    )


def build_altit_fort():
    x, y = -140.0, 40.0
    z = terrain_height(x, y)
    col = COL["Altit_Fort"]
    root = bpy.data.objects.new("Altit_Root", None)
    root.empty_display_type = "PLAIN_AXES"
    root.empty_display_size = 5.0
    root.location = (x, y, z)
    col.objects.link(root)

    def abox(name, off, size, mat, bevel=0.0):
        return add_box(
            name,
            local_point((x, y, z), 0.0, off),
            size,
            mat,
            col,
            bevel=bevel,
        )

    abox("Altit_RockBase", (0.0, 0.0, -2.5), (34.0, 28.0, 12.0), MATS["rock"])
    add_cylinder(
        "Altit_RockShoulder",
        (x, y, z - 4.0),
        24.0,
        10.0,
        MATS["rock"],
        col,
        segments=16,
        smooth=False,
        radius_top=21.0,
    )
    abox("Altit_Platform", (0.0, 0.0, 2.4), (30.0, 24.0, 2.4), MATS["fort_stone"], 0.05)
    abox("Altit_Tower", (5.0, 2.0, 12.0), (9.0, 9.0, 20.0), MATS["fort_stone"], 0.06)
    abox("Altit_Tower_Band", (5.0, 2.0, 17.0), (9.4, 9.4, 0.5), MATS["wood"])
    abox("Altit_Tower_Roof", (5.0, 2.0, 22.1), (10.2, 10.2, 0.5), MATS["wood_light"], 0.03)
    add_roof_parapet(
        col, (x, y, z), 0.0, (5.0, 2.0, 22.3), 9.6, 9.6, 0.3, MATS["fort_stone"]
    )
    add_merlons(
        col, (x, y, z), 0.0, (5.0, 2.0, 22.4), 9.6, 9.6, 0.0, MATS["fort_stone"], "Altit_Merlon"
    )

    abox("Altit_Hall", (-8.0, -1.0, 6.0), (14.0, 12.0, 8.0), MATS["fort_stone"], 0.06)
    abox("Altit_Hall_Roof", (-8.0, -1.0, 10.25), (15.0, 13.0, 0.45), MATS["wood_light"], 0.03)
    add_roof_parapet(
        col, (x, y, z), 0.0, (-8.0, -1.0, 10.5), 14.4, 12.4, 0.3, MATS["fort_stone"]
    )
    add_roof_beams(col, (x, y, z), 0.0, (-8.0, -1.0, 10.4), 14.0, 12.0, 0.0, 6)

    # windows and door
    for xoff in (2.0, 8.0):
        for zoff in (8.0, 14.0):
            abox("Altit_Window_Frame", (xoff, -2.55, zoff), (0.95, 0.14, 1.2), MATS["wood"])
            abox("Altit_Window", (xoff, -2.59, zoff), (0.78, 0.1, 0.98), MATS["glass"])
    for xoff in (-12.0, -8.0, -4.0):
        abox("Altit_HallWindow_Frame", (xoff, -7.05, 7.0), (0.9, 0.14, 1.15), MATS["wood"])
        abox("Altit_HallWindow", (xoff, -7.09, 7.0), (0.72, 0.1, 0.92), MATS["glass"])
    abox("Altit_Door", (-8.0, -7.15, 4.0), (1.8, 0.2, 3.2), MATS["wood"])
    for i in range(4):
        abox(
            f"Altit_Step_{i}",
            (-8.0, -8.0 - i * 0.55, 2.5 - i * 0.4),
            (3.0, 0.6, 0.45),
            MATS["stone"],
        )

    add_wood_balcony(col, (x, y, z), 0.0, (-8.0, -7.0, 0.0), 9.0, 1.6, 7.5)
    add_wood_balcony(col, (x, y, z), 0.0, (5.0, -2.5, 0.0), 5.0, 1.2, 12.0)

    # outbuildings and walls
    for i, (bx, by, bw, bd, bh) in enumerate(
        ((-20.0, -9.0, 8.0, 6.0, 4.5), (-19.0, 10.0, 7.0, 6.0, 4.0), (17.0, -8.0, 7.0, 6.0, 4.2))
    ):
        abox(f"Altit_Hut_{i}", (bx, by, bh * 0.5 + 2.6), (bw, bd, bh), MATS["fort_stone"], 0.04)
        abox(
            f"Altit_Hut_Roof_{i}",
            (bx, by, bh + 2.75),
            (bw + 0.7, bd + 0.7, 0.3),
            MATS["wood"],
        )
    for sx, sy, w, d in (
        (0.0, -14.0, 29.0, 0.8),
        (-15.0, 0.0, 0.8, 27.0),
        (15.0, 0.0, 0.8, 27.0),
    ):
        abox("Altit_Wall", (sx, sy, 3.4), (w, d, 1.8), MATS["fort_stone"], 0.03)

    # prayer flags
    tower_top = local_point((x, y, z), 0.0, (5.0, 2.0, 23.8))
    pole_top = add_flag_pole(
        "Altit_FlagPole", (x + 18.0, y - 8.0, z), 11.0, COL["Altit_Fort"]
    )
    add_flag_line(
        "Altit_Flags",
        tower_top,
        pole_top,
        sag=1.6,
        count=18,
        collection=COL["Altit_Fort"],
        seed_offset=3,
    )


# =============================================================================
# PRAYER FLAGS
# =============================================================================


FLAG_MATERIALS = ("Flag_Blue", "Flag_White", "Flag_Red", "Flag_Green", "Flag_Yellow")


def catenary_point(p0, p1, sag, t):
    p = p0.lerp(p1, t)
    p.z -= sag * 4.0 * t * (1.0 - t)
    return p


def add_flag_pole(name, base, height, collection):
    x, y, z = base
    add_cylinder(
        name,
        (x, y, z + height * 0.5),
        0.16,
        height,
        MATS["wood"],
        collection,
        segments=10,
        smooth=True,
        radius_top=0.11,
    )
    add_cylinder(
        name + "_Base",
        (x, y, z + 0.2),
        0.45,
        0.4,
        MATS["stone"],
        collection,
        segments=10,
        smooth=False,
    )
    add_icosphere(
        name + "_Cap",
        (x, y, z + height + 0.12),
        0.24,
        MATS["gold"],
        collection,
        subdivisions=2,
        smooth=True,
    )
    add_cone(
        name + "_Tip",
        (x, y, z + height + 0.5),
        0.16,
        0.0,
        0.55,
        MATS["gold"],
        collection,
        segments=8,
    )
    return (x, y, z + height)


def add_flag_line(name, p0, p1, sag, count, collection, seed_offset=0):
    p0 = Vector(p0)
    p1 = Vector(p1)
    curve = bpy.data.curves.new(f"{name}_Rope", "CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth = 0.02
    curve.bevel_resolution = 2
    spline = curve.splines.new("POLY")
    rope_points = 26
    spline.points.add(rope_points - 1)
    for i in range(rope_points):
        t = i / (rope_points - 1)
        p = catenary_point(p0, p1, sag, t)
        spline.points[i].co = (p.x, p.y, p.z, 1.0)
    rope = bpy.data.objects.new(f"{name}_Rope", curve)
    collection.objects.link(rope)
    curve.materials.append(MATS["rope"])

    verts = []
    faces = []
    mat_indices = []
    width = 0.64
    height = 0.5
    horizontal = Vector((p1.x - p0.x, p1.y - p0.y, 0.0))
    if horizontal.length < 1e-5:
        horizontal = Vector((1.0, 0.0, 0.0))
    horizontal.normalize()
    normal = horizontal.cross(Vector((0.0, 0.0, 1.0))).normalized()
    cols, rows = 3, 4
    for i in range(count):
        t = (i + 0.5) / count
        center = catenary_point(p0, p1, sag, t)
        color_index = (i + seed_offset) % len(FLAG_MATERIALS)
        base = len(verts)
        for iv in range(rows + 1):
            v = iv / rows
            for iu in range(cols + 1):
                u = iu / cols
                sway = math.sin(u * math.pi) * math.sin(v * math.pi * 1.3) * 0.13
                flutter = math.sin(t * 17.0 + u * 4.0 + iv) * 0.03 * v
                pos = (
                    center
                    + horizontal * ((u - 0.5) * width)
                    + normal * (sway + flutter)
                    + Vector((0.0, 0.0, -v * height))
                )
                verts.append((pos.x, pos.y, pos.z))
        for iv in range(rows):
            for iu in range(cols):
                a = base + iv * (cols + 1) + iu
                faces.append((a, a + 1, a + cols + 2, a + cols + 1))
                mat_indices.append(color_index)
    mesh = bpy.data.meshes.new(f"{name}_Flags")
    mesh.from_pydata(verts, [], faces)
    mesh.validate()
    mesh.update()
    for mat_name in FLAG_MATERIALS:
        mesh.materials.append(MATS[mat_name])
    for poly, mi in zip(mesh.polygons, mat_indices):
        poly.material_index = mi
        poly.use_smooth = True
    flags = bpy.data.objects.new(f"{name}_Flags", mesh)
    collection.objects.link(flags)


# =============================================================================
# VEGETATION AND ROCKS
# =============================================================================


def _tag_new_faces(bm, previous_face_count, material_index):
    bm.faces.ensure_lookup_table()
    for i in range(previous_face_count, len(bm.faces)):
        bm.faces[i].material_index = material_index


def make_pine_mesh(index):
    bm = bmesh.new()
    randomizer = random.Random(SEED + index * 71)
    bmesh.ops.create_cone(
        bm,
        cap_ends=True,
        cap_tris=False,
        segments=8,
        radius1=0.22,
        radius2=0.09,
        depth=4.0,
        matrix=Matrix.Translation((0.0, 0.0, 2.0)),
    )
    for face in bm.faces:
        face.material_index = 0
    layers = 6
    for layer in range(layers):
        base = 2.4 + layer * 1.35
        fraction = layer / max(layers - 1, 1)
        radius = (2.5 - 1.8 * fraction) * randomizer.uniform(0.85, 1.1)
        height = 2.8 - 0.35 * fraction
        before = len(bm.faces)
        bmesh.ops.create_cone(
            bm,
            cap_ends=True,
            cap_tris=True,
            segments=9,
            radius1=radius,
            radius2=0.02,
            depth=height,
            matrix=Matrix.Translation(
                (
                    randomizer.uniform(-0.15, 0.15),
                    randomizer.uniform(-0.15, 0.15),
                    base + height * 0.5,
                )
            ),
        )
        _tag_new_faces(bm, before, 1)
    mesh = bpy.data.meshes.new(f"Hunza_Pine_{index}")
    bm.to_mesh(mesh)
    bm.free()
    mesh.materials.append(MATS["trunk"])
    mesh.materials.append(MATS["pine"])
    for poly in mesh.polygons:
        poly.use_smooth = True
    return mesh


def make_poplar_mesh(index):
    bm = bmesh.new()
    randomizer = random.Random(SEED + 300 + index * 31)
    bmesh.ops.create_cone(
        bm,
        cap_ends=True,
        cap_tris=False,
        segments=8,
        radius1=0.25,
        radius2=0.08,
        depth=10.0,
        matrix=Matrix.Translation((0.0, 0.0, 5.0)),
    )
    for face in bm.faces:
        face.material_index = 0
    for i in range(5):
        z = 8.0 + i * 1.8
        radius = 1.95 - abs(i - 2) * 0.38
        before = len(bm.faces)
        try:
            bmesh.ops.create_icosphere(
                bm,
                subdivisions=2,
                radius=radius,
                matrix=Matrix.Translation(
                    (
                        randomizer.uniform(-0.25, 0.25),
                        randomizer.uniform(-0.25, 0.25),
                        z,
                    )
                )
                @ Matrix.Scale(1.9, 4, (0.0, 0.0, 1.0)),
            )
        except TypeError:
            bmesh.ops.create_icosphere(bm, subdivisions=2, diameter=radius * 2.0)
        _tag_new_faces(bm, before, 1)
    mesh = bpy.data.meshes.new(f"Hunza_Poplar_{index}")
    bm.to_mesh(mesh)
    bm.free()
    mesh.materials.append(MATS["trunk"])
    mesh.materials.append(MATS["poplar"])
    for poly in mesh.polygons:
        poly.use_smooth = True
    return mesh


def make_apricot_mesh(index):
    bm = bmesh.new()
    randomizer = random.Random(SEED + 600 + index * 57)
    bmesh.ops.create_cone(
        bm,
        cap_ends=True,
        cap_tris=False,
        segments=7,
        radius1=0.3,
        radius2=0.16,
        depth=3.0,
        matrix=Matrix.Translation((0.0, 0.0, 1.5)),
    )
    for face in bm.faces:
        face.material_index = 0
    for blob in range(5):
        center = (
            randomizer.uniform(-1.3, 1.3),
            randomizer.uniform(-1.3, 1.3),
            randomizer.uniform(3.0, 4.6),
        )
        before = len(bm.faces)
        try:
            bmesh.ops.create_icosphere(
                bm,
                subdivisions=2,
                radius=randomizer.uniform(1.1, 1.7),
                matrix=Matrix.Translation(center),
            )
        except TypeError:
            bmesh.ops.create_icosphere(bm, subdivisions=2, diameter=3.0)
        _tag_new_faces(bm, before, 1)
    mesh = bpy.data.meshes.new(f"Hunza_Apricot_{index}")
    bm.to_mesh(mesh)
    bm.free()
    mesh.materials.append(MATS["trunk"])
    mesh.materials.append(MATS["apricot"])
    for poly in mesh.polygons:
        poly.use_smooth = True
    return mesh


def make_rock_mesh(index):
    bm = bmesh.new()
    randomizer = random.Random(SEED + 900 + index * 41)
    _icosphere(bm, 2, 1.0)
    offset = Vector(
        (randomizer.uniform(-8, 8), randomizer.uniform(-8, 8), randomizer.uniform(-8, 8))
    )
    for v in bm.verts:
        n = mnoise.noise(v.co * 1.6 + offset)
        v.co *= 1.0 + 0.3 * n
        v.co.z *= randomizer.uniform(0.55, 0.85)
    mesh = bpy.data.meshes.new(f"Hunza_Rock_{index}")
    bm.to_mesh(mesh)
    bm.free()
    mesh.materials.append(MATS["rock"])
    for poly in mesh.polygons:
        poly.use_smooth = False
    return mesh


def make_grass_mesh(index):
    bm = bmesh.new()
    randomizer = random.Random(SEED + 1200 + index * 13)
    for blade in range(6):
        angle = randomizer.uniform(0.0, TAU)
        radius = randomizer.uniform(0.0, 0.15)
        height = randomizer.uniform(0.35, 0.9)
        bmesh.ops.create_cone(
            bm,
            cap_ends=False,
            cap_tris=False,
            segments=4,
            radius1=0.035,
            radius2=0.0,
            depth=height,
            matrix=Matrix.Translation(
                (math.cos(angle) * radius, math.sin(angle) * radius, height * 0.5)
            ),
        )
    mesh = bpy.data.meshes.new(f"Hunza_Grass_{index}")
    bm.to_mesh(mesh)
    bm.free()
    mesh.materials.append(MATS["grass"])
    for poly in mesh.polygons:
        poly.use_smooth = True
    return mesh


def instance_mesh(name, mesh, location, scale, rot, collection, scale_z=None):
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    obj.location = Vector(location)
    if scale_z is None:
        obj.scale = (scale, scale, scale)
    else:
        obj.scale = (scale, scale, scale_z)
    obj.rotation_euler = (0.0, 0.0, rot)
    return obj


def build_vegetation():
    pine_meshes = [make_pine_mesh(i) for i in range(4)]
    poplar_meshes = [make_poplar_mesh(i) for i in range(3)]
    apricot_meshes = [make_apricot_mesh(i) for i in range(3)]
    rock_meshes = [make_rock_mesh(i) for i in range(5)]
    grass_meshes = [make_grass_mesh(i) for i in range(3)]
    col = COL["Vegetation"]

    def blocked(x, y):
        if 45.0 < x < 195.0 and -50.0 < y < 150.0:
            return True
        if x < -95.0 and -10.0 < y < 90.0:
            return True
        return False

    # pines on upper slopes
    placed = 0
    attempts = 0
    while placed < 190 and attempts < 7000:
        attempts += 1
        x = rng.uniform(-900.0, 900.0)
        y = rng.uniform(-500.0, 900.0)
        z = terrain_height(x, y)
        d = abs(x - river_x(y))
        if d < 70.0 or z < 15.0 or z > 250.0 or blocked(x, y):
            continue
        scale = rng.uniform(0.8, 1.8)
        instance_mesh(
            f"Hunza_Pine_{placed:03d}",
            rng.choice(pine_meshes),
            (x, y, z - 0.15),
            scale,
            rng.uniform(0.0, TAU),
            col,
        )
        placed += 1

    # poplars in field-boundary rows and along the lanes
    poplar_spots = []
    for i in range(13):
        y = -140.0 + i * 18.0
        poplar_spots.append((36.0, y))
        poplar_spots.append((-236.0, y + 6.0))
    for i in range(10):
        y = -20.0 + i * 15.0
        poplar_spots.append((192.0, y))
    for i, (x, y) in enumerate(poplar_spots):
        z = terrain_height(x, y)
        if z < 0.2:
            continue
        instance_mesh(
            f"Hunza_Poplar_{i:03d}",
            rng.choice(poplar_meshes),
            (x, y, z),
            rng.uniform(0.8, 1.25),
            rng.uniform(0.0, TAU),
            col,
        )

    # apricot orchards near the village and terraces
    apricot_index = 0
    for row in range(4):
        for i in range(6):
            x = 62.0 + row * 18.0 + rng.uniform(-2.0, 2.0)
            y = -70.0 + i * 16.0 + rng.uniform(-2.0, 2.0)
            z = terrain_height(x, y)
            if z < 0.2:
                continue
            instance_mesh(
                f"Hunza_Apricot_{apricot_index:03d}",
                rng.choice(apricot_meshes),
                (x, y, z),
                rng.uniform(0.7, 1.15),
                rng.uniform(0.0, TAU),
                col,
            )
            apricot_index += 1
    for i in range(14):
        x = rng.uniform(-250.0, -60.0)
        y = rng.uniform(-200.0, 60.0)
        z = terrain_height(x, y)
        if z < 0.2:
            continue
        instance_mesh(
            f"Hunza_Apricot_West_{i:02d}",
            rng.choice(apricot_meshes),
            (x, y, z),
            rng.uniform(0.65, 1.0),
            rng.uniform(0.0, TAU),
            col,
        )

    # foreground pines framing the near slope
    for i, (x, y, scale) in enumerate(
        (
            (-300.0, -220.0, 1.5),
            (-285.0, -160.0, 1.2),
            (-310.0, -300.0, 1.7),
            (-170.0, -190.0, 1.25),
            (-140.0, -230.0, 1.4),
            (-330.0, -100.0, 1.6),
            (-120.0, -150.0, 1.1),
            (-260.0, -120.0, 1.3),
            (-95.0, -320.0, 1.5),
            (-350.0, -250.0, 1.8),
        )
    ):
        z = terrain_height(x, y)
        instance_mesh(
            f"Foreground_Pine_{i}",
            rng.choice(pine_meshes),
            (x, y, z),
            scale,
            rng.uniform(0.0, TAU),
            col,
        )

    for i, (x, y) in enumerate(
        ((-45.0, -180.0), (-15.0, -130.0), (35.0, -105.0), (-80.0, -80.0))
    ):
        z = terrain_height(x, y)
        instance_mesh(
            f"Near_Poplar_{i}",
            rng.choice(poplar_meshes),
            (x, y, z),
            rng.uniform(0.85, 1.15),
            rng.uniform(0.0, TAU),
            col,
        )

    # foreground detail on the near slope
    for i, (x, y, scale) in enumerate(
        (
            (-125.0, -175.0, 1.3),
            (-95.0, -150.0, 0.9),
            (-65.0, -120.0, 1.6),
            (-145.0, -120.0, 0.8),
            (-110.0, -90.0, 1.1),
            (-70.0, -75.0, 0.7),
            (-150.0, -60.0, 1.2),
            (-45.0, -150.0, 0.6),
            (-30.0, -110.0, 0.9),
        )
    ):
        z = terrain_height(x, y)
        instance_mesh(
            f"Near_Boulder_{i}",
            rng.choice(rock_meshes),
            (x, y, z + 0.1),
            scale,
            rng.uniform(0.0, TAU),
            col,
            scale_z=scale * rng.uniform(0.5, 0.9),
        )
    for i in range(30):
        x = rng.uniform(-170.0, -25.0)
        y = rng.uniform(-200.0, -40.0)
        z = terrain_height(x, y)
        if abs(x - river_x(y)) < 24.0:
            continue
        instance_mesh(
            f"Near_Grass_{i}",
            rng.choice(grass_meshes),
            (x, y, z),
            rng.uniform(0.8, 1.7),
            rng.uniform(0.0, TAU),
            col,
        )

    # riverbank and scattered boulders
    for i in range(55):
        y = rng.uniform(-450.0, 1050.0)
        cx = river_x(y)
        side = rng.choice((-1.0, 1.0))
        x = cx + side * rng.uniform(19.0, 44.0)
        z = terrain_height(x, y)
        scale = rng.uniform(0.4, 2.2)
        instance_mesh(
            f"Hunza_Boulder_{i:03d}",
            rng.choice(rock_meshes),
            (x, y, z + 0.1),
            scale,
            rng.uniform(0.0, TAU),
            col,
            scale_z=scale * rng.uniform(0.6, 1.1),
        )
    # scree and boulders on the open slopes
    for i in range(80):
        x = rng.uniform(-650.0, 650.0)
        y = rng.uniform(-350.0, 650.0)
        z = terrain_height(x, y)
        d = abs(x - river_x(y))
        if d < 45.0 or z < 8.0 or z > 230.0:
            continue
        scale = rng.uniform(0.35, 1.8)
        instance_mesh(
            f"Hunza_SlopeRock_{i:03d}",
            rng.choice(rock_meshes),
            (x, y, z + 0.1),
            scale,
            rng.uniform(0.0, TAU),
            col,
            scale_z=scale * rng.uniform(0.5, 0.95),
        )

    # boulders in the river, with foam
    for i in range(14):
        y = rng.uniform(-300.0, 600.0)
        x = river_x(y) + rng.uniform(-10.0, 10.0)
        scale = rng.uniform(0.8, 2.0)
        instance_mesh(
            f"River_Rock_{i:02d}",
            rng.choice(rock_meshes),
            (x, y, 0.3),
            scale,
            rng.uniform(0.0, TAU),
            COL["Hunza_River"],
            scale_z=scale * 0.5,
        )
        add_icosphere(
            f"River_Foam_{i:02d}",
            (x, y + 0.8, 0.75),
            scale * 1.05,
            MATS["foam"],
            COL["Hunza_River"],
            scale=(1.0, 0.75, 0.08),
            subdivisions=2,
            smooth=True,
        )

    # grass tufts
    for i in range(110):
        x = rng.uniform(-300.0, 300.0)
        y = rng.uniform(-250.0, 250.0)
        z = terrain_height(x, y)
        if z < 0.4 or abs(x - river_x(y)) < 22.0:
            continue
        instance_mesh(
            f"Hunza_Grass_{i:03d}",
            rng.choice(grass_meshes),
            (x, y, z),
            rng.uniform(0.8, 1.8),
            rng.uniform(0.0, TAU),
            col,
        )

    # shrubs
    shrub = make_rock_mesh(55)
    shrub.materials.clear()
    shrub.materials.append(MATS["apricot"])
    for i in range(38):
        x = rng.uniform(-320.0, 320.0)
        y = rng.uniform(-280.0, 280.0)
        z = terrain_height(x, y)
        if z < 0.3:
            continue
        instance_mesh(
            f"Hunza_Shrub_{i:02d}",
            shrub,
            (x, y, z + 0.2),
            rng.uniform(0.3, 0.75),
            rng.uniform(0.0, TAU),
            col,
            scale_z=rng.uniform(0.4, 0.75),
        )


# =============================================================================
# LIGHTING, WORLD, CAMERAS
# =============================================================================


def configure_sky(sky, sun_elevation_deg, sun_rotation_deg):
    """Work across Blender 4.x (Nishita) and 5.x (multiple scattering)."""
    for sky_type in ("MULTIPLE_SCATTERING", "NISHITA", "SINGLE_SCATTERING", "HOSEK_WILKIE"):
        try:
            sky.sky_type = sky_type
            break
        except Exception:
            continue
    settings = (
        ("sun_elevation", math.radians(sun_elevation_deg)),
        ("sun_rotation", math.radians(sun_rotation_deg)),
        ("sun_intensity", 1.0),
        ("altitude", 2300.0),
        ("air_density", 1.1),
        ("aerosol_density", 1.5),
        ("ozone_density", 1.0),
        ("sun_disc", False),
        ("sun_size", math.radians(0.6)),
    )
    for name, value in settings:
        if hasattr(sky, name):
            try:
                setattr(sky, name, value)
            except Exception:
                pass


def build_world(scene):
    world = bpy.data.worlds.new("Hunza_Sky")
    scene.world = world
    world.use_nodes = True
    nt = world.node_tree
    for node in list(nt.nodes):
        nt.nodes.remove(node)
    out = nt.nodes.new("ShaderNodeOutputWorld")
    out.location = (700, 0)
    bg = nt.nodes.new("ShaderNodeBackground")
    bg.location = (450, 0)
    bg.inputs["Strength"].default_value = 0.14
    nt.links.new(bg.outputs["Background"], out.inputs["Surface"])

    sky = nt.nodes.new("ShaderNodeTexSky")
    sky.location = (-150, 150)
    configure_sky(sky, 22.0, 118.0)

    tc = nt.nodes.new("ShaderNodeTexCoord")
    tc.location = (-850, -200)
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.location = (-650, -200)
    set_socket(noise, "Scale", 1.1)
    set_socket(noise, "Detail", 12.0)
    set_socket(noise, "Roughness", 0.6)
    set_socket(noise, "Distortion", 0.5)
    nt.links.new(tc.outputs["Generated"], noise.inputs["Vector"])
    cloud_ramp = add_ramp(
        nt, [(0.46, (0.0, 0.0, 0.0)), (0.62, (1.0, 1.0, 1.0))], (-430, -200)
    )
    nt.links.new(noise.outputs["Fac"], cloud_ramp.inputs["Fac"])
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    sep.location = (-650, -480)
    nt.links.new(tc.outputs["Generated"], sep.inputs["Vector"])
    height = nt.nodes.new("ShaderNodeMapRange")
    height.location = (-430, -480)
    height.inputs["From Min"].default_value = 0.02
    height.inputs["From Max"].default_value = 0.6
    nt.links.new(sep.outputs["Z"], height.inputs["Value"])
    cloudmask = nt.nodes.new("ShaderNodeMath")
    cloudmask.operation = "MULTIPLY"
    cloudmask.location = (-180, -300)
    nt.links.new(cloud_ramp.outputs["Color"], cloudmask.inputs[0])
    nt.links.new(height.outputs["Result"], cloudmask.inputs[1])
    hue = nt.nodes.new("ShaderNodeHueSaturation")
    hue.location = (30, 160)
    hue.inputs["Saturation"].default_value = 1.45
    hue.inputs["Value"].default_value = 0.92
    nt.links.new(sky.outputs["Color"], hue.inputs["Color"])
    mix, fac, col_a, col_b, mix_out = new_mix_color(nt, (150, 50))
    nt.links.new(hue.outputs["Color"], col_a)
    col_b.default_value = (0.85, 0.89, 0.95, 1.0)
    nt.links.new(cloudmask.outputs[0], fac)
    nt.links.new(mix_out, bg.inputs["Color"])

    haze = add_box(
        "Hunza_Atmospheric_Haze",
        (0.0, 700.0, 350.0),
        (7000.0, 7000.0, 1400.0),
        MATS["haze"],
        COL["Lighting"],
    )
    haze.display_type = "BOUNDS"
    mist = add_box(
        "Hunza_Valley_Mist",
        (0.0, 350.0, 14.0),
        (650.0, 1500.0, 28.0),
        MATS["mist"],
        COL["Lighting"],
    )
    mist.display_type = "BOUNDS"


def aim_object(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = direction.to_track_quat("-Z", "Y")


def add_sun(name, location, target, energy, color, angle_deg=1.5, shadow=True):
    data = bpy.data.lights.new(name, type="SUN")
    data.energy = energy
    data.color = color
    data.angle = math.radians(angle_deg)
    try:
        data.use_shadow = shadow
    except Exception:
        pass
    obj = bpy.data.objects.new(name, data)
    COL["Lighting"].objects.link(obj)
    obj.location = Vector(location)
    aim_object(obj, target)
    return obj


def build_lighting():
    add_sun(
        "Sun_Key",
        (-1200.0, -500.0, 700.0),
        (100.0, 200.0, 80.0),
        5.8,
        (1.0, 0.85, 0.66),
        angle_deg=1.6,
    )
    add_sun(
        "Sun_Fill",
        (900.0, -500.0, 500.0),
        (100.0, 100.0, 50.0),
        0.14,
        (0.62, 0.75, 1.0),
        angle_deg=18.0,
        shadow=False,
    )
    add_sun(
        "Sun_Rim",
        (600.0, 2600.0, 1500.0),
        (100.0, 200.0, 100.0),
        1.4,
        (1.0, 0.86, 0.70),
        angle_deg=5.0,
        shadow=False,
    )


def add_camera(name, location, target, lens=35.0, fstop=None, focus_point=None):
    data = bpy.data.cameras.new(name)
    data.lens = lens
    data.sensor_width = 36.0
    data.clip_start = 0.1
    data.clip_end = 12000.0
    obj = bpy.data.objects.new(name, data)
    COL["Cameras"].objects.link(obj)
    obj.location = Vector(location)
    aim_object(obj, target)
    if fstop is not None:
        data.dof.use_dof = True
        data.dof.aperture_fstop = fstop
        focus = bpy.data.objects.new(f"{name}_Focus", None)
        focus.empty_display_type = "SPHERE"
        focus.empty_display_size = 1.0
        COL["Cameras"].objects.link(focus)
        focus.location = Vector(focus_point or target)
        data.dof.focus_object = focus
    return obj


def build_cameras(scene):
    main = add_camera(
        "Camera_Valley_Cinematic",
        (-170.0, -230.0, 45.0),
        (10.0, 120.0, 65.0),
        lens=35.0,
        fstop=8.0,
        focus_point=(20.0, 20.0, 20.0),
    )
    scene.camera = main

    add_camera(
        "Camera_Valley_Overview",
        (-420.0, -520.0, 240.0),
        (40.0, 300.0, 30.0),
        lens=28.0,
    )
    add_camera(
        "Camera_Baltit_Closeup",
        (35.0, -85.0, 95.0),
        (165.0, 115.0, 92.0),
        lens=70.0,
        fstop=4.0,
        focus_point=(165.0, 118.0, 88.0),
    )
    add_camera(
        "Camera_River_Viewpoint",
        (-26.0, -150.0, 12.0),
        (10.0, 400.0, 12.0),
        lens=24.0,
    )
    add_camera(
        "Camera_Mountain_Viewpoint",
        (-150.0, -250.0, 110.0),
        (900.0, 1900.0, 500.0),
        lens=100.0,
    )
    add_camera(
        "Camera_Aerial",
        (260.0, -620.0, 480.0),
        (20.0, 300.0, 20.0),
        lens=28.0,
    )


# =============================================================================
# RENDER
# =============================================================================


def configure_gpu(scene):
    if FORCE_CPU:
        scene.cycles.device = "CPU"
        print("[Hunza] --cpu supplied; rendering on CPU")
        return False
    try:
        prefs = bpy.context.preferences.addons["cycles"].preferences
        prefs.get_devices()
    except Exception:
        scene.cycles.device = "CPU"
        return False
    for compute_type in ("CUDA", "OPTIX", "HIP", "ONEAPI", "METAL"):
        try:
            prefs.compute_device_type = compute_type
            prefs.get_devices()
        except Exception:
            continue
        gpus = [d for d in prefs.devices if d.type != "CPU"]
        if not gpus:
            continue
        for device in prefs.devices:
            device.use = device.type != "CPU"
        scene.cycles.device = "GPU"
        print(f"[Hunza] GPU rendering enabled via {compute_type}")
        return True
    scene.cycles.device = "CPU"
    print("[Hunza] No GPU found - rendering on CPU")
    return False


def configure_render(scene):
    scene.render.engine = "CYCLES"
    configure_gpu(scene)
    scene.cycles.samples = SAMPLES
    scene.cycles.use_adaptive_sampling = True
    scene.cycles.adaptive_threshold = 0.025
    scene.cycles.use_denoising = True
    try:
        scene.cycles.denoiser = "OPENIMAGEDENOISE"
    except Exception:
        pass
    scene.cycles.max_bounces = 7
    scene.cycles.diffuse_bounces = 3
    scene.cycles.glossy_bounces = 4
    scene.cycles.transmission_bounces = 5
    scene.cycles.volume_bounces = 2
    scene.cycles.transparent_max_bounces = 8
    try:
        scene.cycles.use_light_tree = True
    except Exception:
        pass
    scene.render.resolution_x = RES_X
    scene.render.resolution_y = RES_Y
    scene.render.resolution_percentage = RES_PERCENT
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"
    scene.render.image_settings.color_depth = "8"
    scene.render.image_settings.compression = 15
    scene.render.film_transparent = False
    scene.render.use_persistent_data = True
    scene.render.filepath = os.path.join(OUTPUT_DIR, RENDER_NAME)

    scene.view_settings.view_transform = "AgX"
    for look in (
        "AgX - Medium High Contrast",
        "AgX - Base Contrast",
        "AgX - Medium Low Contrast",
        "NONE",
        "None",
    ):
        try:
            scene.view_settings.look = look
            break
        except Exception:
            continue
    scene.view_settings.exposure = -0.05

    try:
        if hasattr(scene, "compositing_node_group"):
            print("[Hunza] Compositor bloom skipped (Blender 5 node-group compositor).")
        else:
            scene.use_nodes = True
            nt = scene.node_tree
            for node in list(nt.nodes):
                nt.nodes.remove(node)
            render_layers = nt.nodes.new("CompositorNodeRLayers")
            render_layers.location = (-400, 0)
            glare = nt.nodes.new("CompositorNodeGlare")
            glare.location = (-100, 0)
            glare.glare_type = "FOG_GLOW"
            glare.quality = "HIGH"
            glare.threshold = 1.25
            glare.size = 7
            glare.mix = -0.85
            composite = nt.nodes.new("CompositorNodeComposite")
            composite.location = (200, 0)
            nt.links.new(render_layers.outputs["Image"], glare.inputs["Image"])
            nt.links.new(glare.outputs["Image"], composite.inputs["Image"])
    except Exception as exc:
        print(f"[Hunza] Compositor bloom skipped: {exc}")


def save_and_render(scene):
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    blend_path = os.path.join(OUTPUT_DIR, BLEND_NAME)
    png_path = os.path.join(OUTPUT_DIR, RENDER_NAME)
    scene.render.filepath = png_path
    try:
        bpy.ops.wm.save_as_mainfile(filepath=blend_path)
        print(f"[Hunza] Saved project: {blend_path}")
    except Exception as exc:
        print(f"[Hunza] Could not save .blend: {exc}")
    if NO_RENDER:
        print("[Hunza] --no-render supplied; skipping render.")
        return
    print(
        f"[Hunza] Rendering {RES_X}x{RES_Y} at {RES_PERCENT}% with {SAMPLES} samples..."
    )
    bpy.ops.render.render(write_still=True)
    print(f"[Hunza] Rendered image: {png_path}")


# =============================================================================
# MAIN
# =============================================================================


def main():
    print("[Hunza] Building valley scene...")
    scene = reset_scene()
    make_collections()
    build_materials()
    build_world(scene)
    build_lighting()
    build_terrain()
    build_mountains()
    build_village()
    build_baltit_fort()
    build_altit_fort()
    build_vegetation()
    build_cameras(scene)
    configure_render(scene)

    try:
        for screen in bpy.data.screens:
            for area in screen.areas:
                if area.type == "VIEW_3D":
                    space = area.spaces.active
                    space.shading.type = "MATERIAL"
                    space.clip_end = 12000.0
    except Exception:
        pass

    save_and_render(scene)
    print("[Hunza] Done.")


if __name__ == "__main__":
    main()
