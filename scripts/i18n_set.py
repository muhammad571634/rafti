"""Dev helper: merge keys into src/i18n/locales/en.json (CRLF, 2-space) — usage: python i18n_set.py '<json patch>' [key.to.delete ...]"""
import json
import sys

PATH = 'src/i18n/locales/en.json'


def merge(dst, src):
    for k, v in src.items():
        if isinstance(v, dict) and isinstance(dst.get(k), dict):
            merge(dst[k], v)
        else:
            dst[k] = v


with open(PATH, encoding='utf-8') as f:
    data = json.load(f)

merge(data, json.loads(sys.argv[1]))
for dotted in sys.argv[2:]:
    node = data
    *parents, leaf = dotted.split('.')
    for p in parents:
        node = node[p]
    node.pop(leaf, None)

text = json.dumps(data, ensure_ascii=False, indent=2) + '\n'
with open(PATH, 'w', encoding='utf-8', newline='') as f:
    f.write(text.replace('\n', '\r\n'))
print('i18n ok')
