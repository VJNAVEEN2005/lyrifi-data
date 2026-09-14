import urllib.request
import xml.etree.ElementTree as ET
import json
import re
import os
import sys

def slug_to_title(slug: str) -> str:
    # remove trailing -song-lyrics or -lyrics
    s = re.sub(r'-song-lyrics$', '', slug, flags=re.IGNORECASE)
    s = re.sub(r'-lyrics$', '', s, flags=re.IGNORECASE)
    words = s.split('-')
    return ' '.join(w.capitalize() for w in words if w)

def fetch_sitemap_urls(url: str):
    print(f"Fetching {url}...")
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    with urllib.request.urlopen(req, timeout=30) as resp:
        xml_text = resp.read()
        root = ET.fromstring(xml_text)
        urls = []
        for elem in root.findall('{http://www.sitemaps.org/schemas/sitemap/0.9}url'):
            loc = elem.find('{http://www.sitemaps.org/schemas/sitemap/0.9}loc')
            if loc is not None and loc.text:
                urls.append(loc.text.strip())
        return urls

def main():
    sitemaps = [
        'https://www.tamil2lyrics.com/lyrics-sitemap.xml',
        'https://www.tamil2lyrics.com/lyrics-sitemap2.xml',
        'https://www.tamil2lyrics.com/lyrics-sitemap3.xml',
        'https://www.tamil2lyrics.com/lyrics-sitemap4.xml',
        'https://www.tamil2lyrics.com/lyrics-sitemap5.xml',
    ]

    all_songs = []
    seen_slugs = set()

    for sm in sitemaps:
        try:
            urls = fetch_sitemap_urls(sm)
            print(f"  Got {len(urls)} URLs from {sm}")
            for u in urls:
                m = re.search(r'/lyrics/([a-zA-Z0-9_-]+)/?', u)
                if m:
                    raw_slug = m.group(1)
                    if raw_slug in seen_slugs:
                        continue
                    seen_slugs.add(raw_slug)
                    title = slug_to_title(raw_slug)
                    all_songs.append({
                        's': raw_slug,
                        't': title,
                    })
        except Exception as e:
            print(f"Error fetching {sm}: {e}")

    print(f"\nTotal unique songs extracted: {len(all_songs)}")

    # Fetch album sitemap
    all_albums = []
    seen_album_slugs = set()
    try:
        album_urls = fetch_sitemap_urls('https://www.tamil2lyrics.com/album-sitemap.xml')
        print(f"  Got {len(album_urls)} albums")
        for u in album_urls:
            m = re.search(r'/movie/([a-zA-Z0-9_-]+)/?', u)
            if m:
                raw_slug = m.group(1)
                if raw_slug in seen_album_slugs:
                    continue
                seen_album_slugs.add(raw_slug)
                words = raw_slug.split('-')
                title = ' '.join(w.capitalize() for w in words if w)
                all_albums.append({
                    's': raw_slug,
                    't': title
                })
    except Exception as e:
        print(f"Error fetching album sitemap: {e}")

    print(f"Total unique albums extracted: {len(all_albums)}")

    catalog = {
        'totalSongs': len(all_songs),
        'totalAlbums': len(all_albums),
        'songs': all_songs,
        'albums': all_albums
    }

    os.makedirs('scripts', exist_ok=True)
    os.makedirs('backend/src', exist_ok=True)

    out_file = 'backend/src/catalog.json'
    with open(out_file, 'w', encoding='utf-8') as f:
        json.dump(catalog, f, ensure_ascii=False, separators=(',', ':'))

    print(f"Saved catalog to {out_file} (Size: {os.path.getsize(out_file) / 1024:.1f} KB)")

if __name__ == '__main__':
    main()
