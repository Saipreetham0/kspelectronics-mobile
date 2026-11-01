"""Builds the Google Play phone screenshots (1080x1920, 9:16) from raw phone captures.

Play rejects screenshots whose long side is more than twice the short side, and raw captures from a
20:9 phone (1080x2412) are 2.23:1, so each one is cropped (no status bar, no personal location strip)
and placed on a brand-blue card with a headline.

Usage: python3 store-assets/make_screenshots.py <folder with the raw captures>
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
FONT = ROOT / 'node_modules/@expo-google-fonts/inter'
BOLD = ImageFont.truetype(str(FONT / '800ExtraBold/Inter_800ExtraBold.ttf'), 66)
SEMI = ImageFont.truetype(str(FONT / '600SemiBold/Inter_600SemiBold.ttf'), 36)
W, H, TOP = 1080, 1920, 330
BLUE, DARK = (28, 97, 231), (16, 58, 150)

# (raw capture, crop box in its pixels, headline, sub line, output name)
SHOTS = [
    ('u3.png', (0, 315, 1080, 1990), 'Deals on maker gear', 'Up to 72% off boards, Pi and 3D printing', '1_deals'),
    ('ours2.png', (0, 365, 1080, 1995), 'Every category, one tap', '3D printers, Raspberry Pi, Arduino, sensors', '2_categories'),
    ('u2.png', (0, 315, 1080, 1990), 'Brands makers trust', 'Bambu Lab, Raspberry Pi, Creality, Elegoo', '3_brands'),
    ('cart5.png', (0, 115, 1080, 2025), 'See what you save', 'Live savings and smart add-ons in your cart', '4_cart'),
    ('cart7.png', (0, 115, 1080, 2025), 'Clear bill, GST included', 'Free delivery over the limit, easy returns', '5_bill'),
]


def card(raw: Image.Image, box, head: str, sub: str) -> Image.Image:
    bg = Image.new('RGB', (W, H), BLUE)
    grad = Image.linear_gradient('L').resize((W, H))  # top light, bottom dark
    bg = Image.composite(Image.new('RGB', (W, H), DARK), bg, grad)
    d = ImageDraw.Draw(bg)
    d.text((W // 2, 140), head, font=BOLD, fill='white', anchor='mm')
    d.text((W // 2, 225), sub, font=SEMI, fill=(219, 231, 255), anchor='mm')
    shot = raw.convert('RGB').crop(box)
    scale = min((W - 160) / shot.width, (H - TOP - 40) / shot.height)
    shot = shot.resize((round(shot.width * scale), round(shot.height * scale)), Image.LANCZOS)
    x, y = (W - shot.width) // 2, TOP
    mask = Image.new('L', shot.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, *shot.size), radius=40, fill=255)
    shadow = Image.new('L', (W, H), 0)
    ImageDraw.Draw(shadow).rounded_rectangle((x, y + 14, x + shot.width, y + shot.height + 14), radius=40, fill=110)
    bg.paste((0, 0, 0), (0, 0), shadow.filter(ImageFilter.GaussianBlur(22)))
    bg.paste(shot, (x, y), mask)
    return bg


if __name__ == '__main__':
    src = Path(sys.argv[1])
    out = ROOT / 'store-assets/play/screenshots'
    out.mkdir(parents=True, exist_ok=True)
    for name, box, head, sub, file in SHOTS:
        img = card(Image.open(src / name), box, head, sub)
        assert img.size == (W, H) and max(img.size) <= 2 * min(img.size)  # Play's 2:1 limit
        img.save(out / f'{file}.png', optimize=True)
        print(out / f'{file}.png')
