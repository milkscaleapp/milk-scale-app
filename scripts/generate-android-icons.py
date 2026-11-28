from pathlib import Path
from PIL import Image
import io
import cairosvg

ROOT = Path(__file__).resolve().parents[1]
RES = ROOT / "android" / "app" / "src" / "main" / "res"
SVG = ROOT / "resources" / "milk-scale-logo.svg"
(RES / "drawable").mkdir(parents=True, exist_ok=True)

# Render the selected Milk calculator artwork once. Reuse this exact master
# for the launcher artwork and the loading screen to avoid mismatched designs.
png = cairosvg.svg2png(url=str(SVG), output_width=1024, output_height=1024)
master = Image.open(io.BytesIO(png)).convert("RGBA")

def fit(source, size):
    image = source.copy()
    image.thumbnail((size, size), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.alpha_composite(image, ((size-image.width)//2, (size-image.height)//2))
    return canvas

# Adaptive icon: use a safe-zone-sized foreground over a matching cyan/blue
# background. Legacy icons use the complete square artwork without cropping.
bg = Image.new("RGBA", (432, 432), (0, 0, 0, 255))
pix = bg.load()
for y in range(432):
    for x in range(432):
        t = (x + y) / (2 * 431)
        pix[x, y] = (round(8 + 1*t), round(190 - 145*t), round(237 - 35*t), 255)
fg = fit(master, 250)
(RES / "drawable" / "ms_launcher_background.png").parent.mkdir(parents=True, exist_ok=True)
bg.save(RES / "drawable" / "ms_launcher_background.png")
fg.save(RES / "drawable" / "ms_launcher_foreground.png")

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

# Same full selected icon centered on the native splash.
splash = Image.new("RGBA", (1080, 1920), (252, 253, 255, 255))
splash_icon = fit(master, 620)
splash.alpha_composite(splash_icon, ((1080-620)//2, (1920-620)//2))
for name in ["drawable", "drawable-port", "drawable-land"]:
    folder = RES / name
    folder.mkdir(parents=True, exist_ok=True)
    splash.convert("RGB").save(folder / "splash.png")

print("Applied selected Milk calculator icon consistently to launcher and splash.")
