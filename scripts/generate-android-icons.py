#!/usr/bin/env python3
from pathlib import Path
from io import BytesIO
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1]
image_file = root / "assets" / "milk-scale-icon.jpg"
res = root / "android" / "app" / "src" / "main" / "res"

# Render the same vector artwork for the adaptive icon and legacy launcher sizes.
foreground = Image.open(image_file).convert("RGB").resize((432, 432), Image.Resampling.LANCZOS).convert("RGBA")
(res / "drawable-nodpi").mkdir(parents=True, exist_ok=True)
foreground.save(res / "drawable-nodpi" / "ic_launcher_foreground.png")

for density, size in (("mdpi", 48), ("hdpi", 72), ("xhdpi", 96), ("xxhdpi", 144), ("xxxhdpi", 192)):
    folder = res / f"mipmap-{density}"
    folder.mkdir(parents=True, exist_ok=True)
    # Legacy launchers use a full-bleed navy canvas behind the same mark.
    canvas = Image.new("RGBA", (size, size), (5, 36, 105, 255))
    mark = foreground.resize((size, size), Image.Resampling.LANCZOS)
    canvas.alpha_composite(mark)
    canvas.save(folder / "ic_launcher.png", optimize=True)
    canvas.save(folder / "ic_launcher_round.png", optimize=True)

adaptive = res / "mipmap-anydpi-v26"
adaptive.mkdir(parents=True, exist_ok=True)
xml = '''<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/milk_scale_icon_background" />
    <foreground android:drawable="@drawable/ic_launcher_foreground" />
</adaptive-icon>
'''
(adaptive / "ic_launcher.xml").write_text(xml)
(adaptive / "ic_launcher_round.xml").write_text(xml)

values = res / "values"
values.mkdir(parents=True, exist_ok=True)
colors = values / "colors.xml"
content = colors.read_text() if colors.exists() else '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n</resources>\n'
if "milk_scale_icon_background" not in content:
    content = content.replace("</resources>", '    <color name="milk_scale_icon_background">#052469</color>\n</resources>')
colors.write_text(content)
print("Generated Milk Scale adaptive and legacy launcher icons.")
