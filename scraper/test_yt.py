import urllib.request
import urllib.parse
import json
import re

def get_youtube_id(song_title, movie_name):
    query = urllib.parse.quote(f"{song_title} {movie_name} tamil song")
    url = f"https://www.youtube.com/results?search_query={query}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            html = resp.read().decode('utf-8', errors='ignore')
            matches = re.findall(r'"videoId":"([a-zA-Z0-9_-]{11})"', html)
            if matches:
                seen = []
                for vid in matches:
                    if vid not in seen:
                        seen.append(vid)
                return seen[0]
    except Exception as e:
        print(f"Error: {e}")
    return None

if __name__ == '__main__':
    vid = get_youtube_id("Rowdy Baby", "Maari 2")
    print("Found video ID:", vid)
