from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
RES = ROOT / "android" / "app" / "src" / "main" / "res"
LOGO = ROOT / "resources" / "milk-scale-logo.jpg"
BG_NAME = "ms_launcher_background"
FG_NAME = "ms_launcher_foreground"

logo = Image.open(LOGO).convert("RGBA")
(RES / "drawable").mkdir(parents=True, exist_ok=True)

def make_launcher_icon(size):
    """Minimal white calculator on deep navy with a restrained soft shadow."""
    icon = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(icon)
    margin = int(size * 0.055)
    radius = int(size * 0.22)
    # Soft, subtle shadow and a clean dark navy tile.
    shadow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle((margin, margin + int(size*.018), size-margin, size-margin + int(size*.018)),
                         radius=radius, fill=(0, 0, 0, 48))
    shadow = shadow.filter(__import__("PIL.ImageFilter", fromlist=["GaussianBlur"]).GaussianBlur(max(2, int(size*.018))))
    icon.alpha_composite(shadow)
    d = ImageDraw.Draw(icon)
    d.rounded_rectangle((margin, margin, size-margin, size-margin), radius=radius,
                        fill=(8, 27, 57, 255), outline=(39, 61, 91, 255), width=max(2, int(size*.012)))
    # Calculator body: proportional, centered, and with full bottom keypad visible.
    cw, ch = int(size*.48), int(size*.66)
    cx, cy = size//2, int(size*.49)
    x0, y0 = cx-cw//2, cy-ch//2
    x1, y1 = x0+cw, y0+ch
    white=(248, 251, 255, 255)
    d.rounded_rectangle((x0, y0, x1, y1), radius=int(size*.055), outline=white, width=max(4,int(size*.025)))
    # Display window
    pad=int(size*.055)
    d.rounded_rectangle((x0+pad,y0+pad,x1-pad,y0+int(ch*.28)), radius=int(size*.018),
                        outline=white, width=max(3,int(size*.018)))
    # 3 x 3 keypad, evenly spaced and fully contained.
    gx0=x0+pad; gx1=x1-pad
    gy0=y0+int(ch*.38); gy1=y1-pad
    gap=int(size*.025)
    bw=(gx1-gx0-2*gap)//3
    bh=(gy1-gy0-2*gap)//3
    for row in range(3):
        for col in range(3):
            bx=gx0+col*(bw+gap); by=gy0+row*(bh+gap)
            d.rounded_rectangle((bx,by,bx+bw,by+bh), radius=max(3,int(size*.012)), fill=white)
    return icon

size = 432
foreground = make_launcher_icon(size)
icon_bg = Image.new("RGBA", (size, size), (8, 27, 57, 255))
(RES / "drawable" / "ms_launcher_background.png").parent.mkdir(parents=True, exist_ok=True)
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
    icon = make_launcher_icon(px)
    icon.save(folder / "ic_launcher.png")
    icon.save(folder / "ic_launcher_round.png")

# Native Android splash: almost-white, perfectly flat background.
splash = Image.new("RGB", (1080, 1920), (252, 253, 255))
splash_size = 260
splash_logo = logo.resize((splash_size, splash_size), Image.Resampling.LANCZOS)
splash_mask = Image.new("L", (splash_size, splash_size), 0)
ImageDraw.Draw(splash_mask).rounded_rectangle((0, 0, splash_size - 1, splash_size - 1), radius=28, fill=255)
splash_rgba = splash_logo.copy()
splash_rgba.putalpha(splash_mask)
splash_rgba_canvas = Image.new("RGBA", splash.size, (252, 253, 255, 255))
splash_rgba_canvas.alpha_composite(splash_rgba, ((1080 - splash_size) // 2, (1920 - splash_size) // 2))
for folder_name in ["drawable", "drawable-port", "drawable-land"]:
    folder = RES / folder_name
    folder.mkdir(parents=True, exist_ok=True)
    splash_rgba_canvas.convert("RGB").save(folder / "splash.png")

print("Generated minimal white calculator launcher icon and clean near-white splash.")