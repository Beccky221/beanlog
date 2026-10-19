# Handwritten typeface

## Current English typeface

Sounso Quality (internal name: A019-Sounso Quality), copyright Sichuan SounSo
Brand Poanning Co.,Ltd / 上首品牌策划有限公司.
Source: the user's `Sounso-Quality.zip`, provided on 2026-10-18.
The archive contains `No.019-Sounso-Quality-2.ttf` only. Font metadata refers to
https://www.ssfonts.com/ for licensing; no license agreement was supplied in the
archive. See SounsoQuality-NOTICE.txt. This font is not open source or SIL OFL.

The original glyphs and internal names are retained in WOFF2 packaging. Used for
Latin letters throughout the interface, form controls, placeholder SVGs and
exported posters. Chinese titles now use YouSheBiaoTiHei, and body text and parameter numbers use Smiley Sans Oblique.
The latest local preview uses this font; no automatic GitHub publication occurs.

## Current Chinese typefaces (2026-10-18)

- Titles: 优设标题黑 / YouSheBiaoTiHei. Original WOFF2 distribution mirror:
  https://github.com/gechaofantianwang/my-fonts/blob/main/YouSheBiaoTiHei-Regular.woff2
  Original publisher and usage announcement:
  https://www.uisdc.com/uisdc-first-free-font
  See YouSheBiaoTiHei-NOTICE.txt for the embedded copyright and source notice.
- Body text, form controls and parameter numbers: 得意黑 / Smiley Sans Oblique,
  official v2.0.1 TTF-flavoured WOFF2 from
  https://github.com/atelier-anchor/smiley-sans/releases/tag/v2.0.1
  Distributed under SIL OFL 1.1; see SmileySans-OFL.txt.

Both files retain their original glyph outlines and natural inclination.
No extra CSS slant or glyph transformation is applied. The user explicitly
selected Smiley Sans for body text and parameter values. Latin letters continue
to use Sounso Quality through its existing CSS unicode ranges. UI headings and
poster titles use the title family; UI body text and poster captions use the
body family. Font files and notices are bundled for offline and single-file use.

## Previous English handwriting

Patrick Hand Regular, by Patrick Wagesreiter. Distributed under SIL Open Font
License 1.1; see PatrickHand-OFL.txt.
Official source: https://github.com/google/fonts/tree/main/ofl/patrickhand
Google Fonts download: https://fonts.gstatic.com/s/patrickhand/v25/LDI1apSQOAYtSuYWp8ZhfYeMWQ.ttf
The original font is packaged as WOFF2 without changing its glyphs or names.

Previously used for Latin letters throughout the interface, form controls, bag placeholders
and exported posters. CSS unicode ranges preserve the existing Chinese and
numeric glyphs. The font is bundled locally, including in the single-file HTML
and placeholder SVG, so display does not require a network font request.

## Previous Chinese handwriting

LXGW WenKai Regular (v1.311), by lxgw, based on Klee One.
Distributed under SIL Open Font License 1.1; see OFL.txt.

Upstream: https://github.com/lxgw/LxgwWenKai
Webfont distribution: @fontsource/lxgw-wenkai 5.2.5
https://cdn.jsdelivr.net/npm/@fontsource/lxgw-wenkai@5.2.5/files/lxgw-wenkai-latin-500-normal.woff2

The webfont contains Chinese glyphs despite the distribution's `latin` filename.

## Previous journal page titles

Beanlog Journal Title is a renamed title-only subset of Yozai Regular, by lxgw,
based on Y.OzFont. SIL OFL 1.1; see Yozai-OFL.txt.
Upstream: https://github.com/lxgw/yozai-font
Source snapshot: https://github.com/William-Weng/Fork-yozai-font/blob/master/ttf/Yozai-Regular.ttf
Only the fixed page-heading glyphs are included, keeping the local HTML compact.

## Previous library lettering

Beanlog Library Ink contains two original, hand-drawn outline glyphs: 豆 and 库.
The tapered strokes are drawn specifically for the library heading. No external
font outlines are used. It inherits the active theme's ink color and is bundled
with the app for offline use.

To regenerate: `python3 scripts/build-library-title.py` (requires fontTools;
compression uses Python Brotli when available, otherwise Node.js).
