import json
import os

with open('backend/src/catalog.json', 'r', encoding='utf-8') as f:
    cat = json.load(f)

song_slugs = [s['s'] for s in cat['songs']]
album_slugs = [a['s'] for a in cat['albums']]

compact_catalog = {
    'version': 1,
    'totalSongs': len(song_slugs),
    'totalAlbums': len(album_slugs),
    'songs': song_slugs,
    'albums': album_slugs
}

out_path = 'public/catalog.json'
with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(compact_catalog, f, ensure_ascii=False, separators=(',', ':'))

print(f"Created {out_path} with {len(song_slugs)} songs and {len(album_slugs)} albums.")
print(f"File size: {os.path.getsize(out_path) / 1024:.2f} KB")
