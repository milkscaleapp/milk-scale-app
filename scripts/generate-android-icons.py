#!/usr/bin/env python3
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
image_file = root / "assets" / "milk-scale-icon.jpg"
res = root / "android" / "app" / "src" / "main" / "res"

if not image_file.is_file():
    raise SystemExit(f"Missing launcher artwork: {image_file}")

# Use project-specific resource names so Capacitor's generated resources cannot
# collide with the Milk Scale artwork.
source = Image.open(image_file).convert("RGB")
foreground = source.resize((432, 432), Image.Resampling.LANCZOS).convert("RGBA")

drawable = res / "drawable-nodpi"
drawable.mkdir(parents=True, exist_ok=True)
foreground.save(drawable / "milk_scale_launcher_foreground.png", optimize=True)

for density, size in (("mdpi", 48), ("hdpi", 72), ("xhdpi", 96), ("xxhdpi", 144), ("xxxhdpi", 192)):
    folder = res / f"mipmap-{density}"
    folder.mkdir(parents=True, exist_ok=True)
    icon = foreground.resize((size, size), Image.Resampling.LANCZOS)
    icon.save(folder / "ic_launcher.png", optimize=True)
    icon.save(folder / "ic_launcher_round.png", optimize=True)

adaptive = res / "mipmap-anydpi-v26"
adaptive.mkdir(parents=True, exist_ok=True)
xml = '''<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/milk_scale_icon_background" />
    <foreground android:drawable="@drawable/milk_scale_launcher_foreground" />
</adaptive-icon>
'''
(adaptive / "ic_launcher.xml").write_text(xml)
(adaptive / "ic_launcher_round.xml").write_text(xml)

values = res / "values"
values.mkdir(parents=True, exist_ok=True)
colors = values / "colors.xml"
content = colors.read_text() if colors.exists() else '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n</resources>\n'
if "milk_scale_icon_background" not in content:
    if "</resources>" not in content:
        raise SystemExit("Invalid Android colors.xml: missing </resources>")
    content = content.replace("</resources>", '    <color name="milk_scale_icon_background">#052469</color>\n</resources>')
colors.write_text(content)

print("Generated Milk Scale adaptive and legacy launcher icons.")
