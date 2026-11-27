from pathlib import Path
from io import BytesIO
import cairosvg
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
RES = ROOT / "android" / "app" / "src" / "main" / "res"
BG_SVG = ROOT / "resources" / "launcher-background.svg"
FG_SVG = ROOT / "resources" / "launcher-foreground.svg"

def render(svg_path, size):
    return Image.open(BytesIO(cairosvg.svg2png(url=str(svg_path), output_width=size, output_height=size))).convert("RGBA")

bg_432 = render(BG_SVG, 432)
fg_432 = render(FG_SVG, 432)
(RES / "drawable").mkdir(parents=True, exist_ok=True)
bg_432.save(RES / "drawable" / "ic_launcher_background.png")
fg_432.save(RES / "drawable" / "ic_launcher_foreground.png")

adaptive = RES / "mipmap-anydpi-v26"
adaptive.mkdir(parents=True, exist_ok=True)
xml = """<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/ic_launcher_background"/>
    <foreground android:drawable="@drawable/ic_launcher_foreground"/>
</adaptive-icon>
"""
(adaptive / "ic_launcher.xml").write_text(xml, encoding="utf-8")
(adaptive / "ic_launcher_round.xml").write_text(xml, encoding="utf-8")

for density, px in [("mdpi", 48), ("hdpi", 72), ("xhdpi", 96), ("xxhdpi", 144), ("xxxhdpi", 192)]:
    folder = RES / f"mipmap-{density}"
    folder.mkdir(parents=True, exist_ok=True)
    bg = render(BG_SVG, px)
    fg = render(FG_SVG, px)
    Image.alpha_composite(bg, fg).save(folder / "ic_launcher.png")
    Image.alpha_composite(bg, fg).save(folder / "ic_launcher_round.png")

print("Generated Milk Scale adaptive and legacy Android launcher icons.")
