from pathlib import Path
from PIL import Image
import io
import cairosvg

ROOT = Path(__file__).resolve().parents[1]
RES = ROOT / "android" / "app" / "src" / "main" / "res"
SVG = ROOT / "resources" / "milk-scale-logo.svg"
(RES / "drawable").mkdir(parents=True, exist_ok=True)

# One master artwork is shared by launcher and loading screen.
png = cairosvg.svg2png(url=str(SVG), output_width=1024, output_height=1024)
master = Image.open(io.BytesIO(png)).convert("RGBA")

def fit(source, size):
    image = source.copy()
    image.thumbnail((size, size), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.alpha_composite(image, ((size-image.width)//2, (size-image.height)//2))
    return canvas

# Android adaptive safe area: white background, centered artwork sized to stay
# clear of circular/rounded launcher masks without clipping its border or text.
size = 432
background = Image.new("RGBA", (size, size), (255, 255, 255, 255))
foreground = fit(master, 300)
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
    master.resize((px, px), Image.Resampling.LANCZOS).save(folder / "ic_launcher.png")
    master.resize((px, px), Image.Resampling.LANCZOS).save(folder / "ic_launcher_round.png")

# The exact same master artwork, larger, on the white native splash background.
splash = Image.new("RGBA", (1080, 1920), (255, 255, 255, 255))
splash_logo = fit(master, 760)
splash.alpha_composite(splash_logo, ((1080-760)//2, (1920-760)//2))
for name in ["drawable", "drawable-port", "drawable-land"]:
    folder = RES / name
    folder.mkdir(parents=True, exist_ok=True)
    splash.convert("RGB").save(folder / "splash.png")

print("Applied identical Milk Scale logo to launcher and splash with minimal shadow.")
