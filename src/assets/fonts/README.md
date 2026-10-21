# Handwritten typeface

## Current Latin body and numeric font (2026-10-20)

Source Serif 4 Regular (weight 400, text optical size) is bundled as
`SourceSerif4-Regular.woff2`, downloaded unchanged from Adobe's official
release branch: https://github.com/adobe-fonts/source-serif/tree/release/WOFF2/TTF
Original file: `SourceSerif4-Regular.ttf.woff2`. Distributed under SIL OFL 1.1;
the original license is retained in `SourceSerif4-OFL.md` and public font notices.
English detail text, card numbers, input values, poster captions and placeholder
Latin lettering use this font; Chinese body text remains 经典隶变简 and large
titles retain the existing display families. Body numbers use lining tabular
figures. The font is included in the offline single-file HTML.

## Previous card Latin letters and digits (2026-10-19)

`LoveIsFree-Regular.woff2` is packaged from the user's `Love-is-free.zip`
(`Love-is-free-2.ttf`, internal family LOVEISFREE / Love is free).
Original outlines and font names are unchanged. Replaced at the user’s request
by the system sans-serif style used for COLLECTION; this font is no longer
referenced by the current interface. Previously used for Latin letters and
digits in the home directory cards, bean-library cards and bean-detail fields, with a unicode range
that preserves Chinese title/body typography. English and digit glyph coverage
was checked before packaging. See `LoveIsFree-NOTICE.txt` for source attribution.

## Current UI font roles (2026-10-19)

Latest Chinese body selection: user-supplied **经典隶变简**, from
`经典隶变简.zip` (2026-10-19). Bundled as `JingDianLibianJian-Regular.woff2`,
via a CJK-only font face named `Coffee Lab Libian`. Latin letters and numbers
retain the system sans-serif stack. Page and directory titles are unchanged.
The font's original outlines and name records are retained. Its legacy format-4
cmap contains out-of-bounds entries; the webfont rebuilds this table from valid
original mappings, omitting invalid entries. The archive's website copyright
notice is retained in `JingDianLibianJian-NOTICE.txt`; it is not an OFL font.
The webfont is bundled into the single-file HTML for phone and offline display.

Page headings and the directory's large chapter titles retain Sounso Quality
for Latin letters and YouSheBiaoTiHei for Chinese. Detail text, small labels,
buttons, inputs and parameter numbers use a regular-weight system sans-serif
stack: Apple system / Segoe UI, PingFang SC / Hiragino Sans GB / Noto Sans CJK SC /
Microsoft YaHei, with a generic sans-serif fallback. English detail text follows
the same stack. These fonts are supplied by the device, require no download,
and remain available offline. Poster captions and placeholder-label details
use the same clean sans-serif style. Smiley Sans remains only as a title fallback.

The sections below document earlier font choices and bundled font sources.

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
