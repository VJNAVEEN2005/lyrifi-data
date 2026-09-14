import json
import os
import re
import sys
import time
import urllib.request
from bs4 import BeautifulSoup

def clean_html(text: str) -> str:
    return re.sub(r'<[^>]+>', '', text).strip()

def fetch_apple_artwork(title: str, movie: str = '', year: int = None) -> str:
    queries = []
    if title and movie and movie != 'Tamil Song':
        queries.append(f"{title} {movie}")
    if title:
        queries.append(title)
    if movie and movie != 'Tamil Song':
        queries.append(movie)

    for q in queries:
        try:
            url = f"https://itunes.apple.com/search?term={urllib.parse.quote(q)}&entity=song&limit=3"
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=5) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                results = data.get('results', [])
                for r in results:
                    art = r.get('artworkUrl100', '')
                    if art:
                        return art.replace('100x100bb.jpg', '800x800bb.jpg')
        except Exception:
            pass
    return ''

def scrape_song(slug: str) -> dict | None:
    url = f"https://www.tamil2lyrics.com/lyrics/{slug}/"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            html = resp.read().decode('utf-8', errors='ignore')
    except Exception as e:
        return None

    soup = BeautifulSoup(html, 'html.parser')

    # Title
    h1 = soup.find('h1')
    raw_title = h1.get_text(strip=True) if h1 else slug
    clean_title = re.sub(r'\s*lyrics\s*$', '', raw_title, flags=re.I).strip()

    # Meta tags (Movie, Singers, Lyricist, Composer)
    meta_text = html.lower()
    movie = 'Tamil Song'
    movie_match = re.search(r'movie\s*:\s*<[^>]+>([^<]+)<', html, flags=re.I) or re.search(r'movie\s*:\s*([^\n<]+)', html, flags=re.I)
    if movie_match:
        movie = movie_match.group(1).strip()

    composer = 'Music Director'
    composer_match = re.search(r'(?:music|music director)\s*:\s*<[^>]+>([^<]+)<', html, flags=re.I) or re.search(r'(?:music|music director)\s*:\s*([^\n<]+)', html, flags=re.I)
    if composer_match:
        composer = composer_match.group(1).strip()

    singers = ['Various Artists']
    singer_match = re.search(r'singers?\s*:\s*<[^>]+>([^<]+)<', html, flags=re.I) or re.search(r'singers?\s*:\s*([^\n<]+)', html, flags=re.I)
    if singer_match:
        s_raw = singer_match.group(1).strip()
        singers = [s.strip() for s in re.split(r'[,&]', s_raw) if s.strip()]

    lyricist = 'Lyricist'
    lyric_match = re.search(r'lyricist\s*:\s*<[^>]+>([^<]+)<', html, flags=re.I) or re.search(r'lyricist\s*:\s*([^\n<]+)', html, flags=re.I)
    if lyric_match:
        lyricist = lyric_match.group(1).strip()

    # Year detection
    year = 2024
    year_match = re.search(r'\b(19\d{2}|20\d{2})\b', html)
    if year_match:
        year = int(year_match.group(1))

    # Lyrics extraction
    lyrics_tamil = []
    lyrics_tanglish = []

    # Tamil tab
    tamil_div = soup.find('div', {'id': 'Tamil'}) or soup.find('div', {'data-t2l-tab-panel': 'tamil'})
    if tamil_div:
        for p in tamil_div.find_all('p'):
            lines = [l.strip() for l in p.get_text('\n').split('\n') if l.strip()]
            for l in lines:
                if re.search(r'[\u0B80-\u0BFF]', l) or ':' in l:
                    lyrics_tamil.append(l)

    # Tanglish tab / English tab
    english_div = soup.find('div', {'id': 'English'}) or soup.find('div', {'data-t2l-tab-panel': 'english'})
    if english_div:
        for p in english_div.find_all('p'):
            lines = [l.strip() for l in p.get_text('\n').split('\n') if l.strip()]
            for l in lines:
                l_lower = l.lower()
                if not any(skip in l_lower for skip in ['home', 'movies', 'music directors', 'tamil2lyrics', 'copy', 'a+', 'a-']):
                    if not l.startswith('http') and not l_lower.startswith('singers :'):
                        lyrics_tanglish.append(l)

    # Fallback if tabs missing
    if not lyrics_tamil or not lyrics_tanglish:
        for p in soup.find_all('p'):
            lines = [l.strip() for l in p.get_text('\n').split('\n') if l.strip()]
            has_tamil = any(re.search(r'[\u0B80-\u0BFF]', l) for l in lines)
            if has_tamil and not lyrics_tamil:
                lyrics_tamil.extend(lines)
            elif not has_tamil and not lyrics_tanglish and len(lines) > 2:
                lyrics_tanglish.extend(lines)

    # Apple Music Artwork
    cover_url = fetch_apple_artwork(clean_title, movie, year) or '/default-cover.svg'

    return {
        "id": slug.replace('-song-lyrics', ''),
        "slug": slug,
        "title": clean_title,
        "movie": movie,
        "year": year,
        "composer": composer,
        "singers": singers,
        "lyricist": lyricist,
        "coverUrl": cover_url,
        "backdropUrl": cover_url,
        "primaryGlowColor": "#ec4899",
        "secondaryGlowColor": "#f43f5e",
        "duration": "4:00",
        "lyricsTamil": lyrics_tamil,
        "lyricsTanglish": lyrics_tanglish,
        "views": 1
    }

def main():
    limit = int(sys.argv[1]) if len(sys.argv) > 1 else 20
    print(f"Starting batch ingestion (limit: {limit})...")

    with open('backend/src/catalog.json', 'r', encoding='utf-8') as f:
        catalog = json.load(f)

    songs_path = 'backend/src/songs.json'
    existing_songs = []
    if os.path.exists(songs_path):
        with open(songs_path, 'r', encoding='utf-8') as f:
            existing_songs = json.load(f)

    existing_slugs = {s['slug'] for s in existing_songs if 'slug' in s}
    print(f"Existing songs in database: {len(existing_songs)}")

    to_scrape = [s['s'] for s in catalog['songs'] if s['s'] not in existing_slugs][:limit]
    print(f"Songs to scrape in this batch: {len(to_scrape)}")

    scraped_count = 0
    for i, slug in enumerate(to_scrape):
        print(f"[{i+1}/{len(to_scrape)}] Scraping {slug}...")
        song = scrape_song(slug)
        if song and (song['lyricsTamil'] or song['lyricsTanglish']):
            existing_songs.insert(0, song)
            scraped_count += 1
            print(f"  [OK] Added {song['title']} ({song['movie']}) - {len(song['lyricsTamil'])} Tamil / {len(song['lyricsTanglish'])} Tanglish lines")
        else:
            print(f"  [FAIL] Failed to parse lyrics for {slug}")
        time.sleep(0.3)

    if scraped_count > 0:
        with open(songs_path, 'w', encoding='utf-8') as f:
            json.dump(existing_songs, f, ensure_ascii=False, indent=2)
        print(f"\nSaved {len(existing_songs)} total songs to {songs_path}")

        # Update src/scrapedData.ts
        scraped_ts_content = f"// Auto-generated catalog from verified database\nimport {{ Song }} from './data';\n\nexport const scrapedCatalog: Song[] = {json.dumps(existing_songs, ensure_ascii=False, indent=2)};\n"
        with open('src/scrapedData.ts', 'w', encoding='utf-8') as f:
            f.write(scraped_ts_content)
        print(f"Updated src/scrapedData.ts")

if __name__ == '__main__':
    main()
