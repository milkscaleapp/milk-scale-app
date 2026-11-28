from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
RES = ROOT / "android" / "app" / "src" / "main" / "res"
LOGO = ROOT / "resources" / "milk-scale-logo.jpg"
BG_NAME = "ms_launcher_background"
FG_NAME = "ms_launcher_foreground"

import io
import cairosvg
logo_png = cairosvg.svg2png(url=str(LOGO.with_suffix(".svg")), output_width=1024, output_height=1024)
logo = Image.open(io.BytesIO(logo_png)).convert("RGBA")
(RES / "drawable").mkdir(parents=True, exist_ok=True)

def fit_logo(source, box_size):
    fitted = source.copy()
    fitted.thumbnail((box_size, box_size), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (box_size, box_size), (0, 0, 0, 0))
    canvas.alpha_composite(fitted, ((box_size - fitted.width) // 2, (box_size - fitted.height) // 2))
    return canvas

# One master logo is reused unchanged for launcher and native splash.
master = fit_logo(logo, 1024)
size = 432
foreground = fit_logo(master, size)
icon_bg = Image.new("RGBA", (size, size), (8, 27, 57, 255))
icon_bg.save(RES / "drawable" / "ms_launcher_background.png")
foreground.save(RES / "drawable" / "ms_launcher_foreground.png")

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
    icon = fit_logo(master, px)
    icon.save(folder / "ic_launcher.png")
    icon.save(folder / "ic_launcher_round.png")

# Same exact master artwork centered on a clean near-white splash background.
splash_canvas = Image.new("RGBA", (1080, 1920), (252, 253, 255, 255))
splash_logo = fit_logo(master, 620)
splash_canvas.alpha_composite(splash_logo, ((1080-620)//2, (1920-620)//2))
for folder_name in ["drawable", "drawable-port", "drawable-land"]:
    folder = RES / folder_name
    folder.mkdir(parents=True, exist_ok=True)
    splash_canvas.convert("RGB").save(folder / "splash.png")

print("Generated identical Milk Scale master logo for launcher and splash.")