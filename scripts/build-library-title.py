"""将自绘的「豆库」题字轮廓制成小型字体；无需外部字体素材。"""
from pathlib import Path
import subprocess
import sys
import types

# 没有 Python Brotli 扩展时，使用项目开发环境自带的 Node.js 压缩器。
try:
    import brotli  # noqa: F401
except ImportError:
    brotli = types.ModuleType('brotli')
    brotli.MODE_FONT = 2
    def compress(data, mode=2):
        js = "const z=require('node:zlib'),f=require('node:fs');process.stdout.write(z.brotliCompressSync(f.readFileSync(0),{params:{[z.constants.BROTLI_PARAM_MODE]:2,[z.constants.BROTLI_PARAM_QUALITY]:11}}))"
        return subprocess.run(['node', '-e', js], input=data, stdout=subprocess.PIPE, check=True).stdout
    brotli.compress = compress
    sys.modules['brotli'] = brotli

from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.pens.transformPen import TransformPen
from fontTools.svgLib.path import parse_path

ROOT = Path(__file__).resolve().parents[1]

# 笔画以屏幕坐标绘制，每笔独立封闭，保留起笔、行笔、收锋的宽度变化。
STROKES = {
    '豆': [
        'M 13 14 C 27 13 44 11 60 10 C 63 10 65 9 67 8 L 65 12 C 50 14 28 16 16 17 C 14 17 13 16 13 14 Z',
        'M 20 27 L 24 28 C 23 34 25 40 25 46 L 22 49 C 20 44 20 35 18 29 Z',
        'M 21 27 C 31 26 44 24 53 23 L 59 22 L 61 25 C 59 30 57 38 55 44 L 51 46 C 52 39 54 31 54 27 C 43 28 32 30 24 30 Z',
        'M 24 43 C 33 42 43 41 53 40 L 55 43 C 46 45 35 46 25 47 Z',
        'M 27 54 C 30 55 33 59 34 63 C 34 65 33 66 31 66 C 29 63 28 59 26 56 Z',
        'M 49 51 L 53 54 C 49 60 44 64 40 66 L 39 65 C 43 60 46 56 49 51 Z',
        'M 10 76 C 23 74 41 72 56 70 C 62 69 66 68 70 66 L 68 71 C 54 75 35 78 17 80 C 14 81 12 79 10 76 Z',
    ],
    '库': [
        'M 36 6 C 40 6 44 9 46 13 L 44 18 C 40 16 37 11 36 6 Z',
        'M 17 25 C 33 24 48 22 63 20 L 69 18 L 67 23 C 53 26 35 28 20 28 Z',
        'M 19 27 L 24 26 C 25 40 21 56 15 67 C 11 74 7 78 3 81 L 3 79 C 14 64 19 47 19 27 Z',
        'M 29 39 C 42 37 54 36 64 33 L 69 34 L 66 38 C 54 40 40 42 31 42 Z',
        'M 44 31 L 49 32 C 44 42 37 51 32 55 C 40 55 53 53 62 50 L 66 52 L 63 55 C 51 58 38 59 30 60 L 25 57 C 34 49 40 40 44 31 Z',
        'M 22 68 C 38 65 54 63 69 59 L 73 61 L 70 64 C 56 68 39 71 25 72 Z',
        'M 49 45 L 54 44 C 54 54 51 67 51 77 C 51 82 50 86 48 89 L 45 85 C 47 73 49 61 49 45 Z',
    ],
}


def build():
    builder = FontBuilder(1000, isTTF=True)
    names = ['.notdef', 'dou', 'ku']
    builder.setupGlyphOrder(names)
    builder.setupCharacterMap({ord('豆'): 'dou', ord('库'): 'ku'})
    glyphs = {'.notdef': TTGlyphPen(None).glyph()}
    for char, name in [('豆', 'dou'), ('库', 'ku')]:
        pen = TTGlyphPen(None)
        curves = Cu2QuPen(pen, max_err=1, reverse_direction=True)
        screen = TransformPen(curves, (10, 0, 0, -10, 30, 880))
        for path in STROKES[char]:
            parse_path(path, screen)
        glyphs[name] = pen.glyph()
    builder.setupGlyf(glyphs)
    builder.setupHorizontalMetrics({name: (820, 30) for name in names})
    builder.setupHorizontalHeader(ascent=920, descent=-80)
    builder.setupNameTable({
        'familyName': 'Beanlog Library Ink', 'styleName': 'Regular',
        'uniqueFontIdentifier': 'BeanlogLibraryInk-Regular-1.0',
        'fullName': 'Beanlog Library Ink Regular', 'psName': 'BeanlogLibraryInk-Regular',
        'version': 'Version 1.0',
        'copyright': 'Original lettering for Beanlog, 2026.',
    })
    builder.setupOS2(sTypoAscender=920, sTypoDescender=-80, sTypoLineGap=0, usWinAscent=920, usWinDescent=80)
    builder.setupPost()
    builder.setupMaxp()
    builder.font.save('/private/tmp/BeanlogLibraryInk.ttf')
    builder.font.flavor = 'woff2'
    builder.font.save(ROOT / 'src/assets/fonts/BeanlogLibraryInk.woff2')


if __name__ == '__main__':
    build()
