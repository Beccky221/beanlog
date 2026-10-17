# Handwritten typeface

## English handwriting

Patrick Hand Regular, by Patrick Wagesreiter. Distributed under SIL Open Font
License 1.1; see PatrickHand-OFL.txt.
Official source: https://github.com/google/fonts/tree/main/ofl/patrickhand
Google Fonts download: https://fonts.gstatic.com/s/patrickhand/v25/LDI1apSQOAYtSuYWp8ZhfYeMWQ.ttf
The original font is packaged as WOFF2 without changing its glyphs or names.

Used for Latin letters throughout the interface, form controls, bag placeholders
and exported posters. CSS unicode ranges preserve the existing Chinese and
numeric glyphs. The font is bundled locally, including in the single-file HTML
and placeholder SVG, so display does not require a network font request.

## Chinese handwriting

LXGW WenKai Regular (v1.311), by lxgw, based on Klee One.
Distributed under SIL Open Font License 1.1; see OFL.txt.

Upstream: https://github.com/lxgw/LxgwWenKai
Webfont distribution: @fontsource/lxgw-wenkai 5.2.5
https://cdn.jsdelivr.net/npm/@fontsource/lxgw-wenkai@5.2.5/files/lxgw-wenkai-latin-500-normal.woff2

The webfont contains Chinese glyphs despite the distribution's `latin` filename.

## Journal page titles

Beanlog Journal Title is a renamed title-only subset of Yozai Regular, by lxgw,
based on Y.OzFont. SIL OFL 1.1; see Yozai-OFL.txt.
Upstream: https://github.com/lxgw/yozai-font
Source snapshot: https://github.com/William-Weng/Fork-yozai-font/blob/master/ttf/Yozai-Regular.ttf
Only the fixed page-heading glyphs are included, keeping the local HTML compact.

## Library lettering

Beanlog Library Ink contains two original, hand-drawn outline glyphs: 豆 and 库.
The tapered strokes are drawn specifically for the library heading. No external
font outlines are used. It inherits the active theme's ink color and is bundled
with the app for offline use.

To regenerate: `python3 scripts/build-library-title.py` (requires fontTools;
compression uses Python Brotli when available, otherwise Node.js).
