#!/usr/bin/env python3
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
image_file = root / "assets" / "milk-scale-icon.jpg"
res = root / "android" / "app" / "src" / "main" / "res"

if not image_file.is_file():
    raise SystemExit(f"Missing launcher artwork: {image_file}")

source = Image.open(image_file).convert("RGB")
if source.width != source.height:
    raise SystemExit(f"Launcher artwork must be square, got {source.size}")

# Legacy launchers use the complete artwork. Adaptive launchers need safe
# padding because Android masks the foreground into a circle/squircle.
drawable = res / "drawable-nodpi"
drawable.mkdir(parents=True, exist_ok=True)
adaptive_foreground = Image.new("RGBA", (432, 432), (0, 0, 0, 0))
safe_art = source.resize((300, 300), Image.Resampling.LANCZOS).convert("RGBA")
adaptive_foreground.alpha_composite(safe_art, ((432 - 300) // 2, (432 - 300) // 2))
adaptive_foreground.save(drawable / "milk_scale_launcher_foreground.png", optimize=True)

for density, size in (("mdpi", 48), ("hdpi", 72), ("xhdpi", 96), ("xxhdpi", 144), ("xxxhdpi", 192)):
    folder = res / f"mipmap-{density}"
    folder.mkdir(parents=True, exist_ok=True)
    icon = source.resize((size, size), Image.Resampling.LANCZOS)
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

required = [
    adaptive / "ic_launcher.xml",
    adaptive / "ic_launcher_round.xml",
    drawable / "milk_scale_launcher_foreground.png",
    res / "mipmap-mdpi" / "ic_launcher.png",
    res / "mipmap-hdpi" / "ic_launcher.png",
    res / "mipmap-xhdpi" / "ic_launcher.png",
    res / "mipmap-xxhdpi" / "ic_launcher.png",
    res / "mipmap-xxxhdpi" / "ic_launcher.png",
]
missing = [str(path) for path in required if not path.is_file() or path.stat().st_size == 0]
if missing:
    raise SystemExit("Launcher icon generation incomplete: " + ", ".join(missing))

print("Generated and verified Milk Scale adaptive, round, and legacy launcher icons.")
