from pathlib import Path
from PIL import Image
import io
import cairosvg

ROOT = Path(__file__).resolve().parents[1]
RES = ROOT / "android" / "app" / "src" / "main" / "res"
SVG = ROOT / "resources" / "milk-scale-logo.svg"
(RES / "drawable").mkdir(parents=True, exist_ok=True)

# Use one no-white, no-wordmark master icon for launcher and both splash screens.
png = cairosvg.svg2png(url=str(SVG), output_width=1024, output_height=1024)
master = Image.open(io.BytesIO(png)).convert("RGBA")

def fit(source, size):
    image = source.copy()
    image.thumbnail((size, size), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.alpha_composite(image, ((size-image.width)//2, (size-image.height)//2))
    return canvas

# Keep all visible artwork within Android's adaptive icon safe region.
size = 432
background = Image.new("RGBA", (size, size), (5, 37, 116, 255))
foreground = fit(master, 340)
background.save(RES / "drawable" / "ms_launcher_background.png")
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
    icon = master.resize((px, px), Image.Resampling.LANCZOS)
    icon.save(folder / "ic_launcher.png")
    icon.save(folder / "ic_launcher_round.png")

# Same exact icon centered on a blue splash background, no white anywhere.
splash = Image.new("RGBA", (1080, 1920), (5, 37, 116, 255))
splash_logo = fit(master, 700)
splash.alpha_composite(splash_logo, ((1080-700)//2, (1920-700)//2))
for name in ["drawable", "drawable-port", "drawable-land"]:
    folder = RES / name
    folder.mkdir(parents=True, exist_ok=True)
    splash.convert("RGB").save(folder / "splash.png")

print("Applied blue-only Milk calculator icon, without white or bottom wordmark.")
