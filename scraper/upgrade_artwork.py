import sys
import os
import json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from scrape_engine import find_hq_artwork, find_youtube_id

def upgrade_artworks():
    with open('scraper/scraped_songs.json', 'r', encoding='utf-8') as f:
        songs = json.load(f)

    print(f"Upgrading artwork for {len(songs)} songs...")
    for s in songs:
        old_url = s.get('coverUrl')
        yt_id = s.get('youtubeId')
        if not yt_id:
            yt_id = find_youtube_id(s['title'], s['movie'])
            s['youtubeId'] = yt_id
        
        new_art = find_hq_artwork(s['title'], s['movie'], yt_id=yt_id, og_fallback=old_url)
        s['coverUrl'] = new_art
        s['backdropUrl'] = new_art
        print(f"[+] {s['title']} -> {new_art[:70]}...")

    with open('scraper/scraped_songs.json', 'w', encoding='utf-8') as f:
        json.dump(songs, f, ensure_ascii=False, indent=2)

    # Re-export to src/scrapedData.ts
    ts_lines = [
        "// Auto-generated catalog from Automated Scraper Engine",
        "import { Song } from './data';",
        "",
        "export const scrapedCatalog: Song[] = ["
    ]
    for s in songs:
        ts_lines.append('  ' + json.dumps(s, ensure_ascii=False, indent=4).replace('\n', '\n  ') + ',')
    ts_lines.append('];\n')

    with open('src/scrapedData.ts', 'w', encoding='utf-8') as f:
        f.write('\n'.join(ts_lines))

    print("\n[SUCCESS] Updated catalog with safe high-res Apple Music & YouTube CDN artwork!")

if __name__ == '__main__':
    upgrade_artworks()
