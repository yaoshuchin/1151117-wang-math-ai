import json

with open('data_clean.json', 'r', encoding='utf-8') as f:
    board = json.load(f)

for s in board:
    print(f"\n=== Section: {s['section']} ===")
    for c in s['cards']:
        imgs = [im for im in c.get('imgs', []) if 'avatar' not in im.get('src', '')]
        links = c.get('links', [])
        att_name = c.get('att_name')
        att_cat = c.get('att_cat')
        att_caption = c.get('att_caption')
        print(f"Card: {c['subject']}")
        print(f"  imgs: {len(imgs)} -> {[im.get('local_src', im.get('src')) for im in imgs]}")
        print(f"  att: {att_name} | {att_cat} | caption: {att_caption}")
        ext_links = [l['href'] for l in links if 'padlet.com/t4132' not in l['href']]
        print(f"  links: {ext_links}")
