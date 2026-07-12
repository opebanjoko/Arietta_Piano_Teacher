"""Every non-ASCII character in course.js must exist in the vendored fonts.

Run: uvx --from fonttools --with brotli python3 scripts/check-font-coverage.py
"""
import sys
from pathlib import Path
from fontTools.ttLib import TTFont

APP = Path(__file__).resolve().parent.parent
FONTS = {
    'Nunito Sans': [
        'nunito-sans-400-latin.woff2',
        'nunito-sans-latin-ext.woff2',
        'nunito-sans-vietnamese.woff2',
    ],
    'Source Serif 4': [
        'source-serif-4-500-latin.woff2',
        'source-serif-4-latin-ext.woff2',
        'source-serif-4-vietnamese.woff2',
    ],
    'Source Serif 4 Italic': [
        'source-serif-4-italic-500-latin.woff2',
        'source-serif-4-italic-latin-ext.woff2',
        'source-serif-4-italic-vietnamese.woff2',
    ],
}

course = (APP / 'src/content/course.js').read_text()
# musical symbols (U+2669-266F) render via Noto Music / system fallback by design
chars = sorted({ch for ch in course if ord(ch) > 127 and not 0x2669 <= ord(ch) <= 0x266F})
failed = False
for family, files in FONTS.items():
    cmap = set()
    for f in files:
        p = APP / 'src/fonts' / f
        if not p.exists():
            print(f'MISSING FILE for {family}: {f}')
            failed = True
            continue
        cmap |= set(TTFont(p).getBestCmap())
    missing = [c for c in chars if ord(c) not in cmap]
    if missing:
        print(f'MISSING in {family}:', [f'{c} U+{ord(c):04X}' for c in missing])
        failed = True
print(f'checked {len(chars)} non-ASCII chars across {len(FONTS)} families')
sys.exit(1 if failed else 0)
