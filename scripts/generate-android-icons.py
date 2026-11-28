from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
RES = ROOT / "android" / "app" / "src" / "main" / "res"
LOGO = ROOT / "resources" / "milk-scale-logo.png"
(RES / "drawable").mkdir(parents=True, exist_ok=True)
master = Image.open(LOGO).convert("RGBA")

def fit(source, size):
    image = source.copy()
    image.thumbnail((size, size), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.alpha_composite(image, ((size-image.width)//2, (size-image.height)//2))
    return canvas

# Same uploaded artwork is reused for launcher and splash; no generated redraws.
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
splash = Image.new("RGBA", (1080, 1920), (5, 37, 116, 255))
splash_logo = fit(master, 700)
splash.alpha_composite(splash_logo, ((1080-700)//2, (1920-700)//2))
for name in ["drawable", "drawable-port", "drawable-land"]:
    folder = RES / name
    folder.mkdir(parents=True, exist_ok=True)
    splash.convert("RGB").save(folder / "splash.png")
print("Applied the uploaded Milk calculator artwork to launcher and splash.")
