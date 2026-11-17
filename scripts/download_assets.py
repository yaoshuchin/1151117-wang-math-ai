import json
import os
import urllib.request
import urllib.parse
import hashlib

os.makedirs('assets', exist_ok=True)

with open('data_clean.json', 'r', encoding='utf-8') as f:
    board_data = json.load(f)

# Wallpaper
wallpaper_url = "https://v1.padlet.pics/1/image?t=c_lfill,dpr_1,f_auto,g_auto,h_1080,q_auto:best,w_1920&url=https%3A%2F%2Fpadlet-uploads-usc1.storage.googleapis.com%2F1726799469%2Fff1c00a8dc04c01be9f4f218505e7140%2F202611__________________.jpg"
logo_url = "https://v1.padlet.pics/1/image?t=c_thumb,dpr_1,g_auto,h_180,w_180&url=https%3A%2F%2Fpadlet-uploads-usc1.storage.googleapis.com%2F1726799469%2F608a3cdcf56b4715531b39773d496f33%2FQ_____LOGO.png"

def download_file(url, local_path):
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = resp.read()
            with open(local_path, 'wb') as f:
                f.write(data)
            print(f"Downloaded: {local_path} ({len(data)} bytes)")
            return True
    except Exception as e:
        print(f"Failed to download {url}: {e}")
        return False

download_file(wallpaper_url, "assets/wallpaper.jpg")
download_file(logo_url, "assets/logo.png")

# Now download preview images for all cards
img_map = {}
for s in board_data:
    for c in s['cards']:
        for im in c['imgs']:
            src = im['src']
            if not src or 'avatar' in src:
                continue
            # Generate deterministic filename
            h = hashlib.md5(src.encode('utf-8')).hexdigest()[:12]
            ext = '.webp'
            if '.png' in src.lower():
                ext = '.png'
            elif '.jpg' in src.lower() or '.jpeg' in src.lower():
                ext = '.jpg'
            elif '.gif' in src.lower():
                ext = '.gif'
            local_fname = f"assets/img_{h}{ext}"
            if src not in img_map:
                if not os.path.exists(local_fname):
                    download_file(src, local_fname)
                img_map[src] = local_fname
            im['local_src'] = img_map[src]

with open('data_clean.json', 'w', encoding='utf-8') as f:
    json.dump(board_data, f, ensure_ascii=False, indent=2)

print("Asset download finished!")
