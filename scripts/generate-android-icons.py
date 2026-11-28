from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
RES = ROOT / "android" / "app" / "src" / "main" / "res"
LOGO = ROOT / "resources" / "milk-scale-logo.jpg"
BG_NAME = "ms_launcher_background"
FG_NAME = "ms_launcher_foreground"

logo = Image.open(LOGO).convert("RGBA")
(RES / "drawable").mkdir(parents=True, exist_ok=True)
logo_432 = logo.resize((432, 432), Image.Resampling.LANCZOS)
logo_432.save(RES / "drawable" / (BG_NAME + ".png"))
Image.new("RGBA", (432, 432), (0, 0, 0, 0)).save(RES / "drawable" / (FG_NAME + ".png"))

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
    icon = logo.resize((px, px), Image.Resampling.LANCZOS)
    icon.save(folder / "ic_launcher.png")
    icon.save(folder / "ic_launcher_round.png")

splash = Image.new("RGB", (1080, 1920), (255, 255, 255))
splash_logo = logo.convert("RGB")
splash_logo.thumbnail((760, 760), Image.Resampling.LANCZOS)
x = (1080 - splash_logo.width) // 2
y = (1920 - splash_logo.height) // 2
splash.paste(splash_logo, (x, y))
for folder_name in ["drawable", "drawable-port", "drawable-land"]:
    folder = RES / folder_name
    folder.mkdir(parents=True, exist_ok=True)
    splash.save(folder / "splash.png")

print("Generated launcher icons and white native splash from supplied Milk Scale artwork.")