"""
BuckFlow AI -- Logo Generator v2 (refined)
Design Philosophy: Verdant Current
"""
from PIL import Image, ImageDraw, ImageFont
import math

# -- Paths --
FONT_DIR = r"C:\Users\ZILLAB\Desktop\buckflow\fonts"
OUTPUT   = r"C:\Users\ZILLAB\Desktop\buckflow"
OUTFIT_BOLD = f"{FONT_DIR}\\Outfit-Bold.ttf"

# -- Brand Palette --
EMERALD       = (16, 185, 129)
EMERALD_DEEP  = (5, 150, 105)
EMERALD_LIGHT = (52, 211, 153)
GOLD          = (245, 158, 11)
SLATE         = (15, 23, 42)
WHITE         = (255, 255, 255)

SS = 4  # supersample


def _diamond(draw, cx, cy, r, fill=None, outline=None):
    draw.polygon([(cx, cy-r), (cx+r, cy), (cx, cy+r), (cx-r, cy)],
                 fill=fill, outline=outline)


def _dot(draw, cx, cy, r, fill):
    draw.ellipse([cx-r, cy-r, cx+r, cy+r], fill=fill)


def _flow_curve(draw, x0, x1, cy, offset, width, color, freq, phase):
    """Draw an organic flowing line with harmonic waves."""
    length = x1 - x0
    pts = []
    for i in range(301):
        t = i / 300.0
        x = x0 + t * length
        amp = width * 1.2 * (1.0 + 0.2 * t)
        y = cy + offset + amp * (
            0.65 * math.sin(t * math.pi * freq + phase) +
            0.35 * math.sin(t * math.pi * freq * 2.1 + phase + 0.7)
        )
        pts.append((x, y))
    for j in range(len(pts) - 1):
        draw.line([pts[j], pts[j+1]], fill=color, width=width)


# ================================================================
#  ICON
# ================================================================

def create_icon(target=800):
    sz = target * SS
    img = Image.new("RGBA", (sz, sz), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # -- bubble proportions --
    margin = int(sz * 0.11)
    bx, by = margin, int(sz * 0.09)
    bw = sz - 2 * margin
    bh = int(sz * 0.64)
    rad = int(bh * 0.26)

    # main bubble
    d.rounded_rectangle([bx, by, bx+bw, by+bh], radius=rad, fill=EMERALD)

    # -- tail --
    tx_anchor = bx + int(bw * 0.19)
    tw = int(bw * 0.14)
    th = int(sz * 0.105)
    tail = [
        (tx_anchor - int(tw * 0.15), by + bh - 2),
        (tx_anchor - int(tw * 0.40), by + bh + th),
        (tx_anchor + tw, by + bh - 2),
    ]
    d.polygon(tail, fill=EMERALD)
    # smooth seam
    d.rectangle([tail[0][0]-2, by+bh-8, tail[2][0]+2, by+bh+3], fill=EMERALD)

    # -- adire border pattern (inner frame of tessellating diamonds) --
    border_layer = Image.new("RGBA", (sz, sz), (0, 0, 0, 0))
    bd = ImageDraw.Draw(border_layer)

    inset = int(bw * 0.075)
    ix0, iy0 = bx + inset, by + inset
    ix1, iy1 = bx + bw - inset, by + bh - inset

    dm_r = int(sz * 0.014)
    spacing = int(sz * 0.038)
    b_outline = (255, 255, 255, 50)
    b_dot     = (255, 255, 255, 70)

    # top & bottom edges
    for x in range(ix0 + spacing, ix1, spacing):
        _diamond(bd, x, iy0, dm_r, outline=b_outline)
        _dot(bd, x, iy0, max(2, dm_r//3), b_dot)
        _diamond(bd, x, iy1, dm_r, outline=b_outline)
        _dot(bd, x, iy1, max(2, dm_r//3), b_dot)
    # left & right edges
    for y in range(iy0 + spacing, iy1, spacing):
        _diamond(bd, ix0, y, dm_r, outline=b_outline)
        _dot(bd, ix0, y, max(2, dm_r//3), b_dot)
        _diamond(bd, ix1, y, dm_r, outline=b_outline)
        _dot(bd, ix1, y, max(2, dm_r//3), b_dot)
    # corner accents (larger)
    cr = int(dm_r * 1.5)
    for cx, cy in [(ix0, iy0), (ix1, iy0), (ix0, iy1), (ix1, iy1)]:
        _diamond(bd, cx, cy, cr, outline=(255,255,255,65))
        _dot(bd, cx, cy, max(3, cr//3), (255,255,255,80))

    img = Image.alpha_composite(img, border_layer)

    # -- flowing lines (the "current") --
    flow_layer = Image.new("RGBA", (sz, sz), (0, 0, 0, 0))
    fd = ImageDraw.Draw(flow_layer)

    cy_flow = by + bh // 2
    lx0 = bx + int(bw * 0.15)
    lx1 = bx + int(bw * 0.85)

    line_gap = int(sz * 0.048)
    line_w   = [int(sz * 0.013), int(sz * 0.017), int(sz * 0.011)]
    line_a   = [155, 200, 130]
    line_f   = [1.3, 1.7, 2.1]
    line_ph  = [0.0, 1.1, 2.4]

    for i, (w, a, f, ph) in enumerate(zip(line_w, line_a, line_f, line_ph)):
        off = (i - 1) * line_gap
        _flow_curve(fd, lx0, lx1, cy_flow, off, w, (255,255,255,a), f, ph)

    img = Image.alpha_composite(img, flow_layer)

    # -- gold geometric accents (adire diamonds below tail) --
    acc_layer = Image.new("RGBA", (sz, sz), (0, 0, 0, 0))
    ad = ImageDraw.Draw(acc_layer)

    tip_x, tip_y = tail[1]
    ar1 = int(sz * 0.018)  # larger primary diamond
    ar2 = int(sz * 0.012)  # smaller satellites

    # primary diamond
    _diamond(ad, tip_x + int(sz*0.025), tip_y + int(sz*0.028),
             ar1, fill=GOLD + (220,))
    _dot(ad, tip_x + int(sz*0.025), tip_y + int(sz*0.028),
         max(2, ar1//3), (255,255,255,120))

    # satellite diamonds
    _diamond(ad, tip_x + int(sz*0.065), tip_y + int(sz*0.012),
             ar2, fill=GOLD + (160,))
    _diamond(ad, tip_x - int(sz*0.008), tip_y + int(sz*0.055),
             ar2, fill=GOLD + (140,))

    img = Image.alpha_composite(img, acc_layer)

    return img.resize((target, target), Image.LANCZOS)


# ================================================================
#  FULL LOGO
# ================================================================

def build_logo(icon, bg, fg, version):
    W, H = 2800, 700
    ss = 2
    sw, sh = W * ss, H * ss

    canvas = Image.new("RGBA", (sw, sh), bg + (255,))
    dr = ImageDraw.Draw(canvas)

    # -- fonts --
    wm_px = int(sh * 0.30)
    ai_px = int(sh * 0.15)
    f_wm = ImageFont.truetype(OUTFIT_BOLD, wm_px)
    f_ai = ImageFont.truetype(OUTFIT_BOLD, ai_px)

    # -- measure everything to compute total width --
    icon_sz = int(sh * 0.76)
    gap_icon_text = int(sh * 0.07)

    bb_b = f_wm.getbbox("Buck")
    buck_w = bb_b[2] - bb_b[0]
    buck_h = bb_b[3] - bb_b[1]
    bb_f = f_wm.getbbox("Flow")
    flow_w = bb_f[2] - bb_f[0]
    kern = int(sh * 0.006)  # slight negative kerning

    ai_bbox = f_ai.getbbox("AI")
    ai_text_w = ai_bbox[2] - ai_bbox[0]
    ai_text_h = ai_bbox[3] - ai_bbox[1]
    pill_pad_x = int(ai_px * 0.42)
    pill_pad_y = int(ai_px * 0.22)
    pill_w = ai_text_w + 2 * pill_pad_x
    gap_text_pill = int(sh * 0.035)

    total_w = icon_sz + gap_icon_text + buck_w - kern + flow_w + gap_text_pill + pill_w

    # -- center everything horizontally --
    start_x = (sw - total_w) // 2

    # -- icon --
    ix = start_x
    iy = (sh - icon_sz) // 2
    icon_r = icon.resize((icon_sz, icon_sz), Image.LANCZOS)
    canvas.paste(icon_r, (ix, iy), icon_r)

    # -- wordmark --
    tx = ix + icon_sz + gap_icon_text
    ty = (sh - buck_h) // 2 - bb_b[1]

    dr.text((tx, ty), "Buck", fill=fg, font=f_wm)
    fx = tx + buck_w - kern
    dr.text((fx, ty), "Flow", fill=EMERALD, font=f_wm)

    # -- AI pill badge --
    pill_h = ai_text_h + 2 * pill_pad_y
    pill_x = fx + flow_w + gap_text_pill
    pill_y = ty + bb_b[1] + int(buck_h * 0.05)

    pill_rect = [pill_x, pill_y, pill_x + pill_w, pill_y + pill_h]
    pill_radius = pill_h // 2
    dr.rounded_rectangle(pill_rect, radius=pill_radius, fill=GOLD)

    ai_draw_x = pill_x + pill_pad_x - ai_bbox[0]
    ai_draw_y = pill_y + pill_pad_y - ai_bbox[1]
    dr.text((ai_draw_x, ai_draw_y), "AI", fill=WHITE, font=f_ai)

    # -- downscale & flatten --
    out = canvas.resize((W, H), Image.LANCZOS)
    flat = Image.new("RGB", (W, H), bg)
    flat.paste(out, (0, 0), out)
    p = f"{OUTPUT}\\buckflow-logo-{version}.png"
    flat.save(p, "PNG", dpi=(300, 300))
    print(f"  + {p}  ({W}x{H})")


# ================================================================
#  ICON VARIANTS
# ================================================================

def save_icons(icon):
    # transparent
    tp = f"{OUTPUT}\\buckflow-icon-transparent-512.png"
    icon.resize((512, 512), Image.LANCZOS).save(tp, "PNG")
    print(f"  + {tp}")

    for sz, bg, tag in [
        (512, WHITE, "light-512"), (256, WHITE, "light-256"),
        (128, WHITE, "light-128"), (64,  WHITE, "light-64"),
        (32,  WHITE, "light-32"),
        (512, SLATE, "dark-512"),  (256, SLATE, "dark-256"),
        (128, SLATE, "dark-128"),  (64,  SLATE, "dark-64"),
    ]:
        out = Image.new("RGB", (sz, sz), bg)
        r = icon.resize((sz, sz), Image.LANCZOS)
        out.paste(r, (0, 0), r)
        p = f"{OUTPUT}\\buckflow-icon-{tag}.png"
        out.save(p, "PNG")
        print(f"  + {p}")


# ================================================================
#  MAIN
# ================================================================
if __name__ == "__main__":
    print("BuckFlow AI -- Logo Generator v2")
    print("=" * 40)

    print("\nRendering icon (4x supersample)...")
    icon = create_icon(800)

    print("\nLogos:")
    build_logo(icon, WHITE, SLATE, "light")
    build_logo(icon, SLATE, WHITE, "dark")

    print("\nIcons:")
    save_icons(icon)

    print("\nDone -- all assets in", OUTPUT)
