#!/usr/bin/env python3
"""
Himalaya Connect - Cinematic Himalayan Monastery
================================================
A complete, self-contained Blender scene generator.

Creates a three-storey Nepalese Buddhist monastery on a rock outcrop,
surrounded by procedural snow-capped Himalayan peaks, stone stairs,
pine forest, boulders and prayer flags, with a cinematic camera,
volumetric haze and a ready-to-render Cycles setup.

Requirements
------------
Blender 4.2+ (tested against the bpy API used by Blender 4.x / 5.x).

Run (background, recommended)
-----------------------------
    blender -b -P himalaya_monastery.py

Quick preview render (no full-quality wait):
    blender -b -P himalaya_monastery.py -- --samples 32 --percent 50

Build the scene without rendering:
    blender -b -P himalaya_monastery.py -- --no-render

Outputs (default):
    ~/HimalayaConnect_Renders/himalaya_monastery.blend
    ~/HimalayaConnect_Renders/himalaya_monastery.png

You can also open this file in Blender's Text Editor and press Run Script.

Everything is procedural: no external textures, HDRIs or assets are needed.
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

SEED = 31415
RES_X, RES_Y = 1920, 1080
SAMPLES = 256
RES_PERCENT = 100
PLATFORM_Z = 12.0
PLATFORM_R = 19.0
OUTPUT_DIR = os.environ.get(
    "HIMALAYA_OUTPUT_DIR",
    os.path.join(os.path.expanduser("~"), "HimalayaConnect_Renders"),
)
BLEND_NAME = "himalaya_monastery.blend"
RENDER_NAME = "himalaya_monastery.png"


def _arg_value(flag, default):
    """Read an argument passed after `--` (or anywhere on the CLI)."""
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
MONASTERY_ROOT = None

# =============================================================================
# SMALL MATH HELPERS
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
    """Fractal Brownian motion in [-1, 1]."""
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
    """Ridged multifractal in [0, 1] - excellent for mountain crests."""
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


def rng_vec(scale=1.0):
    return Vector(
        (
            rng.uniform(-scale, scale),
            rng.uniform(-scale, scale),
            rng.uniform(0.0, scale),
        )
    )


# =============================================================================
# SCENE RESET + COLLECTIONS
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
        "Mountains",
        "Monastery",
        "Terrain",
        "Vegetation",
        "Prayer_Flags",
        "Lighting",
        "Cameras",
    )
    for name in names:
        col = bpy.data.collections.new(name)
        bpy.context.scene.collection.children.link(col)
        COL[name] = col


# =============================================================================
# MATERIAL HELPERS
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
    first_pos, first_col = stops[0]
    ramp.elements[0].position = first_pos
    ramp.elements[0].color = _rgba(first_col)
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
    # --- snow ---------------------------------------------------------------
    mat, nt, bsdf = new_principled("Snow", (0.84, 0.88, 0.95), 0.38)
    set_socket(bsdf, "Subsurface Weight", 0.05)
    set_socket(bsdf, "Subsurface Radius", (0.2, 0.3, 0.5))
    set_socket(bsdf, "Specular IOR Level", 0.45)
    add_noise_bump(nt, bsdf, scale=22.0, strength=0.12, distance=0.03, detail=6.0)
    MATS["snow"] = mat

    # --- mountain rock + snow mix ------------------------------------------
    mat, nt, out = new_material("Mountain_Rock_Snow")
    bsdf_rock = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf_rock.location = (250, 180)
    set_socket(bsdf_rock, "Roughness", 0.94)
    set_socket(bsdf_rock, "Specular IOR Level", 0.25)
    tc = nt.nodes.new("ShaderNodeTexCoord")
    tc.location = (-950, 220)
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.location = (-750, 220)
    set_socket(noise, "Scale", 0.025)
    set_socket(noise, "Detail", 12.0)
    set_socket(noise, "Roughness", 0.62)
    set_socket(noise, "Distortion", 0.25)
    nt.links.new(tc.outputs["Object"], noise.inputs["Vector"])
    rock_ramp = add_ramp(
        nt,
        [
            (0.28, (0.055, 0.052, 0.048)),
            (0.52, (0.135, 0.125, 0.112)),
            (0.78, (0.28, 0.26, 0.235)),
        ],
        (-500, 220),
    )
    nt.links.new(noise.outputs["Fac"], rock_ramp.inputs["Fac"])
    nt.links.new(rock_ramp.outputs["Color"], bsdf_rock.inputs["Base Color"])
    add_noise_bump(nt, bsdf_rock, scale=0.16, strength=0.55, distance=1.2, detail=12.0)

    bsdf_snow = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf_snow.location = (250, -220)
    set_socket(bsdf_snow, "Base Color", (0.86, 0.90, 0.96, 1.0))
    set_socket(bsdf_snow, "Roughness", 0.40)
    set_socket(bsdf_snow, "Subsurface Weight", 0.04)
    set_socket(bsdf_snow, "Specular IOR Level", 0.45)
    add_noise_bump(nt, bsdf_snow, scale=0.35, strength=0.12, distance=0.35, detail=7.0)

    attr = nt.nodes.new("ShaderNodeAttribute")
    attr.attribute_name = "SnowMask"
    attr.location = (-500, -420)
    breakup = nt.nodes.new("ShaderNodeTexNoise")
    breakup.location = (-750, -520)
    set_socket(breakup, "Scale", 0.09)
    set_socket(breakup, "Detail", 6.0)
    nt.links.new(tc.outputs["Object"], breakup.inputs["Vector"])
    breakup_ramp = add_ramp(
        nt, [(0.40, (0.72, 0.72, 0.72)), (0.62, (1.0, 1.0, 1.0))], (-500, -520)
    )
    nt.links.new(breakup.outputs["Fac"], breakup_ramp.inputs["Fac"])
    snow_fac = nt.nodes.new("ShaderNodeMath")
    snow_fac.operation = "MULTIPLY"
    snow_fac.location = (-220, -430)
    nt.links.new(attr.outputs["Fac"], snow_fac.inputs[0])
    nt.links.new(breakup_ramp.outputs["Color"], snow_fac.inputs[1])
    mix = nt.nodes.new("ShaderNodeMixShader")
    mix.location = (520, 0)
    nt.links.new(snow_fac.outputs[0], mix.inputs[0])
    nt.links.new(bsdf_rock.outputs["BSDF"], mix.inputs[1])
    nt.links.new(bsdf_snow.outputs["BSDF"], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs["Surface"])
    mat.diffuse_color = (0.4, 0.42, 0.45, 1.0)
    MATS["mountain"] = mat

    # --- terrain ------------------------------------------------------------
    mat, nt, out = new_material("Valley_Terrain")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.location = (300, 0)
    set_socket(bsdf, "Roughness", 0.93)
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    attr = nt.nodes.new("ShaderNodeAttribute")
    attr.attribute_name = "GroundColor"
    attr.location = (-650, 200)
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.location = (-650, -250)
    set_socket(noise, "Scale", 0.35)
    set_socket(noise, "Detail", 9.0)
    set_socket(noise, "Roughness", 0.6)
    tc = nt.nodes.new("ShaderNodeTexCoord")
    tc.location = (-900, -250)
    nt.links.new(tc.outputs["Object"], noise.inputs["Vector"])
    detail_ramp = add_ramp(
        nt,
        [(0.3, (0.55, 0.55, 0.52)), (0.7, (1.0, 1.0, 0.95))],
        (-350, -250),
    )
    nt.links.new(noise.outputs["Fac"], detail_ramp.inputs["Fac"])
    mix, fac, col_a, col_b, mix_out = new_mix_color(nt, (-100, 100), "MULTIPLY")
    fac.default_value = 0.35
    nt.links.new(attr.outputs["Color"], col_a)
    nt.links.new(detail_ramp.outputs["Color"], col_b)
    nt.links.new(mix_out, bsdf.inputs["Base Color"])
    add_noise_bump(nt, bsdf, scale=1.6, strength=0.35, distance=0.4, detail=10.0)
    mat.diffuse_color = (0.15, 0.20, 0.08, 1.0)
    MATS["terrain"] = mat

    # --- cliff / boulder rock ----------------------------------------------
    mat, nt, bsdf = new_principled("Cliff_Rock", (0.16, 0.15, 0.135), 0.95)
    noise = add_noise_bump(
        nt, bsdf, scale=2.2, strength=0.5, distance=0.35, detail=10.0, distortion=0.3
    )
    tc2 = nt.nodes.new("ShaderNodeTexCoord")
    tc2.location = (-750, 300)
    vor = nt.nodes.new("ShaderNodeTexVoronoi")
    vor.location = (-500, 250)
    set_socket(vor, "Scale", 1.4)
    nt.links.new(tc2.outputs["Object"], vor.inputs["Vector"])
    mix, fac, col_a, col_b, out_col = new_mix_color(nt, (-100, 250))
    col_a.default_value = (0.11, 0.105, 0.098, 1.0)
    col_b.default_value = (0.25, 0.23, 0.20, 1.0)
    # Voronoi distance makes the rock surface patchy.
    nt.links.new(vor.outputs["Distance"], fac)
    nt.links.new(out_col, bsdf.inputs["Base Color"])
    MATS["rock"] = mat

    # --- stone wall with brick pattern -------------------------------------
    mat, nt, out = new_material("Stone_Block_Wall")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.location = (350, 0)
    set_socket(bsdf, "Roughness", 0.9)
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    tc = nt.nodes.new("ShaderNodeTexCoord")
    tc.location = (-700, 100)
    brick = nt.nodes.new("ShaderNodeTexBrick")
    brick.location = (-450, 100)
    set_socket(brick, "Scale", 1.0)
    set_socket(brick, "Mortar Size", 0.022)
    set_socket(brick, "Mortar Smooth", 0.35)
    set_socket(brick, "Bias", 0.0)
    set_socket(brick, "Brick Width", 0.78)
    set_socket(brick, "Row Height", 0.36)
    set_socket(brick, "Color1", (0.19, 0.175, 0.15, 1.0))
    set_socket(brick, "Color2", (0.30, 0.275, 0.23, 1.0))
    set_socket(brick, "Mortar", (0.075, 0.07, 0.06, 1.0))
    nt.links.new(tc.outputs["Object"], brick.inputs["Vector"])
    nt.links.new(brick.outputs["Color"], bsdf.inputs["Base Color"])
    add_noise_bump(nt, bsdf, scale=5.5, strength=0.35, distance=0.06, detail=9.0)
    mat.diffuse_color = (0.3, 0.28, 0.24, 1.0)
    MATS["stone_wall"] = mat

    # --- dressed stone / steps / platform ----------------------------------
    mat, nt, bsdf = new_principled("Stone_Dressed", (0.24, 0.22, 0.19), 0.9)
    add_noise_bump(nt, bsdf, scale=3.0, strength=0.3, distance=0.08, detail=9.0)
    MATS["stone"] = mat

    mat, nt, bsdf = new_principled("Stone_Path", (0.19, 0.17, 0.145), 0.93)
    add_noise_bump(nt, bsdf, scale=5.0, strength=0.35, distance=0.1, detail=8.0)
    MATS["path"] = mat

    # --- wood ---------------------------------------------------------------
    mat, nt, out = new_material("Dark_Wood")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.location = (300, 0)
    set_socket(bsdf, "Roughness", 0.72)
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    tc = nt.nodes.new("ShaderNodeTexCoord")
    tc.location = (-700, 0)
    wave = nt.nodes.new("ShaderNodeTexWave")
    wave.location = (-450, 0)
    wave.wave_type = "BANDS"
    wave.bands_direction = "X"
    wave.wave_profile = "SIN"
    set_socket(wave, "Scale", 5.0)
    set_socket(wave, "Distortion", 9.0)
    set_socket(wave, "Detail", 4.0)
    set_socket(wave, "Detail Scale", 1.5)
    nt.links.new(tc.outputs["Object"], wave.inputs["Vector"])
    ramp = add_ramp(
        nt,
        [(0.15, (0.035, 0.020, 0.012)), (0.65, (0.11, 0.062, 0.032))],
        (-250, 0),
    )
    nt.links.new(wave.outputs["Fac"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
    add_noise_bump(nt, bsdf, scale=9.0, strength=0.18, distance=0.04, detail=7.0)
    MATS["wood"] = mat

    mat, nt, bsdf = new_principled("Warm_Wood", (0.16, 0.09, 0.045), 0.7)
    add_noise_bump(nt, bsdf, scale=4.0, strength=0.2, distance=0.05, detail=8.0)
    MATS["wood_light"] = mat

    # --- plaster walls ------------------------------------------------------
    mat, nt, bsdf = new_principled("Monastery_Red", (0.27, 0.050, 0.035), 0.82)
    add_noise_bump(nt, bsdf, scale=2.8, strength=0.2, distance=0.06, detail=8.0)
    MATS["red"] = mat

    mat, nt, bsdf = new_principled("Monastery_White", (0.78, 0.72, 0.62), 0.85)
    add_noise_bump(nt, bsdf, scale=3.6, strength=0.18, distance=0.05, detail=8.0)
    MATS["white"] = mat

    # --- gold + roofs -------------------------------------------------------
    mat, nt, bsdf = new_principled("Gold", (0.95, 0.60, 0.16), 0.17, 1.0)
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.location = (-300, -200)
    set_socket(noise, "Scale", 14.0)
    set_socket(noise, "Detail", 6.0)
    ramp = add_ramp(nt, [(0.2, (0.08, 0.06, 0.03)), (0.8, (1.0, 1.0, 1.0))], (-100, -200))
    nt.links.new(noise.outputs["Fac"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], bsdf.inputs["Roughness"])
    MATS["gold"] = mat

    mat, nt, out = new_material("Aged_Copper_Roof")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.location = (300, 0)
    set_socket(bsdf, "Base Color", (0.46, 0.27, 0.085, 1.0))
    set_socket(bsdf, "Metallic", 0.85)
    set_socket(bsdf, "Roughness", 0.30)
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    tc = nt.nodes.new("ShaderNodeTexCoord")
    tc.location = (-700, 0)
    wave = nt.nodes.new("ShaderNodeTexWave")
    wave.location = (-450, 0)
    wave.wave_type = "BANDS"
    wave.bands_direction = "Y"
    set_socket(wave, "Scale", 7.0)
    set_socket(wave, "Distortion", 2.0)
    nt.links.new(tc.outputs["Object"], wave.inputs["Vector"])
    bump = nt.nodes.new("ShaderNodeBump")
    bump.location = (0, -250)
    set_socket(bump, "Strength", 0.22)
    set_socket(bump, "Distance", 0.04)
    nt.links.new(wave.outputs["Fac"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    MATS["roof"] = mat

    # --- window glass, rope, flags -----------------------------------------
    mat, nt, bsdf = new_principled("Window_Dark", (0.008, 0.009, 0.011), 0.4)
    MATS["glass"] = mat

    mat, nt, bsdf = new_principled("Rope", (0.055, 0.040, 0.025), 0.9)
    MATS["rope"] = mat

    flag_colors = {
        "Flag_Blue": (0.015, 0.16, 0.55),
        "Flag_White": (0.82, 0.82, 0.78),
        "Flag_Red": (0.62, 0.025, 0.018),
        "Flag_Green": (0.015, 0.33, 0.07),
        "Flag_Yellow": (0.85, 0.52, 0.015),
    }
    for name, color in flag_colors.items():
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

    # --- vegetation ---------------------------------------------------------
    mat, nt, bsdf = new_principled("Pine_Needles", (0.038, 0.115, 0.042), 0.86)
    add_noise_bump(nt, bsdf, scale=6.0, strength=0.3, distance=0.04, detail=8.0)
    MATS["pine"] = mat

    mat, nt, bsdf = new_principled("Leaves", (0.10, 0.155, 0.028), 0.84)
    add_noise_bump(nt, bsdf, scale=5.0, strength=0.25, distance=0.05, detail=8.0)
    MATS["leaves"] = mat

    mat, nt, bsdf = new_principled("Autumn_Leaves", (0.24, 0.14, 0.025), 0.82)
    add_noise_bump(nt, bsdf, scale=5.0, strength=0.25, distance=0.05, detail=8.0)
    MATS["autumn"] = mat

    mat, nt, bsdf = new_principled("Tree_Trunk", (0.055, 0.033, 0.018), 0.92)
    MATS["trunk"] = mat

    mat, nt, bsdf = new_principled("Grass", (0.075, 0.16, 0.035), 0.85)
    MATS["grass"] = mat

    # --- atmosphere ---------------------------------------------------------
    mat, nt, out = new_material("Atmospheric_Haze")
    vol = nt.nodes.new("ShaderNodeVolumePrincipled")
    vol.location = (300, 0)
    set_socket(vol, "Color", (0.65, 0.76, 0.92, 1.0))
    set_socket(vol, "Density", 0.00020)
    set_socket(vol, "Anisotropy", 0.42)
    nt.links.new(vol.outputs["Volume"], out.inputs["Volume"])
    MATS["haze"] = mat


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
    bmesh.ops.scale(
        bm, vec=Vector((size[0], size[1], size[2])), verts=list(bm.verts)
    )
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
    width = size_y if size_y is not None else thickness
    obj = add_box(
        name,
        (start + end) * 0.5,
        (thickness, width, length),
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
# WORLD, SKY, LIGHTING
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
        ("altitude", 2200.0),
        ("air_density", 1.15),
        ("aerosol_density", 1.9),
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
    world = bpy.data.worlds.new("Himalaya_Sky")
    scene.world = world
    world.use_nodes = True
    nt = world.node_tree
    for node in list(nt.nodes):
        nt.nodes.remove(node)

    out = nt.nodes.new("ShaderNodeOutputWorld")
    out.location = (700, 0)
    bg = nt.nodes.new("ShaderNodeBackground")
    bg.location = (450, 0)
    bg.inputs["Strength"].default_value = 0.13
    nt.links.new(bg.outputs["Background"], out.inputs["Surface"])

    sky = nt.nodes.new("ShaderNodeTexSky")
    sky.location = (-150, 150)
    configure_sky(sky, 24.0, 128.0)

    tc = nt.nodes.new("ShaderNodeTexCoord")
    tc.location = (-850, -200)
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.location = (-650, -200)
    set_socket(noise, "Scale", 1.35)
    set_socket(noise, "Detail", 12.0)
    set_socket(noise, "Roughness", 0.58)
    set_socket(noise, "Distortion", 0.45)
    nt.links.new(tc.outputs["Generated"], noise.inputs["Vector"])
    cloud_ramp = add_ramp(
        nt,
        [(0.48, (0.0, 0.0, 0.0)), (0.63, (1.0, 1.0, 1.0))],
        (-430, -200),
    )
    nt.links.new(noise.outputs["Fac"], cloud_ramp.inputs["Fac"])

    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    sep.location = (-650, -480)
    nt.links.new(tc.outputs["Generated"], sep.inputs["Vector"])
    height = nt.nodes.new("ShaderNodeMapRange")
    height.location = (-430, -480)
    height.inputs["From Min"].default_value = 0.02
    height.inputs["From Max"].default_value = 0.55
    height.inputs["To Min"].default_value = 0.0
    height.inputs["To Max"].default_value = 1.0
    nt.links.new(sep.outputs["Z"], height.inputs["Value"])
    cloudmask = nt.nodes.new("ShaderNodeMath")
    cloudmask.operation = "MULTIPLY"
    cloudmask.location = (-180, -300)
    nt.links.new(cloud_ramp.outputs["Color"], cloudmask.inputs[0])
    nt.links.new(height.outputs["Result"], cloudmask.inputs[1])

    mix, fac, col_a, col_b, mix_out = new_mix_color(nt, (150, 50), "MIX")
    nt.links.new(sky.outputs["Color"], col_a)
    col_b.default_value = (0.86, 0.89, 0.94, 1.0)
    nt.links.new(cloudmask.outputs[0], fac)
    nt.links.new(mix_out, bg.inputs["Color"])

    # Low-lying atmospheric haze volume (a large box the camera sits inside).
    haze = add_box(
        "Atmosphere_Haze",
        (0.0, 250.0, 130.0),
        (2500.0, 2600.0, 520.0),
        MATS["haze"],
        COL["Lighting"],
        bevel=0.0,
    )
    haze.display_type = "BOUNDS"


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
    key = add_sun(
        "Sun_Key",
        (-360.0, -130.0, 185.0),
        (0.0, 10.0, 24.0),
        5.0,
        (1.0, 0.88, 0.72),
        angle_deg=1.7,
        shadow=True,
    )
    key.data.name = "Sun_Key"

    fill = add_sun(
        "Sun_Fill",
        (300.0, -230.0, 180.0),
        (0.0, 0.0, 20.0),
        0.22,
        (0.62, 0.75, 1.0),
        angle_deg=18.0,
        shadow=False,
    )
    fill.data.name = "Sun_Fill"

    rim = add_sun(
        "Sun_Rim",
        (140.0, 360.0, 300.0),
        (0.0, 0.0, 24.0),
        1.1,
        (1.0, 0.86, 0.70),
        angle_deg=4.0,
        shadow=False,
    )
    rim.data.name = "Sun_Rim"

    # A soft bounce from the snowy valley floor.
    data = bpy.data.lights.new("Valley_Bounce", type="AREA")
    data.energy = 1800.0
    data.shape = "DISK"
    data.size = 70.0
    data.color = (0.72, 0.82, 1.0)
    try:
        data.use_shadow = True
    except Exception:
        pass
    bounce = bpy.data.objects.new("Valley_Bounce", data)
    COL["Lighting"].objects.link(bounce)
    bounce.location = (0.0, -25.0, 1.0)
    aim_object(bounce, (0.0, 0.0, 20.0))


# =============================================================================
# TERRAIN
# =============================================================================


def terrain_height(x, y):
    p = Vector((x, y, 0.0))
    broad = fbm(p * 0.011 + Vector((0.3, 1.7, 0.0)), 5)
    medium = fbm(p * 0.043 + Vector((5.0, 2.0, 0.0)), 4)
    r = math.hypot(x, y)
    rise = 13.0 * smoothstep(55.0, 210.0, r) * (0.55 + 0.45 * broad)
    ridge = 2.0 * ridged(p * 0.008 + Vector((9.0, 4.0, 0.0)), 4)
    h = 1.7 * broad + 0.45 * medium + rise + ridge * smoothstep(45.0, 130.0, r)
    # keep the immediate approach calm
    h *= 0.25 + 0.75 * smoothstep(18.0, 55.0, math.hypot(x, y + 12.0))
    return h


def terrain_color(x, y, z, normal_z):
    p = Vector((x, y, z))
    n = fbm(p * 0.06 + Vector((1.0, 2.0, 3.0)), 4) * 0.5 + 0.5
    n2 = fbm(p * 0.25 + Vector((4.0, 1.0, 2.0)), 3) * 0.5 + 0.5
    grass_a = (0.035, 0.075, 0.018)
    grass_b = (0.095, 0.155, 0.040)
    grass = mix3(grass_a, grass_b, n)
    rock = (0.15, 0.14, 0.12)
    dirt = (0.14, 0.105, 0.065)
    slope = smoothstep(0.62, 0.92, normal_z)
    color = mix3(rock, grass, slope)
    color = mix3(color, dirt, 0.22 * n2)
    snow = smoothstep(11.0, 18.0, z) * smoothstep(0.6, 0.95, normal_z)
    color = mix3(color, (0.82, 0.86, 0.92), snow * 0.65)
    return color


def build_terrain():
    size = 2600.0
    segments = 200
    verts = []
    for j in range(segments + 1):
        y = (j / segments - 0.5) * size
        for i in range(segments + 1):
            x = (i / segments - 0.5) * size
            verts.append((x, y, terrain_height(x, y)))
    faces = []
    for j in range(segments):
        for i in range(segments):
            a = j * (segments + 1) + i
            faces.append((a, a + 1, a + segments + 2, a + segments + 1))
    obj = add_mesh_object(
        "Valley_Floor", verts, faces, MATS["terrain"], COL["Terrain"], smooth=True
    )
    mesh = obj.data
    nz = mesh_normal_z(mesh)
    colors = []
    for i, v in enumerate(mesh.vertices):
        colors.append(terrain_color(v.co.x, v.co.y, v.co.z, nz[i]))
    add_color_attribute(mesh, "GroundColor", colors)

    # --- rocky outcrop under the monastery --------------------------------
    build_plateau()

    # --- stone staircase --------------------------------------------------
    build_stairs()

    # --- stone path leading to the stairs ---------------------------------
    build_path()

    # --- small stupa and lanterns ----------------------------------------
    build_stupa(16.5, -23.5)
    build_lantern(-5.4, -35.0)
    build_lantern(5.4, -35.0)


def build_plateau():
    segments = 56
    rings = 10
    verts = []
    top_z = PLATFORM_Z
    bottom_z = -6.0

    def top_radius(theta):
        return PLATFORM_R + 2.2 * fbm(
            Vector((math.cos(theta) * 1.7, math.sin(theta) * 1.7, 3.1)), 4
        )

    for k in range(rings + 1):
        t = k / rings
        z = lerp(top_z, bottom_z, t ** 1.1)
        for s in range(segments):
            theta = TAU * s / segments
            base_r = top_radius(theta)
            r = base_r * (1.0 + 0.24 * t) * (
                1.0 + 0.16 * fbm(
                    Vector(
                        (
                            math.cos(theta) * 3.0 + 12.0,
                            math.sin(theta) * 3.0 + t * 4.0,
                            7.0,
                        )
                    ),
                    3,
                )
            )
            x = math.cos(theta) * r
            y = math.sin(theta) * r
            zz = z + (0.4 * t + 0.08) * fbm(
                Vector((x * 0.12, y * 0.12, 9.0)), 3
            )
            verts.append((x, y, zz))

    faces = []
    for k in range(rings):
        for s in range(segments):
            a = k * segments + s
            b = k * segments + (s + 1) % segments
            c = (k + 1) * segments + (s + 1) % segments
            d = (k + 1) * segments + s
            faces.append((a, b, c, d))

    # close the top with a shallow dome so the plateau does not look hollow
    center_index = len(verts)
    verts.append((0.0, 0.0, top_z + 0.08))
    for s in range(segments):
        faces.append((center_index, s, (s + 1) % segments))

    # bottom cap (faces downward)
    bottom_center = len(verts)
    verts.append((0.0, 0.0, bottom_z))
    last = rings * segments
    for s in range(segments):
        faces.append(
            (
                bottom_center,
                last + (s + 1) % segments,
                last + s,
            )
        )

    obj = add_mesh_object(
        "Monastery_Cliff",
        verts,
        faces,
        MATS["rock"],
        COL["Terrain"],
        smooth=False,
    )
    obj.data.materials[0] = MATS["rock"]

    # A lighter rocky top slab.
    add_cylinder(
        "Cliff_Top",
        (0.0, 0.0, PLATFORM_Z - 0.25),
        PLATFORM_R + 0.4,
        0.5,
        MATS["rock"],
        COL["Terrain"],
        segments=56,
        smooth=False,
        radius_top=PLATFORM_R + 0.6,
    )

    # --- low stone retaining wall around the top --------------------------
    segments = 34
    gap_lo, gap_hi = -1.78, -1.36
    for i in range(segments):
        a0 = TAU * i / segments
        a1 = TAU * (i + 1) / segments
        mid = (a0 + a1) * 0.5
        if gap_lo < mid < gap_hi:
            continue
        radius = PLATFORM_R - 0.45
        length = (TAU / segments) * radius * 1.08
        x = math.cos(mid) * radius
        y = math.sin(mid) * radius
        wall_h = 0.9 + 0.28 * (fbm(Vector((x * 0.35, y * 0.35, 11.0)), 3) * 0.5 + 0.5)
        add_box(
            f"Retaining_Wall_{i:02d}",
            (x, y, PLATFORM_Z + wall_h * 0.5),
            (length, 0.95, wall_h),
            MATS["stone_wall"],
            COL["Terrain"],
            rotation=(0.0, 0.0, mid + math.pi * 0.5),
            bevel=0.03,
            smooth=False,
        )
        add_box(
            f"Retaining_Cap_{i:02d}",
            (x, y, PLATFORM_Z + wall_h + 0.09),
            (length * 1.02, 1.12, 0.18),
            MATS["stone"],
            COL["Terrain"],
            rotation=(0.0, 0.0, mid + math.pi * 0.5),
            bevel=0.02,
        )
        # rough boulders breaking up the parapet line
        if i % 5 == 2:
            add_icosphere(
                f"Wall_Boulder_{i}",
                (x + rng.uniform(-0.5, 0.5), y + rng.uniform(-0.5, 0.5), PLATFORM_Z + wall_h + 0.25),
                rng.uniform(0.35, 0.8),
                MATS["rock"],
                COL["Terrain"],
                scale=(1.3, 1.0, 0.7),
                subdivisions=1,
                smooth=False,
            )


def build_stairs():
    width = 6.4
    bottom_y = -32.0
    top_y = -18.0
    bottom_z = 1.2
    steps = 16
    rise = (PLATFORM_Z - bottom_z) / steps
    run = (top_y - bottom_y) / steps

    for i in range(steps):
        y = bottom_y + run * (i + 0.5)
        top = bottom_z + rise * (i + 1)
        height = top - (bottom_z - 0.8)
        add_box(
            f"Stair_Block_{i:02d}",
            (0.0, y, (bottom_z - 0.8) + height * 0.5),
            (width, run + 0.04, height),
            MATS["stone"],
            COL["Terrain"],
            bevel=0.015,
        )
        add_box(
            f"Stair_Tread_{i:02d}",
            (0.0, y, top - 0.07),
            (width + 0.45, run + 0.18, 0.16),
            MATS["path"],
            COL["Terrain"],
            bevel=0.025,
        )

    # side parapets
    slope = math.atan2(PLATFORM_Z - bottom_z, top_y - bottom_y)
    center_y = (bottom_y + top_y) * 0.5
    center_z = (bottom_z + PLATFORM_Z) * 0.5 + 0.55
    length = math.hypot(top_y - bottom_y, PLATFORM_Z - bottom_z) + 1.2
    for side in (-1, 1):
        add_box(
            f"Stair_Parapet_{'L' if side < 0 else 'R'}",
            (side * (width * 0.5 + 0.55), center_y, center_z),
            (1.0, length, 1.2),
            MATS["stone_wall"],
            COL["Terrain"],
            rotation=(slope, 0.0, 0.0),
            bevel=0.03,
        )
        add_box(
            f"Stair_Parapet_Cap_{'L' if side < 0 else 'R'}",
            (side * (width * 0.5 + 0.55), center_y, center_z + 0.68),
            (1.25, length, 0.18),
            MATS["stone"],
            COL["Terrain"],
            rotation=(slope, 0.0, 0.0),
            bevel=0.02,
        )

    add_box(
        "Stair_Landing",
        (0.0, bottom_y - 1.7, 0.55),
        (9.5, 4.0, 1.1),
        MATS["stone"],
        COL["Terrain"],
        bevel=0.04,
    )


def build_path():
    steps = 26
    for i in range(steps):
        t = i / (steps - 1)
        y = -35.0 - t * 24.0
        x = 1.2 * math.sin(t * 3.4) + 0.4 * math.sin(t * 9.0)
        z = terrain_height(x, y)
        add_box(
            f"Path_Slab_{i:02d}",
            (x, y, z + 0.08),
            (2.5 + 1.4 * (1.0 - t), 1.15, 0.2),
            MATS["path"],
            COL["Terrain"],
            rotation=(0.0, 0.0, rng.uniform(-0.08, 0.08)),
            bevel=0.03,
        )
        for side in (-1, 1):
            if i % 2 == 0:
                add_icosphere(
                    f"Path_Edge_{i:02d}_{side}",
                    (x + side * 1.9, y + rng.uniform(-0.3, 0.3), z + 0.1),
                    rng.uniform(0.18, 0.42),
                    MATS["rock"],
                    COL["Terrain"],
                    scale=(1.2, 0.9, 0.65),
                    subdivisions=1,
                    smooth=False,
                )


def build_stupa(x, y):
    base_z = terrain_height(x, y)
    group = COL["Terrain"]
    tiers = ((4.0, 4.0, 0.55), (3.4, 3.4, 0.5), (2.8, 2.8, 0.45))
    z = base_z
    for i, (sx, sy, height) in enumerate(tiers):
        add_box(
            f"Stupa_Base_{i}",
            (x, y, z + height * 0.5),
            (sx, sy, height),
            MATS["white"],
            group,
            bevel=0.04,
        )
        z += height
    add_cylinder(
        "Stupa_Dome_Base",
        (x, y, z + 0.2),
        1.85,
        0.4,
        MATS["white"],
        group,
        segments=24,
        smooth=True,
    )
    add_icosphere(
        "Stupa_Dome",
        (x, y, z + 1.35),
        1.75,
        MATS["white"],
        group,
        scale=(1.0, 1.0, 1.08),
        subdivisions=3,
        smooth=True,
    )
    add_box(
        "Stupa_Harmika",
        (x, y, z + 2.95),
        (1.05, 1.05, 0.75),
        MATS["white"],
        group,
        bevel=0.04,
    )
    spire_z = z + 3.35
    add_cylinder(
        "Stupa_Spire",
        (x, y, spire_z + 1.35),
        0.16,
        2.7,
        MATS["gold"],
        group,
        segments=12,
    )
    for i in range(6):
        add_icosphere(
            f"Stupa_Ring_{i}",
            (x, y, spire_z + 0.35 + i * 0.35),
            0.5 - i * 0.055,
            MATS["gold"],
            group,
            scale=(1.0, 1.0, 0.16),
            subdivisions=2,
            smooth=True,
        )
    add_cone(
        "Stupa_Tip",
        (x, y, spire_z + 2.8),
        0.3,
        0.0,
        0.8,
        MATS["gold"],
        group,
        segments=12,
    )


def build_lantern(x, y):
    z = terrain_height(x, y)
    add_box(
        "Lantern_Base",
        (x, y, z + 0.2),
        (0.9, 0.9, 0.4),
        MATS["stone"],
        COL["Terrain"],
        bevel=0.03,
    )
    add_box(
        "Lantern_Pillar",
        (x, y, z + 1.0),
        (0.34, 0.34, 1.2),
        MATS["stone"],
        COL["Terrain"],
    )
    add_box(
        "Lantern_House",
        (x, y, z + 1.9),
        (0.78, 0.78, 0.65),
        MATS["stone_wall"],
        COL["Terrain"],
        bevel=0.03,
    )
    add_cone(
        "Lantern_Roof",
        (x, y, z + 2.45),
        0.64,
        0.0,
        0.5,
        MATS["stone"],
        COL["Terrain"],
        segments=4,
        rotation=(0.0, 0.0, math.pi * 0.25),
        smooth=False,
    )


# =============================================================================
# MOUNTAINS
# =============================================================================


def mountain_height_fn(seed, peaks, rings=64, segments=112):
    offset = Vector((seed * 3.71, seed * 1.93, seed * 0.77))

    def height(u, v):
        r = math.hypot(u, v)
        if r >= 1.0:
            return 0.0
        env = 1.0 - smoothstep(0.66, 1.0, r)
        ridge = ridged(Vector((u * 2.55, v * 2.55, 0.0)) + offset, 6)
        ridge2 = ridged(Vector((u * 6.1, v * 6.1, 0.0)) + offset * 0.5, 5)
        peak = 0.0
        for px, py, ph, pr in peaks:
            d = math.hypot(u - px, v - py)
            k = max(0.0, 1.0 - d / pr)
            peak = max(peak, ph * (k ** 1.35))
        h = env * (peak * (0.64 + 0.42 * ridge) + 0.22 * ridge2 * (1.0 - r))
        h += env * 0.02 * fbm(Vector((u * 9.0, v * 9.0, 1.0)) + offset, 4)
        return max(0.0, h)

    return height


def build_mountain(name, center, radius, height, peaks, snowline, seed):
    rings, segments = 64, 112
    height_fn = mountain_height_fn(seed, peaks)
    base_z = -8.0
    verts = []
    center_h = height_fn(0.0, 0.0)
    verts.append((center[0], center[1], base_z + height * center_h))
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
        name, verts, faces, MATS["mountain"], COL["Mountains"], smooth=True
    )
    mesh = obj.data
    nz = mesh_normal_z(mesh)
    max_h = max(v.co.z for v in mesh.vertices) - base_z
    max_h = max(max_h, 1.0)
    snow_values = []
    for i, v in enumerate(mesh.vertices):
        rel = (v.co.z - base_z) / max_h
        patch = 0.5 + 0.5 * fbm(Vector((v.co.x * 0.012, v.co.y * 0.012, 5.7)), 3)
        alt = smoothstep(snowline, snowline + 0.24, rel + (patch - 0.5) * 0.14)
        flatness = smoothstep(0.22, 0.68, nz[i])
        snow = clamp(alt * (0.10 + 0.90 * flatness))
        snow_values.append((snow, snow, snow))
    add_color_attribute(mesh, "SnowMask", snow_values)
    return obj


def build_mountains():
    massifs = (
        dict(
            name="Peak_Hero",
            center=(80.0, 1000.0),
            radius=480.0,
            height=350.0,
            snowline=0.48,
            seed=11,
            peaks=(
                (0.02, 0.05, 1.00, 0.62),
                (-0.42, -0.18, 0.74, 0.40),
                (0.38, -0.28, 0.66, 0.38),
                (-0.12, 0.40, 0.54, 0.34),
            ),
        ),
        dict(
            name="Peak_Left",
            center=(-520.0, 880.0),
            radius=430.0,
            height=290.0,
            snowline=0.50,
            seed=23,
            peaks=((0.08, 0.0, 1.0, 0.58), (-0.35, -0.2, 0.62, 0.34)),
        ),
        dict(
            name="Peak_Right",
            center=(560.0, 940.0),
            radius=470.0,
            height=320.0,
            snowline=0.49,
            seed=37,
            peaks=((0.0, 0.02, 1.0, 0.6), (0.3, -0.25, 0.58, 0.34)),
        ),
        dict(
            name="Peak_Far",
            center=(0.0, 1500.0),
            radius=680.0,
            height=470.0,
            snowline=0.43,
            seed=51,
            peaks=((0.0, 0.0, 1.0, 0.64), (-0.32, -0.1, 0.62, 0.32)),
        ),
        dict(
            name="Peak_BackLeft",
            center=(-1000.0, 1250.0),
            radius=600.0,
            height=360.0,
            snowline=0.46,
            seed=67,
            peaks=((0.0, 0.0, 1.0, 0.62),),
        ),
        dict(
            name="Peak_BackRight",
            center=(1000.0, 1300.0),
            radius=600.0,
            height=380.0,
            snowline=0.46,
            seed=79,
            peaks=((0.0, 0.0, 1.0, 0.62),),
        ),
        dict(
            name="Foothills_Left",
            center=(-300.0, 430.0),
            radius=180.0,
            height=90.0,
            snowline=0.7,
            seed=83,
            peaks=((0.0, 0.0, 1.0, 0.62),),
        ),
        dict(
            name="Foothills_Right",
            center=(340.0, 480.0),
            radius=200.0,
            height=105.0,
            snowline=0.68,
            seed=97,
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


# =============================================================================
# MONASTERY
# =============================================================================


def mbox(name, loc, size, mat, rotation=(0.0, 0.0, 0.0), bevel=0.0, smooth=False):
    return add_box(
        name,
        loc,
        size,
        mat,
        COL["Monastery"],
        rotation=rotation,
        bevel=bevel,
        smooth=smooth,
        parent=MONASTERY_ROOT,
    )


def mcyl(name, loc, radius, depth, mat, segments=16, rotation=(0.0, 0.0, 0.0), smooth=True):
    return add_cylinder(
        name,
        loc,
        radius,
        depth,
        mat,
        COL["Monastery"],
        segments=segments,
        rotation=rotation,
        smooth=smooth,
        parent=MONASTERY_ROOT,
    )


def mcone(name, loc, r1, r2, depth, mat, segments=12, rotation=(0.0, 0.0, 0.0), smooth=True):
    return add_cone(
        name,
        loc,
        r1,
        r2,
        depth,
        mat,
        COL["Monastery"],
        segments=segments,
        rotation=rotation,
        smooth=smooth,
        parent=MONASTERY_ROOT,
    )


def mico(name, loc, radius, mat, scale=(1.0, 1.0, 1.0), subdivisions=2, smooth=True):
    return add_icosphere(
        name,
        loc,
        radius,
        mat,
        COL["Monastery"],
        scale=scale,
        subdivisions=subdivisions,
        smooth=smooth,
        parent=MONASTERY_ROOT,
    )


def rot_offset(offset, angle):
    x, y, z = offset
    ca, sa = math.cos(angle), math.sin(angle)
    return Vector((x * ca - y * sa, x * sa + y * ca, z))


def add_window(name, center, width, height, rotz, frame_mat=None, lattice=True):
    """Build one traditional shuttered lattice window.
    Local -Y is the outward face. `rotz` orients the whole unit."""
    frame_mat = frame_mat or MATS["wood"]
    center = Vector(center)

    def place(suffix, offset, size, mat, bevel=0.0):
        loc = center + rot_offset(offset, rotz)
        return mbox(
            f"{name}_{suffix}",
            loc,
            size,
            mat,
            rotation=(0.0, 0.0, rotz),
            bevel=bevel,
        )

    # dark recessed opening
    place("glass", (0.0, -0.035, 0.0), (width, 0.1, height), MATS["glass"])
    # frame
    place("frame_t", (0.0, 0.0, height * 0.5), (width + 0.34, 0.24, 0.18), frame_mat)
    place("frame_b", (0.0, 0.0, -height * 0.5), (width + 0.34, 0.24, 0.18), frame_mat)
    place("frame_l", (-width * 0.5, 0.0, 0.0), (0.18, 0.24, height), frame_mat)
    place("frame_r", (width * 0.5, 0.0, 0.0), (0.18, 0.24, height), frame_mat)
    # sill
    place("sill", (0.0, -0.18, -height * 0.5 - 0.12), (width + 0.62, 0.55, 0.16), MATS["stone"])
    if lattice:
        bars_v = 3
        for i in range(1, bars_v):
            x = -width * 0.5 + width * i / bars_v
            place("lattice_v", (x, -0.10, 0.0), (0.045, 0.06, height * 0.94), MATS["wood_light"])
        for z in (-height * 0.22, height * 0.22):
            place("lattice_h", (0.0, -0.10, z), (width, 0.06, 0.045), MATS["wood_light"])
    # small gilded plaque above the window
    place("torana", (0.0, -0.05, height * 0.5 + 0.34), (width * 0.72, 0.12, 0.26), MATS["gold"])


def add_door():
    # stone jambs and lintel
    mbox("Door_Jamb_L", (-1.55, -5.95, 2.35), (0.4, 0.45, 4.3), MATS["stone"], bevel=0.03)
    mbox("Door_Jamb_R", (1.55, -5.95, 2.35), (0.4, 0.45, 4.3), MATS["stone"], bevel=0.03)
    mbox("Door_Lintel", (0.0, -5.95, 4.55), (3.8, 0.5, 0.42), MATS["stone"], bevel=0.03)
    # double doors
    for side in (-1, 1):
        mbox(
            f"Door_Leaf_{'L' if side < 0 else 'R'}",
            (side * 0.68, -6.14, 2.55),
            (1.28, 0.18, 3.65),
            MATS["red"],
            bevel=0.02,
        )
        # gilded studs
        for row in range(3):
            for col in range(2):
                mico(
                    f"Door_Stud_{side}_{row}_{col}",
                    (
                        side * (0.42 + col * 0.5),
                        -6.25,
                        1.65 + row * 1.0,
                    ),
                    0.045,
                    MATS["gold"],
                    subdivisions=1,
                    smooth=True,
                )
    # threshold and steps down to the platform
    mbox("Door_Threshold", (0.0, -6.35, 1.2), (4.0, 0.9, 0.22), MATS["stone"])
    for i in range(3):
        mbox(
            f"Door_Step_{i}",
            (0.0, -6.9 - i * 0.55, 0.95 - i * 0.36),
            (4.8 + i * 0.35, 0.62, 0.34),
            MATS["stone"],
            bevel=0.02,
        )
    # gilded emblem
    mico("Door_Emblem", (0.0, -6.02, 4.95), 0.5, MATS["gold"], scale=(1.0, 0.18, 1.0), subdivisions=2)
    # lantern brackets beside the entrance
    for side in (-1, 1):
        mbox(
            f"Door_Lantern_Bracket_{side}",
            (side * 2.2, -6.0, 3.6),
            (0.16, 0.8, 0.16),
            MATS["wood"],
        )
        mico(
            f"Door_Lantern_{side}",
            (side * 2.2, -6.42, 3.4),
            0.24,
            MATS["gold"],
            scale=(1.0, 1.0, 1.35),
            subdivisions=2,
        )


def add_window_rows():
    # storey 1
    for x in (-4.7, 4.7):
        add_window(f"Win_L1_F_{'L' if x < 0 else 'R'}", (x, -5.80, 4.05), 1.5, 1.9, 0.0)
    for y in (-2.6, 2.6):
        add_window(f"Win_L1_SL_{y}", (-8.05, y, 4.05), 1.4, 1.8, -math.pi * 0.5)
        add_window(f"Win_L1_SR_{y}", (8.05, y, 4.05), 1.4, 1.8, math.pi * 0.5)
    # storey 2
    for x in (-3.9, 0.0, 3.9):
        add_window(f"Win_L2_F_{x}", (x, -4.78, 8.5), 1.45, 2.0, 0.0)
    for y in (-2.2, 2.2):
        add_window(f"Win_L2_SL_{y}", (-6.55, y, 8.5), 1.3, 1.8, -math.pi * 0.5)
        add_window(f"Win_L2_SR_{y}", (6.55, y, 8.5), 1.3, 1.8, math.pi * 0.5)
    # storey 3
    for x in (-2.7, 2.7):
        add_window(f"Win_L3_F_{x}", (x, -3.55, 12.35), 1.3, 1.7, 0.0)
    for y in (-1.6, 1.6):
        add_window(f"Win_L3_SL_{y}", (-5.05, y, 12.35), 1.15, 1.6, -math.pi * 0.5)
        add_window(f"Win_L3_SR_{y}", (5.05, y, 12.35), 1.15, 1.6, math.pi * 0.5)


def pagoda_rim(w, d, theta, lift):
    ct, st = math.cos(theta), math.sin(theta)
    px = 0.5 * w * math.copysign(abs(ct) ** 0.38, ct)
    py = 0.5 * d * math.copysign(abs(st) ** 0.38, st)
    corner = (abs(ct * st) * 2.0) ** 3.0
    return px, py, corner * lift


def add_pagoda_roof(name, base_z, width, depth, rise, lift=0.55, with_finial=False):
    rings = 12
    segments = 56
    verts = []
    for k in range(rings + 1):
        t = (k / rings) * 0.945
        shrink = (1.0 - t) ** 0.88
        for s in range(segments):
            theta = TAU * s / segments
            ct, st = math.cos(theta), math.sin(theta)
            px = 0.5 * width * shrink * math.copysign(abs(ct) ** 0.38, ct)
            py = 0.5 * depth * shrink * math.copysign(abs(st) ** 0.38, st)
            corner = (abs(ct * st) * 2.0) ** 3.0
            z = base_z + rise * (t ** 1.55) + lift * corner * ((1.0 - t) ** 2)
            verts.append((px, py, z))
    faces = []
    for k in range(rings):
        for s in range(segments):
            a = k * segments + s
            b = k * segments + (s + 1) % segments
            c = (k + 1) * segments + (s + 1) % segments
            d = (k + 1) * segments + s
            faces.append((a, b, c, d))
    apex_index = len(verts)
    verts.append((0.0, 0.0, base_z + rise + 0.08))
    last = rings * segments
    for s in range(segments):
        faces.append((last + s, last + (s + 1) % segments, apex_index))

    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.validate()
    mesh.update()
    mesh.materials.append(MATS["roof"])
    for poly in mesh.polygons:
        poly.use_smooth = True
    roof = bpy.data.objects.new(name, mesh)
    COL["Monastery"].objects.link(roof)
    roof.parent = MONASTERY_ROOT

    # fascia + thin gilded trim around the eave
    trim_segments = 20
    rim = []
    for s in range(trim_segments):
        theta = TAU * s / trim_segments
        x, y, z = pagoda_rim(width, depth, theta, lift)
        rim.append((x, y, base_z + z))
    for s in range(trim_segments):
        p0 = Vector(rim[s])
        p1 = Vector(rim[(s + 1) % trim_segments])
        mid = (p0 + p1) * 0.5
        direction = p1 - p0
        angle = math.atan2(direction.y, direction.x)
        length = max(direction.length * 1.08, 0.2)
        mbox(
            f"{name}_Fascia_{s:02d}",
            (mid.x, mid.y, mid.z + 0.06),
            (length, 0.34, 0.4),
            MATS["wood"],
            rotation=(0.0, 0.0, angle),
        )
        mbox(
            f"{name}_GoldTrim_{s:02d}",
            (mid.x, mid.y, mid.z + 0.3),
            (length * 0.98, 0.2, 0.1),
            MATS["gold"],
            rotation=(0.0, 0.0, angle),
        )

    # rafters below the eaves
    rafters = 14
    for s in range(rafters):
        theta = TAU * s / rafters + 0.08
        x, y, z = pagoda_rim(width * 0.92, depth * 0.92, theta, lift)
        outer = Vector((x, y, base_z + z - 0.18))
        inner = outer * 0.45
        inner.z = base_z + 0.55
        add_beam_between(
            f"{name}_Rafter_{s:02d}",
            inner,
            outer,
            0.14,
            MATS["wood"],
            COL["Monastery"],
            parent=MONASTERY_ROOT,
        )

    # gilded hip ridges + corner ornaments
    apex = Vector((0.0, 0.0, base_z + rise + 0.1))
    for i, deg in enumerate((45.0, 135.0, 225.0, 315.0)):
        theta = math.radians(deg)
        x, y, z = pagoda_rim(width, depth, theta, lift)
        corner = Vector((x, y, base_z + z))
        add_beam_between(
            f"{name}_HipRidge_{i}",
            corner,
            apex,
            0.1,
            MATS["gold"],
            COL["Monastery"],
            parent=MONASTERY_ROOT,
        )
        mico(
            f"{name}_CornerJewel_{i}",
            (x * 1.02, y * 1.02, base_z + z + 0.16),
            0.18,
            MATS["gold"],
            subdivisions=1,
            smooth=True,
        )
        mcone(
            f"{name}_CornerSpike_{i}",
            (x * 1.02, y * 1.02, base_z + z + 0.5),
            0.12,
            0.0,
            0.6,
            MATS["gold"],
            segments=8,
            rotation=(0.0, 0.0, 0.0),
        )

    if with_finial:
        add_finial(base_z + rise + 0.05)
    return roof


def add_finial(top_z):
    mcyl("Finial_Stem", (0.0, 0.0, top_z + 1.35), 0.13, 2.7, MATS["gold"], segments=12)
    mcyl("Finial_Base", (0.0, 0.0, top_z + 0.2), 0.55, 0.4, MATS["gold"], segments=16)
    for i, radius in enumerate((0.62, 0.52, 0.42, 0.32)):
        mico(
            f"Finial_Ring_{i}",
            (0.0, 0.0, top_z + 0.55 + i * 0.45),
            radius,
            MATS["gold"],
            scale=(1.0, 1.0, 0.22),
            subdivisions=2,
        )
    mico("Finial_Sun", (0.0, 0.0, top_z + 2.45), 0.36, MATS["gold"], subdivisions=2)
    mcone("Finial_Tip", (0.0, 0.0, top_z + 3.05), 0.24, 0.0, 0.85, MATS["gold"], segments=12)


def add_horizontal_band(name, z, width, depth, height, mat):
    mbox(f"{name}_F", (0.0, -depth * 0.5 - 0.04, z), (width + 0.3, 0.22, height), mat)
    mbox(f"{name}_B", (0.0, depth * 0.5 + 0.04, z), (width + 0.3, 0.22, height), mat)
    mbox(f"{name}_L", (-width * 0.5 - 0.04, 0.0, z), (0.22, depth + 0.3, height), mat)
    mbox(f"{name}_R", (width * 0.5 + 0.04, 0.0, z), (0.22, depth + 0.3, height), mat)


def add_vertical_post(name, x, y, z, height, size=0.26):
    mbox(name, (x, y, z), (size, size, height), MATS["wood"], bevel=0.015)


def add_balcony():
    z = 8.9
    width = 10.8
    depth = 1.9
    front_y = -4.75 - depth * 0.5
    mbox("Balcony_Floor", (0.0, front_y, z), (width, depth, 0.26), MATS["wood_light"], bevel=0.02)
    mbox("Balcony_Fascia", (0.0, front_y - depth * 0.5, z - 0.18), (width, 0.18, 0.34), MATS["wood"])
    # brackets
    for x in (-4.4, -2.2, 0.0, 2.2, 4.4):
        add_beam_between(
            f"Balcony_Bracket_{x}",
            (x, -4.75, z - 1.1),
            (x, front_y - depth * 0.35, z - 0.15),
            0.16,
            MATS["wood"],
            COL["Monastery"],
            parent=MONASTERY_ROOT,
        )
    # railing posts
    count = 9
    for i in range(count):
        x = -width * 0.5 + width * i / (count - 1)
        mbox(
            f"Balcony_Post_{i}",
            (x, front_y - depth * 0.42, z + 0.65),
            (0.14, 0.14, 1.3),
            MATS["wood"],
        )
    mbox(
        "Balcony_Handrail",
        (0.0, front_y - depth * 0.42, z + 1.27),
        (width, 0.16, 0.15),
        MATS["wood_light"],
    )
    mbox(
        "Balcony_Midrail",
        (0.0, front_y - depth * 0.42, z + 0.68),
        (width, 0.1, 0.1),
        MATS["wood"],
    )
    # lattice below the handrail
    for i in range(count - 1):
        x = -width * 0.5 + width * (i + 0.5) / (count - 1)
        mbox(
            f"Balcony_Lattice_{i}",
            (x, front_y - depth * 0.42, z + 0.93),
            (width / (count - 1) * 0.72, 0.06, 0.5),
            MATS["wood_light"],
        )


def add_prayer_wheel_row():
    z = 1.86
    y = -6.72
    xs = (-8.3, -6.7, -5.1, -3.5, 3.5, 5.1, 6.7, 8.3)
    mbox("PrayerWheel_Rail_Top", (0.0, y, 2.58), (17.2, 0.26, 0.16), MATS["wood"])
    mbox("PrayerWheel_Rail_Bottom", (0.0, y, 1.2), (17.2, 0.26, 0.16), MATS["wood"])
    for i, x in enumerate(xs):
        mcyl(
            f"PrayerWheel_{i}",
            (x, y, z),
            0.28,
            0.95,
            MATS["gold"],
            segments=14,
            smooth=True,
        )
        mcyl(
            f"PrayerWheel_Cap_{i}",
            (x, y, z + 0.52),
            0.34,
            0.08,
            MATS["gold"],
            segments=14,
            smooth=True,
        )


def build_monastery():
    global MONASTERY_ROOT
    MONASTERY_ROOT = bpy.data.objects.new("Monastery_Root", None)
    MONASTERY_ROOT.empty_display_type = "PLAIN_AXES"
    MONASTERY_ROOT.empty_display_size = 3.0
    MONASTERY_ROOT.location = (0.0, 0.0, PLATFORM_Z)
    COL["Monastery"].objects.link(MONASTERY_ROOT)

    # stone plinth -----------------------------------------------------------------
    mbox("Plinth", (0.0, 0.0, 0.62), (19.0, 15.0, 1.24), MATS["stone_wall"], bevel=0.05)
    mbox("Plinth_Top", (0.0, 0.0, 1.28), (19.6, 15.6, 0.18), MATS["stone"], bevel=0.02)
    mbox("Plinth_Step_Front", (0.0, -8.0, 0.85), (8.0, 1.2, 0.35), MATS["stone"], bevel=0.02)

    # storey 1: deep red walls -----------------------------------------------------
    mbox("L1_Walls", (0.0, 0.0, 1.2 + 2.6), (16.0, 11.5, 5.2), MATS["red"], bevel=0.05)
    add_horizontal_band("L1_Beam_Base", 1.55, 16.0, 11.5, 0.38, MATS["wood"])
    add_horizontal_band("L1_Beam_Mid", 3.9, 16.0, 11.5, 0.22, MATS["wood"])
    add_horizontal_band("L1_Beam_Top", 6.18, 16.0, 11.5, 0.42, MATS["wood"])
    for x in (-8.05, -5.35, -2.65, 2.65, 5.35, 8.05):
        add_vertical_post(f"L1_Post_F_{x}", x, -5.87, 3.8, 4.9)
    for y in (-5.6, -2.8, 0.0, 2.8, 5.6):
        add_vertical_post(f"L1_Post_L_{y}", -8.07, y, 3.8, 4.9)
        add_vertical_post(f"L1_Post_R_{y}", 8.07, y, 3.8, 4.9)
    for x in (-8.0, 8.0):
        for y in (-5.75, 5.75):
            mbox(
                f"L1_CornerPost_{x}_{y}",
                (x, y, 3.8),
                (0.42, 0.42, 5.1),
                MATS["wood"],
                bevel=0.01,
            )

    # storey 2: whitewashed upper storey ------------------------------------------
    mbox("L2_Walls", (0.0, 0.0, 6.4 + 2.1), (13.0, 9.5, 4.2), MATS["white"], bevel=0.05)
    add_horizontal_band("L2_Beam_Base", 6.62, 13.0, 9.5, 0.34, MATS["wood"])
    add_horizontal_band("L2_Beam_Mid", 8.75, 13.0, 9.5, 0.2, MATS["wood"])
    add_horizontal_band("L2_Beam_Top", 10.35, 13.0, 9.5, 0.46, MATS["wood"])
    add_horizontal_band("L2_Red_Band", 10.08, 13.05, 9.55, 0.4, MATS["red"])
    for x in (-6.55, -3.25, 0.0, 3.25, 6.55):
        add_vertical_post(f"L2_Post_F_{x}", x, -4.82, 8.5, 3.8)
    for y in (-4.6, -2.3, 0.0, 2.3, 4.6):
        add_vertical_post(f"L2_Post_L_{y}", -6.57, y, 8.5, 3.8)
        add_vertical_post(f"L2_Post_R_{y}", 6.57, y, 8.5, 3.8)

    # storey 3: red lantern storey ------------------------------------------------
    mbox("L3_Walls", (0.0, 0.0, 10.6 + 1.7), (10.0, 7.0, 3.4), MATS["red"], bevel=0.05)
    add_horizontal_band("L3_Beam_Base", 10.82, 10.0, 7.0, 0.32, MATS["wood"])
    add_horizontal_band("L3_Beam_Top", 13.8, 10.0, 7.0, 0.4, MATS["wood"])
    for x in (-5.0, 0.0, 5.0):
        add_vertical_post(f"L3_Post_F_{x}", x, -3.57, 12.3, 3.0)
    for y in (-3.5, 0.0, 3.5):
        add_vertical_post(f"L3_Post_L_{y}", -5.07, y, 12.3, 3.0)
        add_vertical_post(f"L3_Post_R_{y}", 5.07, y, 12.3, 3.0)

    # roofs ------------------------------------------------------------------------
    add_pagoda_roof("Roof_Tier_1", 6.35, 21.5, 16.5, 3.05, lift=0.9)
    add_pagoda_roof("Roof_Tier_2", 10.55, 18.0, 13.8, 2.65, lift=0.8)
    add_pagoda_roof("Roof_Tier_3", 13.95, 15.0, 11.8, 4.0, lift=1.0, with_finial=True)

    # windows, door, balcony, prayer wheels ---------------------------------------
    add_door()
    add_window_rows()
    add_balcony()
    add_prayer_wheel_row()

    # eaves brackets that visually tie the roofs to the walls ---------------------
    for tier, (z, w, d) in enumerate(
        ((6.4, 21.5, 16.5), (10.6, 18.0, 13.8), (14.0, 15.0, 11.8))
    ):
        count = 12 if tier < 2 else 10
        for i in range(count):
            theta = TAU * i / count + 0.13
            x, y, corner_lift = pagoda_rim(w * 0.93, d * 0.93, theta, 0.0)
            add_beam_between(
                f"Eave_Bracket_{tier}_{i}",
                (x * 0.72, y * 0.72, z - 1.3),
                (x, y, z - 0.1),
                0.15,
                MATS["wood"],
                COL["Monastery"],
                parent=MONASTERY_ROOT,
            )

    # golden victory banners on the front corners --------------------------------
    for side in (-1, 1):
        mcyl(
            f"Banner_Pole_{side}",
            (side * 8.3, -5.9, 7.3),
            0.05,
            2.2,
            MATS["gold"],
            segments=8,
            smooth=True,
        )
        mbox(
            f"Banner_Cloth_{side}",
            (side * 8.3, -6.0, 7.9),
            (0.7, 0.05, 1.1),
            MATS["Flag_Yellow"],
            rotation=(0.0, 0.0, 0.0),
        )

    # gilded medallions to catch the sun -----------------------------------------
    for x in (-7.0, 7.0):
        mico(
            "Wall_Medallion",
            (x, -5.83, 5.55),
            0.42,
            MATS["gold"],
            scale=(1.0, 0.2, 1.0),
            subdivisions=2,
        )

    return MONASTERY_ROOT


# =============================================================================
# PRAYER FLAGS
# =============================================================================


FLAG_MATERIALS = ("Flag_Blue", "Flag_White", "Flag_Red", "Flag_Green", "Flag_Yellow")


def catenary_point(p0, p1, sag, t):
    p = p0.lerp(p1, t)
    p.z -= sag * 4.0 * t * (1.0 - t)
    return p


def add_flag_line(name, p0, p1, sag, count, seed_offset=0):
    p0 = Vector(p0)
    p1 = Vector(p1)
    # rope
    curve = bpy.data.curves.new(f"{name}_Rope", "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 4
    curve.bevel_depth = 0.022
    curve.bevel_resolution = 2
    spline = curve.splines.new("POLY")
    rope_points = 28
    spline.points.add(rope_points - 1)
    for i in range(rope_points):
        t = i / (rope_points - 1)
        p = catenary_point(p0, p1, sag, t)
        spline.points[i].co = (p.x, p.y, p.z, 1.0)
    rope = bpy.data.objects.new(f"{name}_Rope", curve)
    COL["Prayer_Flags"].objects.link(rope)
    curve.materials.append(MATS["rope"])

    # flags
    verts = []
    faces = []
    material_indices = []
    flag_width = 0.54
    flag_height = 0.44
    horizontal = Vector((p1.x - p0.x, p1.y - p0.y, 0.0))
    if horizontal.length < 1e-5:
        horizontal = Vector((1.0, 0.0, 0.0))
    horizontal.normalize()
    normal = horizontal.cross(Vector((0.0, 0.0, 1.0))).normalized()

    cols = 3
    rows = 4
    for i in range(count):
        t = (i + 0.5) / count
        center = catenary_point(p0, p1, sag, t)
        color_index = (i + seed_offset) % len(FLAG_MATERIALS)
        base = len(verts)
        for iv in range(rows + 1):
            v = iv / rows
            for iu in range(cols + 1):
                u = iu / cols
                offset_h = (u - 0.5) * flag_width
                sway = math.sin(u * math.pi) * math.sin(v * math.pi * 1.35) * 0.14
                flutter = math.sin(t * 21.0 + u * 5.0 + iv * 1.3) * 0.035 * v
                pos = (
                    center
                    + horizontal * offset_h
                    + normal * (sway + flutter)
                    + Vector((0.0, 0.0, -v * flag_height))
                )
                pos.z += 0.04 * math.sin(u * math.pi) * (1.0 - v)
                verts.append((pos.x, pos.y, pos.z))
        for iv in range(rows):
            for iu in range(cols):
                a = base + iv * (cols + 1) + iu
                b = a + 1
                c = a + (cols + 1) + 1
                d = a + (cols + 1)
                faces.append((a, b, c, d))
                material_indices.append(color_index)

    mesh = bpy.data.meshes.new(f"{name}_Flags")
    mesh.from_pydata(verts, [], faces)
    mesh.validate()
    mesh.update()
    for mat_name in FLAG_MATERIALS:
        mesh.materials.append(MATS[mat_name])
    for poly, mi in zip(mesh.polygons, material_indices):
        poly.material_index = mi
        poly.use_smooth = True
    flags = bpy.data.objects.new(f"{name}_Flags", mesh)
    COL["Prayer_Flags"].objects.link(flags)
    return flags


def add_pole(name, base, height, radius=0.16):
    x, y, z = base
    add_cylinder(
        name,
        (x, y, z + height * 0.5),
        radius,
        height,
        MATS["wood"],
        COL["Prayer_Flags"],
        segments=10,
        smooth=True,
        radius_top=radius * 0.72,
    )
    add_cylinder(
        f"{name}_Base",
        (x, y, z + 0.18),
        radius * 2.6,
        0.36,
        MATS["stone"],
        COL["Prayer_Flags"],
        segments=10,
        smooth=False,
    )
    add_icosphere(
        f"{name}_Cap",
        (x, y, z + height + 0.12),
        0.24,
        MATS["gold"],
        COL["Prayer_Flags"],
        subdivisions=2,
        smooth=True,
    )
    add_cone(
        f"{name}_Tip",
        (x, y, z + height + 0.5),
        0.16,
        0.0,
        0.55,
        MATS["gold"],
        COL["Prayer_Flags"],
        segments=8,
    )
    return (x, y, z + height)


def build_prayer_flags():
    # front poles on the platform
    left_top = add_pole("Pole_Front_L", (-15.4, -10.5, PLATFORM_Z), 12.5)
    right_top = add_pole("Pole_Front_R", (15.4, -10.5, PLATFORM_Z), 12.5)

    # lower poles flanking the stairs
    stair_left_z = terrain_height(-17.0, -28.0)
    stair_right_z = terrain_height(17.0, -28.0)
    stair_left_top = add_pole("Pole_Stair_L", (-17.0, -28.0, stair_left_z), 9.0, radius=0.14)
    stair_right_top = add_pole("Pole_Stair_R", (17.0, -28.0, stair_right_z), 9.0, radius=0.14)

    # roof anchors (local-to-world conversion for the monastery root)
    roof_left = Vector((-8.2, -6.2, PLATFORM_Z + 10.6))
    roof_right = Vector((8.2, -6.2, PLATFORM_Z + 10.6))

    add_flag_line("Flags_Roof_L", roof_left, left_top, 1.1, 16, 0)
    add_flag_line("Flags_Roof_R", roof_right, right_top, 1.1, 16, 2)
    add_flag_line("Flags_Front", left_top, right_top, 1.5, 26, 0)
    add_flag_line("Flags_Stair_L", left_top, stair_left_top, 1.2, 18, 1)
    add_flag_line("Flags_Stair_R", right_top, stair_right_top, 1.2, 18, 3)


# =============================================================================
# VEGETATION AND ROCKS
# =============================================================================


def _tag_new_faces(bm, previous_face_count, material_index):
    bm.faces.ensure_lookup_table()
    for i in range(previous_face_count, len(bm.faces)):
        bm.faces[i].material_index = material_index


def make_pine_mesh(index):
    bm = bmesh.new()
    randomizer = random.Random(SEED + index * 97)

    # trunk
    bmesh.ops.create_cone(
        bm,
        cap_ends=True,
        cap_tris=False,
        segments=8,
        radius1=0.24,
        radius2=0.1,
        depth=3.4,
        matrix=Matrix.Translation((0.0, 0.0, 1.7)),
    )
    for face in bm.faces:
        face.material_index = 0

    layer_count = 9
    for layer in range(layer_count):
        base = 1.65 + layer * 0.98
        fraction = layer / max(layer_count - 1, 1)
        radius = (2.55 - 2.05 * fraction) * randomizer.uniform(0.88, 1.12)
        height = 2.25 - 0.28 * fraction
        jitter_x = randomizer.uniform(-0.14, 0.14)
        jitter_y = randomizer.uniform(-0.14, 0.14)
        tilt = randomizer.uniform(-0.04, 0.04)
        before = len(bm.faces)
        bmesh.ops.create_cone(
            bm,
            cap_ends=True,
            cap_tris=True,
            segments=9,
            radius1=radius,
            radius2=0.02,
            depth=height,
            matrix=Matrix.Translation((jitter_x, jitter_y, base + height * 0.5))
            @ Matrix.Rotation(tilt, 4, "X")
            @ Matrix.Rotation(randomizer.uniform(0.0, TAU), 4, "Z"),
        )
        _tag_new_faces(bm, before, 1)

    mesh = bpy.data.meshes.new(f"Pine_Mesh_{index}")
    bm.to_mesh(mesh)
    bm.free()
    mesh.materials.append(MATS["trunk"])
    mesh.materials.append(MATS["pine"])
    for poly in mesh.polygons:
        poly.use_smooth = True
    return mesh


def make_deciduous_mesh(index):
    bm = bmesh.new()
    randomizer = random.Random(SEED + 500 + index * 43)
    bmesh.ops.create_cone(
        bm,
        cap_ends=True,
        cap_tris=False,
        segments=8,
        radius1=0.3,
        radius2=0.16,
        depth=3.2,
        matrix=Matrix.Translation((0.0, 0.0, 1.6)),
    )
    for face in bm.faces:
        face.material_index = 0
    for blob in range(4):
        center = (
            randomizer.uniform(-1.15, 1.15),
            randomizer.uniform(-1.15, 1.15),
            randomizer.uniform(3.0, 4.7),
        )
        radius = randomizer.uniform(1.15, 1.75)
        before = len(bm.faces)
        try:
            bmesh.ops.create_icosphere(
                bm,
                subdivisions=2,
                radius=radius,
                matrix=Matrix.Translation(center)
                @ Matrix.Scale(randomizer.uniform(0.85, 1.15), 4),
            )
        except TypeError:
            bmesh.ops.create_icosphere(
                bm,
                subdivisions=2,
                diameter=radius * 2.0,
                matrix=Matrix.Translation(center),
            )
        _tag_new_faces(bm, before, 1)

    mesh = bpy.data.meshes.new(f"Deciduous_Mesh_{index}")
    bm.to_mesh(mesh)
    bm.free()
    mesh.materials.append(MATS["trunk"])
    mesh.materials.append(MATS["leaves"])
    for poly in mesh.polygons:
        poly.use_smooth = True
    return mesh


def make_rock_mesh(index):
    bm = bmesh.new()
    randomizer = random.Random(SEED + 900 + index * 31)
    _icosphere(bm, 2, 1.0)
    offset = Vector(
        (randomizer.uniform(-5, 5), randomizer.uniform(-5, 5), randomizer.uniform(-5, 5))
    )
    for v in bm.verts:
        n = mnoise.noise(v.co * 1.7 + offset)
        v.co *= 1.0 + 0.28 * n
        v.co.z *= randomizer.uniform(0.55, 0.8)
    mesh = bpy.data.meshes.new(f"Rock_Mesh_{index}")
    bm.to_mesh(mesh)
    bm.free()
    mesh.materials.append(MATS["rock"])
    for poly in mesh.polygons:
        poly.use_smooth = False
    return mesh


def make_grass_mesh(index):
    bm = bmesh.new()
    randomizer = random.Random(SEED + 1300 + index * 17)
    for blade in range(6):
        angle = randomizer.uniform(0.0, TAU)
        radius = randomizer.uniform(0.01, 0.14)
        height = randomizer.uniform(0.3, 0.8)
        x = math.cos(angle) * radius
        y = math.sin(angle) * radius
        bmesh.ops.create_cone(
            bm,
            cap_ends=False,
            cap_tris=False,
            segments=4,
            radius1=0.035,
            radius2=0.0,
            depth=height,
            matrix=Matrix.Translation((x, y, height * 0.5))
            @ Matrix.Rotation(randomizer.uniform(-0.3, 0.3), 4, "X"),
        )
    mesh = bpy.data.meshes.new(f"Grass_Mesh_{index}")
    bm.to_mesh(mesh)
    bm.free()
    mesh.materials.append(MATS["grass"])
    for poly in mesh.polygons:
        poly.use_smooth = True
    return mesh


def instance_mesh(name, mesh, location, scale, rotation_z, collection, scale_z=None):
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    obj.location = Vector(location)
    if scale_z is None:
        obj.scale = (scale, scale, scale)
    else:
        obj.scale = (scale, scale, scale_z)
    obj.rotation_euler = (0.0, 0.0, rotation_z)
    return obj


def build_vegetation():
    pine_meshes = [make_pine_mesh(i) for i in range(4)]
    deciduous_meshes = [make_deciduous_mesh(i) for i in range(3)]
    rock_meshes = [make_rock_mesh(i) for i in range(5)]
    grass_meshes = [make_grass_mesh(i) for i in range(3)]

    # pines scattered over the valley slopes
    placed = 0
    attempts = 0
    while placed < 110 and attempts < 5000:
        attempts += 1
        angle = rng.uniform(0.0, TAU)
        distance = rng.uniform(30.0, 175.0)
        x = math.cos(angle) * distance
        y = math.sin(angle) * distance
        if abs(x) < 15.0 and -50.0 < y < -8.0:
            continue
        if abs(x) < 8.0 and y < -30.0:
            continue
        z = terrain_height(x, y)
        if z > 20.0:
            continue
        scale = rng.uniform(0.65, 1.45) * (1.0 + distance / 500.0)
        instance_mesh(
            f"Pine_{placed:03d}",
            rng.choice(pine_meshes),
            (x, y, z - 0.2),
            scale,
            rng.uniform(0.0, TAU),
            COL["Vegetation"],
        )
        placed += 1

    # small trees on the monastery platform
    platform_trees = (
        (-16.1, -2.0, 1.05),
        (16.0, -1.0, 0.95),
        (14.6, 8.4, 0.85),
        (-15.3, 9.4, 0.8),
    )
    for i, (x, y, scale) in enumerate(platform_trees):
        instance_mesh(
            f"Platform_Pine_{i}",
            rng.choice(pine_meshes),
            (x, y, PLATFORM_Z),
            scale,
            rng.uniform(0.0, TAU),
            COL["Vegetation"],
        )

    # apricot-like deciduous trees near the approach
    for i in range(16):
        angle = rng.uniform(0.35 * math.pi, 0.65 * math.pi)
        distance = rng.uniform(26.0, 70.0)
        x = math.cos(angle) * distance * (1 if i % 2 else -1)
        y = -abs(math.sin(angle) * distance) - 8.0
        if abs(x) < 9.0 and y > -50.0:
            continue
        z = terrain_height(x, y)
        scale = rng.uniform(0.7, 1.15)
        instance_mesh(
            f"Deciduous_{i:02d}",
            rng.choice(deciduous_meshes),
            (x, y, z - 0.15),
            scale,
            rng.uniform(0.0, TAU),
            COL["Vegetation"],
        )

    # autumn trees framing the outcrop
    autumn_mesh = make_deciduous_mesh(99)
    autumn_mesh.materials[1] = MATS["autumn"]
    for i, (x, y, scale) in enumerate(
        ((-27.0, -13.0, 1.15), (27.5, -6.0, 1.25), (-28.0, 9.0, 1.0), (26.0, 13.0, 1.1))
    ):
        z = terrain_height(x, y)
        instance_mesh(
            f"Autumn_Tree_{i}",
            autumn_mesh,
            (x, y, z - 0.1),
            scale,
            rng.uniform(0.0, TAU),
            COL["Vegetation"],
        )

    # rocks
    for i in range(55):
        angle = rng.uniform(0.0, TAU)
        distance = rng.uniform(22.0, 120.0)
        x = math.cos(angle) * distance
        y = math.sin(angle) * distance
        if abs(x) < 6.0 and y < -25.0 and y > -45.0:
            continue
        z = terrain_height(x, y)
        scale = rng.uniform(0.35, 1.7) * (1.0 + distance / 250.0)
        instance_mesh(
            f"Rock_{i:03d}",
            rng.choice(rock_meshes),
            (x, y, z + 0.1),
            scale,
            rng.uniform(0.0, TAU),
            COL["Vegetation"],
            scale_z=scale * rng.uniform(0.7, 1.2),
        )

    # large boulders hugging the cliff base
    for i, (x, y, scale) in enumerate(
        ((-21.0, -3.0, 2.6), (20.5, 3.5, 2.2), (-19.5, 12.0, 1.8), (19.0, 14.0, 2.0))
    ):
        z = terrain_height(x, y)
        instance_mesh(
            f"Cliff_Boulder_{i}",
            rng.choice(rock_meshes),
            (x, y, z),
            scale,
            rng.uniform(0.0, TAU),
            COL["Vegetation"],
            scale_z=scale * 0.85,
        )

    # grass tufts
    for i in range(90):
        angle = rng.uniform(0.0, TAU)
        distance = rng.uniform(20.0, 75.0)
        x = math.cos(angle) * distance
        y = math.sin(angle) * distance
        z = terrain_height(x, y)
        instance_mesh(
            f"Grass_{i:03d}",
            rng.choice(grass_meshes),
            (x, y, z),
            rng.uniform(0.8, 1.7),
            rng.uniform(0.0, TAU),
            COL["Vegetation"],
        )

    # small shrubs
    shrub = make_rock_mesh(77)
    shrub.materials.clear()
    shrub.materials.append(MATS["leaves"])
    for i in range(34):
        angle = rng.uniform(0.0, TAU)
        distance = rng.uniform(22.0, 85.0)
        x = math.cos(angle) * distance
        y = math.sin(angle) * distance
        z = terrain_height(x, y)
        instance_mesh(
            f"Shrub_{i:02d}",
            shrub,
            (x, y, z + 0.2),
            rng.uniform(0.3, 0.8),
            rng.uniform(0.0, TAU),
            COL["Vegetation"],
            scale_z=rng.uniform(0.4, 0.8),
        )

    # cairns at the side of the path
    for i, (x, y) in enumerate(((-7.5, -30.0), (6.0, -42.0), (-8.5, -15.0))):
        z = terrain_height(x, y) if y < -18.0 else PLATFORM_Z + 0.1
        for level in range(4):
            instance_mesh(
                f"Cairn_{i}_{level}",
                rng.choice(rock_meshes),
                (x, y, z + level * 0.28),
                0.55 - level * 0.08,
                rng.uniform(0.0, TAU),
                COL["Vegetation"],
                scale_z=0.28,
            )


# =============================================================================
# CAMERAS
# =============================================================================


def add_camera(name, location, target, lens=35.0, fstop=None, focus_point=None):
    data = bpy.data.cameras.new(name)
    data.lens = lens
    data.sensor_width = 36.0
    data.clip_start = 0.1
    data.clip_end = 4000.0
    obj = bpy.data.objects.new(name, data)
    COL["Cameras"].objects.link(obj)
    obj.location = Vector(location)
    aim_object(obj, target)
    if fstop is not None:
        data.dof.use_dof = True
        data.dof.aperture_fstop = fstop
        focus = bpy.data.objects.new(f"{name}_Focus", None)
        focus.empty_display_type = "SPHERE"
        focus.empty_display_size = 0.35
        COL["Cameras"].objects.link(focus)
        focus.location = Vector(focus_point or target)
        data.dof.focus_object = focus
    return obj


def build_cameras(scene):
    main = add_camera(
        "Camera_Cinematic",
        (24.0, -58.0, 21.0),
        (-2.0, 0.0, 22.5),
        lens=35.0,
        fstop=5.6,
        focus_point=(0.0, -1.0, 17.5),
    )
    scene.camera = main

    add_camera(
        "Camera_Wide",
        (45.0, -105.0, 68.0),
        (-4.0, 12.0, 18.0),
        lens=24.0,
    )
    add_camera(
        "Camera_Detail",
        (17.0, -27.0, 13.5),
        (-1.0, 0.0, 17.0),
        lens=50.0,
        fstop=2.8,
        focus_point=(0.0, -1.5, 16.5),
    )
    add_camera(
        "Camera_Stairs",
        (2.5, -35.5, 4.6),
        (0.0, 0.0, 17.5),
        lens=28.0,
        fstop=4.0,
        focus_point=(0.0, -5.0, 15.0),
    )


# =============================================================================
# RENDER SETTINGS AND OUTPUT
# =============================================================================


def configure_gpu(scene):
    if FORCE_CPU:
        scene.cycles.device = "CPU"
        print("[Himalaya] --cpu supplied; rendering on CPU")
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
        print(f"[Himalaya] GPU rendering enabled via {compute_type}")
        return True
    scene.cycles.device = "CPU"
    print("[Himalaya] No GPU found - rendering on CPU")
    return False


def configure_render(scene):
    scene.render.engine = "CYCLES"
    configure_gpu(scene)

    scene.cycles.samples = SAMPLES
    scene.cycles.use_adaptive_sampling = True
    scene.cycles.adaptive_threshold = 0.02
    scene.cycles.use_denoising = True
    try:
        scene.cycles.denoiser = "OPENIMAGEDENOISE"
    except Exception:
        pass
    scene.cycles.max_bounces = 7
    scene.cycles.diffuse_bounces = 3
    scene.cycles.glossy_bounces = 4
    scene.cycles.transmission_bounces = 4
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
        "NONE",
        "None",
    ):
        try:
            scene.view_settings.look = look
            break
        except Exception:
            continue
    scene.view_settings.exposure = -0.05

    # Optional subtle cinematic bloom. Blender 5.x moved the compositor to
    # node-group based trees; the render is fully usable without it, so we
    # only add the glare on versions with the classic scene compositor.
    try:
        if hasattr(scene, "compositing_node_group"):
            print("[Himalaya] Compositor bloom skipped (Blender 5 node-group compositor).")
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
            glare.threshold = 1.2
            glare.size = 7
            glare.mix = -0.82
            composite = nt.nodes.new("CompositorNodeComposite")
            composite.location = (200, 0)
            nt.links.new(render_layers.outputs["Image"], glare.inputs["Image"])
            nt.links.new(glare.outputs["Image"], composite.inputs["Image"])
    except Exception as exc:
        print(f"[Himalaya] Compositor bloom skipped: {exc}")


def save_and_render(scene):
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    blend_path = os.path.join(OUTPUT_DIR, BLEND_NAME)
    png_path = os.path.join(OUTPUT_DIR, RENDER_NAME)
    scene.render.filepath = png_path

    # Save the editable project first so it exists even if a render fails.
    try:
        bpy.ops.wm.save_as_mainfile(filepath=blend_path)
        print(f"[Himalaya] Saved project: {blend_path}")
    except Exception as exc:
        print(f"[Himalaya] Could not save .blend: {exc}")

    if NO_RENDER:
        print("[Himalaya] --no-render supplied; skipping render.")
        return

    print(
        f"[Himalaya] Rendering {RES_X}x{RES_Y} at {RES_PERCENT}% "
        f"with {SAMPLES} Cycles samples..."
    )
    bpy.ops.render.render(write_still=True)
    print(f"[Himalaya] Rendered image: {png_path}")


# =============================================================================
# MAIN
# =============================================================================


def main():
    print("[Himalaya] Building cinematic monastery scene...")
    scene = reset_scene()
    make_collections()
    build_materials()
    build_world(scene)
    build_lighting()
    build_terrain()
    build_mountains()
    build_monastery()
    build_prayer_flags()
    build_vegetation()
    build_cameras(scene)
    configure_render(scene)

    # Nice default viewport settings if the file is opened interactively.
    try:
        for screen in bpy.data.screens:
            for area in screen.areas:
                if area.type == "VIEW_3D":
                    space = area.spaces.active
                    space.shading.type = "MATERIAL"
                    space.clip_end = 4000.0
    except Exception:
        pass

    save_and_render(scene)
    print("[Himalaya] Done.")


if __name__ == "__main__":
    main()
