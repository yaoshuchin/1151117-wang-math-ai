import json

with open('data_clean.json', 'r', encoding='utf-8') as f:
    board_data = json.load(f)

# Color mapping helper
def map_category(subj, bg_class):
    if 'scarlet' in bg_class:
        return {'key': 'red', 'name': '平台與功能說明', 'badgeClass': 'bg-rose-500/20 text-rose-300 border-rose-500/40', 'borderClass': 'border-rose-500/50', 'cardBg': 'bg-rose-950/40'}
    elif 'canary' in bg_class:
        return {'key': 'yellow', 'name': 'AI 協作提示詞', 'badgeClass': 'bg-amber-500/20 text-amber-300 border-amber-500/40', 'borderClass': 'border-amber-500/50', 'cardBg': 'bg-amber-950/40'}
    elif 'park' in bg_class:
        return {'key': 'green', 'name': '重點說明與角色', 'badgeClass': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', 'borderClass': 'border-emerald-500/50', 'cardBg': 'bg-emerald-950/40'}
    elif 'oceanic' in bg_class:
        return {'key': 'blue', 'name': '必須提供 AI 的資料', 'badgeClass': 'bg-sky-500/20 text-sky-300 border-sky-500/40', 'borderClass': 'border-sky-500/50', 'cardBg': 'bg-sky-950/40'}
    else:
        return {'key': 'gray', 'name': '學習教材與資源', 'badgeClass': 'bg-slate-500/20 text-slate-300 border-slate-500/40', 'borderClass': 'border-slate-600/50', 'cardBg': 'bg-slate-900/60'}

for s in board_data:
    for c in s['cards']:
        cat = map_category(c['subject'], c['color_class'])
        c['category'] = cat
        c['is_prompt'] = cat['key'] == 'yellow'

meta = {
    'title': '放數學一馬－AI 攜手成為千里馬的伯樂',
    'subtitle': '教育部學習扶助科技化評量與 AI 協作分析 · 師資培育中心兼任講師 王玉珍',
    'author': '師資培育中心 兼任講師 王玉珍',
    'password': 'nato',
    'wallpaper': 'assets/wallpaper.jpg',
    'logo': 'assets/logo.png',
    'totalSections': len(board_data),
    'totalCards': sum(len(s['cards']) for s in board_data),
    'sections': board_data
}

js_content = f"// Generated Padlet Board Dataset\nwindow.PADLET_DATA = {json.dumps(meta, ensure_ascii=False, indent=2)};\n"

with open('data.js', 'w', encoding='utf-8') as f:
    f.write(js_content)

print(f"data.js generated successfully! Total cards: {meta['totalCards']}")
