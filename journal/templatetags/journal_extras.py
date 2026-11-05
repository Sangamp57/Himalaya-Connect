from __future__ import annotations

import html
import re

from django import template
from django.utils.html import escape
from django.utils.safestring import mark_safe

register = template.Library()


@register.filter
def story_body(value: str) -> str:
    """Render the deliberately small, safe subset of formatting authors use."""
    if not value:
        return ""

    text = escape(value).replace("\r\n", "\n").strip()
    blocks = re.split(r"\n\s*\n", text)
    output: list[str] = []

    def inline(chunk: str) -> str:
        chunk = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", chunk)
        chunk = re.sub(r"(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)", r"<em>\1</em>", chunk)
        return chunk

    for block in blocks:
        lines = [line.rstrip() for line in block.splitlines() if line.strip()]
        if not lines:
            continue

        first = lines[0]
        if first.startswith("### "):
            output.append(f"<h3>{inline(first[4:])}</h3>")
            continue
        if first.startswith("## "):
            output.append(f"<h2>{inline(first[3:])}</h2>")
            continue
        if first.startswith("# "):
            output.append(f"<h2>{inline(first[2:])}</h2>")
            continue
        if all(line.startswith(("- ", "* ")) for line in lines):
            items = "".join(f"<li>{inline(line[2:])}</li>" for line in lines)
            output.append(f"<ul>{items}</ul>")
            continue
        quote_prefixes = ("&gt; ", "> ")
        if all(line.startswith(quote_prefixes) for line in lines):
            quote = " ".join(
                line[5:] if line.startswith("&gt; ") else line[2:] for line in lines
            )
            output.append(f"<blockquote><p>{inline(quote)}</p></blockquote>")
            continue

        paragraphs = []
        current: list[str] = []
        for line in lines:
            current.append(inline(line))
        paragraphs.append("<br />".join(current))
        output.append(f"<p>{''.join(paragraphs)}</p>")

    return mark_safe("\n".join(output))


@register.filter
def compact_number(value: int) -> str:
    try:
        number = int(value)
    except (TypeError, ValueError):
        return "0"
    if number >= 1_000_000:
        return f"{number / 1_000_000:.1f}".rstrip("0").rstrip(".") + "m"
    if number >= 1_000:
        return f"{number / 1_000:.1f}".rstrip("0").rstrip(".") + "k"
    return str(number)


@register.filter
def initials(name: str) -> str:
    parts = [part for part in re.split(r"\s+", (name or "").strip()) if part]
    if not parts:
        return "H"
    return "".join(part[0].upper() for part in parts[:2])


@register.filter
def first_letter(name: str) -> str:
    return (name or "H")[:1].upper()


@register.simple_tag(takes_context=True)
def query_transform(context, **kwargs) -> str:
    """Build a querystring while preserving existing filters."""
    request = context.get("request")
    if not request:
        return ""
    query = request.GET.copy()
    for key, value in kwargs.items():
        if value in (None, ""):
            query.pop(key, None)
        else:
            query[key] = value
    return query.urlencode()


@register.simple_tag
def avatar_style(name: str, index: int = 0) -> str:
    """A deterministic, warm gradient for text avatars."""
    palettes = [
        ("#184f4a", "#2e7c70"),
        ("#8c4a32", "#c47750"),
        ("#68512e", "#b38a46"),
        ("#4f3d5c", "#866c98"),
        ("#324b63", "#5e8199"),
    ]
    safe_name = html.escape(name or "H")
    start, end = palettes[sum(ord(char) for char in safe_name) % len(palettes)]
    return f"background: linear-gradient(145deg, {start}, {end});"
