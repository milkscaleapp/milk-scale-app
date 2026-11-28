from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
RES = ROOT / "android" / "app" / "src" / "main" / "res"
LOGO = ROOT / "resources" / "milk-scale-logo.jpg"
BG_NAME = "ms_launcher_background"
FG_NAME = "ms_launcher_foreground"

logo = Image.open(LOGO).convert("RGBA")
(RES / "drawable").mkdir(parents=True, exist_ok=True)

# Adaptive icons need artwork in the foreground safe zone. Keep the original
# supplied logo intact, but round its own corners so it never looks like a
# hard-edged square inside the Android launcher mask.
size = 432
icon_bg = Image.new("RGBA", (size, size), (5, 20, 65, 255))
art_size = 372
art = logo.resize((art_size, art_size), Image.Resampling.LANCZOS)
mask = Image.new("L", (art_size, art_size), 0)
ImageDraw.Draw(mask).rounded_rectangle((0, 0, art_size - 1, art_size - 1), radius=54, fill=255)
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

# Legacy launcher icons are also generated with transparent rounded corners.
for density, px in [("mdpi", 48), ("hdpi", 72), ("xhdpi", 96), ("xxhdpi", 144), ("xxxhdpi", 192)]:
    folder = RES / ("mipmap-" + density)
    folder.mkdir(parents=True, exist_ok=True)
    art = logo.resize((px, px), Image.Resampling.LANCZOS)
    m = Image.new("L", (px, px), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, px - 1, px - 1), radius=max(5, int(px * 0.14)), fill=255)
    art.putalpha(m)
    art.save(folder / "ic_launcher.png")
    art.save(folder / "ic_launcher_round.png")

# Native launch image: white screen, same logo, larger rounded corners.
splash = Image.new("RGB", (1080, 1920), (255, 255, 255))
splash_size = 760
splash_logo = logo.resize((splash_size, splash_size), Image.Resampling.LANCZOS)
splash_mask = Image.new("L", (splash_size, splash_size), 0)
ImageDraw.Draw(splash_mask).rounded_rectangle((0, 0, splash_size - 1, splash_size - 1), radius=104, fill=255)
splash_rgba = splash_logo.copy()
splash_rgba.putalpha(splash_mask)
splash = splash.convert("RGBA")
splash.alpha_composite(splash_rgba, ((1080 - splash_size) // 2, (1920 - splash_size) // 2))
for folder_name in ["drawable", "drawable-port", "drawable-land"]:
    folder = RES / folder_name
    folder.mkdir(parents=True, exist_ok=True)
    splash.convert("RGB").save(folder / "splash.png")

print("Generated rounded launcher icons and rounded white splash from supplied Milk Scale artwork.")