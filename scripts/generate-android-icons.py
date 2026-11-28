from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
RES = ROOT / "android" / "app" / "src" / "main" / "res"
LOGO = ROOT / "resources" / "milk-scale-logo.jpg"
BG_NAME = "ms_launcher_background"
FG_NAME = "ms_launcher_foreground"

logo = Image.open(LOGO).convert("RGBA")
(RES / "drawable").mkdir(parents=True, exist_ok=True)

def fit_logo(source, box_size):
    """Scale artwork proportionally; never squash the calculator vertically."""
    fitted = source.copy()
    fitted.thumbnail((box_size, box_size), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (box_size, box_size), (0, 0, 0, 0))
    canvas.alpha_composite(fitted, ((box_size - fitted.width) // 2, (box_size - fitted.height) // 2))
    return canvas

size = 432
icon_bg = Image.new("RGBA", (size, size), (5, 20, 65, 255))
# Keep the full calculator artwork within the adaptive safe zone, preserving its original proportions.
art_size = 330
art = fit_logo(logo, art_size)
mask = Image.new("L", (art_size, art_size), 0)
ImageDraw.Draw(mask).rounded_rectangle((0, 0, art_size - 1, art_size - 1), radius=38, fill=255)
art.putalpha(mask)
foreground = Image.new("RGBA", (size, size), (0, 0, 0, 0))
offset = (size - art_size) // 2
foreground.alpha_composite(art, (offset, offset))
icon_bg.save(RES / "drawable" / (BG_NAME + ".png"))
foreground.save(RES / "drawable" / (FG_NAME + ".png"))

adaptive = RES / "mipmap-anydpi-v26"
adaptive.mkdir(parents=True, exist_ok=True)
xml = '''<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/ms_launcher_background"/>
    <foreground android:drawable="@drawable/ms_launcher_foreground"/>
</adaptive-icon>
'''
(adaptive / "ic_launcher.xml").write_text(xml, encoding="utf-8")
(adaptive / "ic_launcher_round.xml").write_text(xml, encoding="utf-8")

for density, px in [("mdpi", 48), ("hdpi", 72), ("xhdpi", 96), ("xxhdpi", 144), ("xxxhdpi", 192)]:
    folder = RES / ("mipmap-" + density)
    folder.mkdir(parents=True, exist_ok=True)
    art = fit_logo(logo, int(px * 0.82))
    icon = Image.new("RGBA", (px, px), (5, 20, 65, 255))
    m = Image.new("L", art.size, 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, art.width - 1, art.height - 1), radius=max(4, int(px * 0.09)), fill=255)
    art.putalpha(m)
    icon.alpha_composite(art, ((px - art.width) // 2, (px - art.height) // 2))
    icon.save(folder / "ic_launcher.png")
    icon.save(folder / "ic_launcher_round.png")

# Native Android splash is solid black with a deliberately small centered logo.
splash = Image.new("RGB", (1080, 1920), (0, 0, 0))
pixels = splash.load()
top = (11, 79, 145)
middle = (22, 127, 189)
bottom = (85, 197, 232)
for y in range(1920):
    t = y / 1919
    if t < 0.48:
        q = t / 0.48
        color = tuple(round(top[i] * (1-q) + middle[i] * q) for i in range(3))
    else:
        q = (t - 0.48) / 0.52
        color = tuple(round(middle[i] * (1-q) + bottom[i] * q) for i in range(3))
    for x in range(1080):
        pixels[x, y] = color
splash_size = 280
splash_logo = fit_logo(logo, splash_size)
splash_mask = Image.new("L", (splash_size, splash_size), 0)
ImageDraw.Draw(splash_mask).rounded_rectangle((0, 0, splash_size - 1, splash_size - 1), radius=24, fill=255)
splash_rgba = splash_logo.copy()
splash_rgba.putalpha(splash_mask)
splash_rgba_canvas = Image.new("RGBA", splash.size, (0, 0, 0, 255))
splash_rgba_canvas.alpha_composite(splash_rgba, ((1080 - splash_size) // 2, (1920 - splash_size) // 2))
for folder_name in ["drawable", "drawable-port", "drawable-land"]:
    folder = RES / folder_name
    folder.mkdir(parents=True, exist_ok=True)
    splash_rgba_canvas.convert("RGB").save(folder / "splash.png")

print("Generated proportionally scaled calculator icons and blue gradient splash.")