"""
On-Demand Deep Scraper & Full-Album Harvester
=============================================
1. Receives song search query (e.g. "Munbe Vaa", "Kanmani Anbodu").
2. Locates the exact song URL and scrapes verified lyrics immediately.
3. Finds the associated Movie Album page and automatically discovers/scrapes
   ALL remaining songs in that movie album.
4. Synchronizes to database (scraper/scraped_songs.json, backend/src/songs.json, and src/scrapedData.ts).
"""

import sys
import os
import requests
import urllib.parse
from bs4 import BeautifulSoup
import json
import time

sys.path.insert(0, os.path.abspath('.'))
from scraper.scrape_engine import scrape_song, HEADERS

def on_demand_scrape(query, scrape_full_album=True):
    query_clean = query.strip()
    if not query_clean:
        return None, []

    print(f"\n[AI Deep Search] Initiating on-demand search for '{query_clean}'...")
    search_url = f"https://www.tamil2lyrics.com/?s={urllib.parse.quote(query_clean)}"
    
    try:
        r = requests.get(search_url, headers=HEADERS, timeout=12)
        if r.status_code != 200:
            print(f"[-] Search request returned status {r.status_code}")
            return None, []
            
        soup = BeautifulSoup(r.text, 'html.parser')
        candidate_urls = []
        for a in soup.find_all('a', href=True):
            href = a['href']
            if '/lyrics/' in href and href != 'https://www.tamil2lyrics.com/lyrics/' and '/page/' not in href:
                clean = href.split('?')[0].rstrip('/') + '/'
                if clean not in candidate_urls:
                    candidate_urls.append(clean)

        if not candidate_urls:
            print(f"[-] No matching songs discovered for query: {query_clean}")
            return None, []

        target_song_url = candidate_urls[0]
        print(f"[+] Found target match: {target_song_url}")

        # Load existing catalog
        out_file = 'scraper/scraped_songs.json'
        existing_catalog = {}
        if os.path.exists(out_file):
            try:
                with open(out_file, 'r', encoding='utf-8') as f:
                    for s in json.load(f):
                        existing_catalog[s['slug']] = s
            except Exception:
                pass

        # 1. Scrape the target song requested by the user
        target_slug = target_song_url.rstrip('/').split('/')[-1]
        target_song = None
        if target_slug in existing_catalog:
            print(f"[*] Song {target_slug} already exists in catalog.")
            target_song = existing_catalog[target_slug]
        else:
            target_song = scrape_song(target_song_url, fetch_yt=True)
            if target_song:
                existing_catalog[target_slug] = target_song

        if not target_song:
            print(f"[-] Failed to scrape target song: {target_song_url}")
            return None, []

        album_songs_scraped = []

        # 2. Discover & Scrape full movie album automatically if requested
        if scrape_full_album:
            try:
                page_resp = requests.get(target_song_url, headers=HEADERS, timeout=10)
                page_soup = BeautifulSoup(page_resp.text, 'html.parser')
                movie_link = None
                for a in page_soup.find_all('a', href=True):
                    if '/movie/' in a['href']:
                        movie_link = a['href'].split('?')[0].rstrip('/') + '/'
                        break

                if movie_link:
                    print(f"[*] Found movie album: {movie_link}. Discovering other tracks...")
                    m_resp = requests.get(movie_link, headers=HEADERS, timeout=10)
                    m_soup = BeautifulSoup(m_resp.text, 'html.parser')
                    album_urls = []
                    for a in m_soup.find_all('a', href=True):
                        href = a['href']
                        if '/lyrics/' in href and href != 'https://www.tamil2lyrics.com/lyrics/':
                            clean_href = href.split('?')[0].rstrip('/') + '/'
                            if clean_href not in album_urls and clean_href != target_song_url:
                                album_urls.append(clean_href)

                    print(f"[+] Found {len(album_urls)} other tracks in movie album. Ingesting album...")
                    for alb_url in album_urls:
                        alb_slug = alb_url.rstrip('/').split('/')[-1]
                        if alb_slug in existing_catalog:
                            continue
                        alb_song = scrape_song(alb_url, fetch_yt=True)
                        if alb_song:
                            existing_catalog[alb_slug] = alb_song
                            album_songs_scraped.append(alb_song)
                        time.sleep(0.5)

            except Exception as e:
                print(f"[-] Error harvesting album: {e}")

        # Save all changes to catalogs
        all_songs = list(existing_catalog.values())
        with open(out_file, 'w', encoding='utf-8') as f:
            json.dump(all_songs, f, ensure_ascii=False, indent=2)

        os.makedirs('backend/src', exist_ok=True)
        with open('backend/src/songs.json', 'w', encoding='utf-8') as f:
            json.dump(all_songs, f, ensure_ascii=False, indent=2)

        with open('src/scrapedData.ts', 'w', encoding='utf-8') as f:
            f.write("import { Song } from './data';\n\nexport const scrapedCatalog: Song[] = ")
            json.dump(all_songs, f, ensure_ascii=False, indent=2)
            f.write(";\n")

        print(f"[SUCCESS] On-demand ingestion complete! Added target song + {len(album_songs_scraped)} movie album tracks. Total database: {len(all_songs)} songs.")
        return target_song, album_songs_scraped

    except Exception as e:
        print(f"[-] Search error: {e}")
        return None, []

if __name__ == '__main__':
    q = sys.argv[1] if len(sys.argv) > 1 else 'kanmani anbodu'
    on_demand_scrape(q, scrape_full_album=True)
