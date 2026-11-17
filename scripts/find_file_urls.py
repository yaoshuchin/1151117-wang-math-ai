import re

with open('scripts/padlet_raw.html', 'r', encoding='utf-8') as f:
    text = f.read()

urls = re.findall(r'https?://[^\s"\'<>]+', text)
file_urls = [u for u in urls if any(ext in u.lower() for ext in ['.pdf', '.pptx', '.ppt', '.png', '.jpg', '.webp', '.gif', 'download=1'])]
print('Total file URLs:', len(file_urls))
unique_urls = sorted(list(set(file_urls)))
for u in unique_urls:
    print(u)
