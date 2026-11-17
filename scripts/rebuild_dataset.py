import json
import os
import urllib.parse

with open('data_clean.json', 'r', encoding='utf-8') as f:
    board_data = json.load(f)

# Mapping of card subject substrings to local PDF files
pdf_map = {
    '數學領綱': 'assets/pdf/數學領綱.pdf',
    '數學學習內容解析': 'assets/pdf/數學領域課程手冊_國小篇.pdf',
    '202605-各年級數學學習銜接問題分析': 'assets/pdf/202605-各年級數學學習銜接問題分析.pdf',
    '202605篩選測驗結果運用-G2': 'assets/pdf/202605篩選測驗結果運用-G2.pdf',
    '202605篩選測驗結果運用-G4': 'assets/pdf/202605篩選測驗結果運用-G4.pdf',
    '202605篩選測驗結果運用-G5': 'assets/pdf/202605篩選測驗結果運用-G5.pdf',
    '基本學習內容脈絡': 'assets/pdf/基本學習內容脈絡.pdf',
    '一年級基本學習內容': 'assets/pdf/一年級基本學習內容.pdf',
    '二年級基本學習內容': 'assets/pdf/二年級基本學習內容.pdf',
    '三年級基本學習內容': 'assets/pdf/三年級基本學習內容.pdf',
    '四年級基本學習內容': 'assets/pdf/四年級基本學習內容.pdf',
    '五年級基本學習內容': 'assets/pdf/五年級基本學習內容.pdf',
    '六年級基本學習內容': 'assets/pdf/六年級基本學習內容.pdf',
}

# Avatar image hashes to filter out
AVATAR_HASHES = ['img_5c78d555e9b0']

for s in board_data:
    for c in s['cards']:
        subj = c['subject'].strip()
        
        # 1. Filter out avatar images!
        cleaned_imgs = []
        for im in c.get('imgs', []):
            src = im.get('local_src') or im.get('src') or ''
            if any(h in src for h in AVATAR_HASHES):
                continue
            if 'avatar' in src.lower() or 'identicon' in src.lower() or 'googleusercontent.com' in src.lower():
                continue
            cleaned_imgs.append(im)
        c['imgs'] = cleaned_imgs

        # 2. Check if this card matches a local PDF
        c['pdf_file'] = None
        for key, pdf_path in pdf_map.items():
            if key in subj:
                if os.path.exists(pdf_path):
                    c['pdf_file'] = pdf_path
                    c['has_pdf'] = True
                    # add file size info
                    sz_mb = round(os.path.getsize(pdf_path) / (1024 * 1024), 2)
                    c['pdf_size'] = f"{sz_mb} MB" if sz_mb >= 1 else f"{round(os.path.getsize(pdf_path)/1024)} KB"
                    c['att_name'] = os.path.basename(pdf_path)
                    c['att_cat'] = f"PDF 文件 · {c['pdf_size']}"
                break

        # 3. Category styling
        bg_class = c.get('color_class', '')
        if 'scarlet' in bg_class:
            c['category'] = {'key': 'red', 'name': '平台與功能說明', 'badgeClass': 'bg-rose-500/20 text-rose-300 border-rose-500/40', 'borderClass': 'border-rose-500/50', 'cardBg': 'bg-rose-950/40'}
        elif 'canary' in bg_class:
            c['category'] = {'key': 'yellow', 'name': 'AI 協作提示詞', 'badgeClass': 'bg-amber-500/20 text-amber-300 border-amber-500/40', 'borderClass': 'border-amber-500/50', 'cardBg': 'bg-amber-950/40'}
            c['is_prompt'] = True
        elif 'park' in bg_class:
            c['category'] = {'key': 'green', 'name': '重點說明與角色', 'badgeClass': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', 'borderClass': 'border-emerald-500/50', 'cardBg': 'bg-emerald-950/40'}
        elif 'oceanic' in bg_class:
            c['category'] = {'key': 'blue', 'name': '必須提供 AI 的資料', 'badgeClass': 'bg-sky-500/20 text-sky-300 border-sky-500/40', 'borderClass': 'border-sky-500/50', 'cardBg': 'bg-sky-950/40'}
        else:
            c['category'] = {'key': 'gray', 'name': '學習教材與資源', 'badgeClass': 'bg-slate-500/20 text-slate-300 border-slate-500/40', 'borderClass': 'border-slate-600/50', 'cardBg': 'bg-slate-900/60'}

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

with open('data.js', 'w', encoding='utf-8') as f:
    f.write(f"// Generated Padlet Board Dataset with Real Local PDFs\nwindow.PADLET_DATA = {json.dumps(meta, ensure_ascii=False, indent=2)};\n")

print(f"data.js updated! Total cards: {meta['totalCards']}")
# Print cards with PDFs and cards with images vs pure text
n_with_img = sum(1 for s in board_data for c in s['cards'] if len(c['imgs']) > 0)
n_with_pdf = sum(1 for s in board_data for c in s['cards'] if c.get('pdf_file'))
n_pure_text = sum(1 for s in board_data for c in s['cards'] if len(c['imgs']) == 0 and not c.get('pdf_file'))
print(f"Cards with Images: {n_with_img}, Cards with PDFs: {n_with_pdf}, Pure Text Cards: {n_pure_text}")
