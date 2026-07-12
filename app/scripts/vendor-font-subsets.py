"""Download latin-ext + vietnamese subsets from Google Fonts and print @font-face CSS.

Run: uv run --with certifi python3 scripts/vendor-font-subsets.py
One-time tool; kept for reproducibility.
"""
import re
import ssl
import urllib.request
from pathlib import Path

import certifi

SSL_CTX = ssl.create_default_context(cafile=certifi.where())

UA = ('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
      '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
FAMILIES = [
    ('nunito-sans', 'normal', 'font-weight: 200 1000;\n  font-stretch: 100%;',
     'https://fonts.googleapis.com/css2?family=Nunito+Sans:opsz,wght@6..12,200..1000&display=swap',
     'Nunito Sans'),
    ('source-serif-4', 'normal', 'font-weight: 200 900;',
     'https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,200..900&display=swap',
     'Source Serif 4'),
    ('source-serif-4-italic', 'italic', 'font-weight: 200 900;',
     'https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@1,8..60,200..900&display=swap',
     'Source Serif 4'),
]
WANTED = ('latin-ext', 'vietnamese')
out_dir = Path(__file__).resolve().parent.parent / 'src/fonts'


def fetch(url):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    return urllib.request.urlopen(req, context=SSL_CTX).read()


css_out = []
for slug, style, weight_css, api, family in FAMILIES:
    css = fetch(api).decode()
    for subset, block in re.findall(r'/\* (\w[\w-]*) \*/\s*@font-face\s*\{(.*?)\}', css, re.S):
        if subset not in WANTED:
            continue
        url = re.search(r'url\((\S+?\.woff2)\)', block).group(1)
        urange = re.search(r'unicode-range:\s*([^;]+);', block).group(1).strip()
        fname = f'{slug}-{subset}.woff2'
        (out_dir / fname).write_bytes(fetch(url))
        css_out.append(
            f"/* {subset} - Yoruba orthography (s-dot, e-dot, o-dot + tone marks) */\n"
            f"@font-face {{\n  font-family: '{family}';\n  font-style: {style};\n"
            f"  {weight_css}\n  font-display: swap;\n"
            f"  src: url(./{fname}) format('woff2');\n  unicode-range: {urange};\n}}")
        print('vendored', fname)
print('\n---- append to src/fonts/fonts.css ----\n')
print('\n'.join(css_out))
