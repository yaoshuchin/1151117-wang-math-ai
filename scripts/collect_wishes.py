from bs4 import BeautifulSoup

with open('scripts/padlet_raw.html', 'r', encoding='utf-8') as f:
    soup = BeautifulSoup(f.read(), 'html.parser')

wish_links = []
posts = soup.find_all(attrs={'data-testid': 'surfacePost'})
for p in posts:
    subj = p.find(attrs={'data-testid': 'postSubject'})
    s_title = subj.get_text().strip() if subj else 'No Subject'
    for a in p.find_all('a'):
        href = a.get('href', '')
        if '/wish/' in href:
            wish_links.append({'title': s_title, 'wish_url': href})

print(f"Total wish links found: {len(wish_links)}")
for w in wish_links:
    print(f"- {w['title']} -> {w['wish_url']}")
