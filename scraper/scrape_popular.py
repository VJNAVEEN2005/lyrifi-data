import sys
import os
sys.path.insert(0, os.path.abspath('.'))
from scraper.scrape_engine import scrape_song, run_scraper
import json

popular_urls = [
    'https://www.tamil2lyrics.com/lyrics/vaathi-coming-song-lyrics/',
    'https://www.tamil2lyrics.com/lyrics/arabic-kuthu-song-lyrics/',
    'https://www.tamil2lyrics.com/lyrics/katchi-sera-song-lyrics/',
    'https://www.tamil2lyrics.com/lyrics/kaavaalaa-song-lyrics/',
    'https://www.tamil2lyrics.com/lyrics/naa-ready-song-lyrics/',
    'https://www.tamil2lyrics.com/lyrics/marakkuma-nenjam-song-lyrics/',
    'https://www.tamil2lyrics.com/lyrics/chilla-chilla-song-lyrics/',
    'https://www.tamil2lyrics.com/lyrics/badass-song-lyrics/',
    'https://www.tamil2lyrics.com/lyrics/hukum-thalaivar-alappara-song-lyrics/',
    'https://www.tamil2lyrics.com/lyrics/matta-song-lyrics-goat/',
    'https://www.tamil2lyrics.com/lyrics/whistle-podu-song-lyrics/',
    'https://www.tamil2lyrics.com/lyrics/spark-song-lyrics-goat/'
]

out_file = 'scraper/scraped_songs.json'
with open(out_file, 'r', encoding='utf-8') as f:
    existing = {s['slug']: s for s in json.load(f)}

print(f'Starting with {len(existing)} songs.')

for url in popular_urls:
    slug = url.rstrip('/').split('/')[-1]
    if slug in existing:
        print(f'Skipping {slug}, already exists.')
        continue
    print(f'Scraping popular hit: {slug}...')
    s = scrape_song(url, fetch_yt=True)
    if s:
        existing[slug] = s

all_songs = list(existing.values())
with open(out_file, 'w', encoding='utf-8') as f:
    json.dump(all_songs, f, ensure_ascii=False, indent=2)

with open('backend/src/songs.json', 'w', encoding='utf-8') as f:
    json.dump(all_songs, f, ensure_ascii=False, indent=2)

print(f'Done! Total catalog now has {len(all_songs)} songs.')
