import json

with open('data_clean.json', 'r', encoding='utf-8') as f:
    board = json.load(f)

for s in board:
    sec_name = s['section']
    cards = s['cards']
    print(f"\n==========================================")
    print(f"=== Section: {sec_name} ({len(cards)} cards) ===")
    print(f"==========================================")
    for i, c in enumerate(cards):
        print(f"\n[{i+1}] [{c['color_class']}] {c['subject']}")
        if c['body']:
            print(f"  📝 內文: {c['body'][:120]}...")
        if c['att_name'] or c['att_cat']:
            print(f"  📎 附件資訊: {c['att_name']} | 類別/網域: {c['att_cat']}")
        if c['att_caption']:
            print(f"  💬 附件說明: {c['att_caption']}")
        for l in c['links']:
            if 'padlet.com/t4132' not in l['href']:
                print(f"  🔗 連結: {l['href']} ({l['text']})")
        for im in c['imgs']:
            print(f"  🖼️ 圖片: {im['src'][:90]}...")
