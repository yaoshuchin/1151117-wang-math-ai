from bs4 import BeautifulSoup
import re

with open('scripts/padlet_raw.html', 'r', encoding='utf-8') as f:
    soup = BeautifulSoup(f.read(), 'html.parser')

posts = soup.find_all(attrs={'data-testid': 'surfacePost'})
for p in posts:
    subj = p.find(attrs={'data-testid': 'postSubject'})
    s_title = subj.get_text().strip() if subj else 'No Subject'
    
    # check all <a> in p
    for a in p.find_all('a'):
        href = a.get('href', '')
        if 'padlet.com/t4132' not in href and not href.startswith('javascript:'):
            print(f"[{s_title}] a.href = {href[:100]} | text = {a.get_text().strip()[:40]}")
            
    # check all img in p
    for img in p.find_all('img'):
        src = img.get('src', '')
        if 'avatar' not in src:
            print(f"[{s_title}] img.src = {src[:120]}")
