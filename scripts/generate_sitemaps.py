import json
import os
import datetime

BASE_URL = "https://lyrifi-data.vercel.app"
TODAY = datetime.date.today().isoformat()

def main():
    print("Generating comprehensive SEO XML sitemaps...")
    
    catalog_path = "backend/src/catalog.json"
    if not os.path.exists(catalog_path):
        print(f"Error: {catalog_path} not found")
        return

    with open(catalog_path, 'r', encoding='utf-8') as f:
        catalog = json.load(f)

    songs = catalog.get('songs', [])
    albums = catalog.get('albums', [])
    print(f"Loaded {len(songs)} songs and {len(albums)} movie albums.")

    os.makedirs("public", exist_ok=True)

    # 1. Generate sitemap-static.xml
    static_urls = [
        {"loc": f"{BASE_URL}/", "priority": "1.0", "changefreq": "daily"},
        {"loc": f"{BASE_URL}/movies", "priority": "0.9", "changefreq": "daily"},
        {"loc": f"{BASE_URL}/artists", "priority": "0.8", "changefreq": "weekly"},
        {"loc": f"{BASE_URL}/search", "priority": "0.8", "changefreq": "daily"},
    ]

    static_xml = ['<?xml version="1.0" encoding="UTF-8"?>']
    static_xml.append('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
    for u in static_urls:
        static_xml.append('  <url>')
        static_xml.append(f'    <loc>{u["loc"]}</loc>')
        static_xml.append(f'    <lastmod>{TODAY}</lastmod>')
        static_xml.append(f'    <changefreq>{u["changefreq"]}</changefreq>')
        static_xml.append(f'    <priority>{u["priority"]}</priority>')
        static_xml.append('  </url>')
    static_xml.append('</urlset>')

    with open("public/sitemap-static.xml", "w", encoding="utf-8") as f:
        f.write("\n".join(static_xml))
    print("Generated public/sitemap-static.xml")

    # 2. Generate sitemap-songs.xml (All 20,936 songs)
    songs_xml = ['<?xml version="1.0" encoding="UTF-8"?>']
    songs_xml.append('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
    for s in songs:
        slug = s.get('s', '')
        if not slug:
            continue
        songs_xml.append('  <url>')
        songs_xml.append(f'    <loc>{BASE_URL}/song/{slug}</loc>')
        songs_xml.append(f'    <lastmod>{TODAY}</lastmod>')
        songs_xml.append('    <changefreq>monthly</changefreq>')
        songs_xml.append('    <priority>0.8</priority>')
        songs_xml.append('  </url>')
    songs_xml.append('</urlset>')

    with open("public/sitemap-songs.xml", "w", encoding="utf-8") as f:
        f.write("\n".join(songs_xml))
    print(f"Generated public/sitemap-songs.xml ({len(songs)} URLs)")

    # 3. Generate sitemap-movies.xml (All 4,657 movie albums)
    movies_xml = ['<?xml version="1.0" encoding="UTF-8"?>']
    movies_xml.append('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
    for a in albums:
        slug = a.get('s', '')
        if not slug:
            continue
        movies_xml.append('  <url>')
        movies_xml.append(f'    <loc>{BASE_URL}/movie/{slug}</loc>')
        movies_xml.append(f'    <lastmod>{TODAY}</lastmod>')
        movies_xml.append('    <changefreq>monthly</changefreq>')
        movies_xml.append('    <priority>0.7</priority>')
        movies_xml.append('  </url>')
    movies_xml.append('</urlset>')

    with open("public/sitemap-movies.xml", "w", encoding="utf-8") as f:
        f.write("\n".join(movies_xml))
    print(f"Generated public/sitemap-movies.xml ({len(albums)} URLs)")

    # 4. Generate Master sitemap.xml (Sitemap Index)
    index_xml = ['<?xml version="1.0" encoding="UTF-8"?>']
    index_xml.append('<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
    
    sub_sitemaps = [
        "sitemap-static.xml",
        "sitemap-songs.xml",
        "sitemap-movies.xml",
    ]
    for sm in sub_sitemaps:
        index_xml.append('  <sitemap>')
        index_xml.append(f'    <loc>{BASE_URL}/{sm}</loc>')
        index_xml.append(f'    <lastmod>{TODAY}</lastmod>')
        index_xml.append('  </sitemap>')
    index_xml.append('</sitemapindex>')

    with open("public/sitemap.xml", "w", encoding="utf-8") as f:
        f.write("\n".join(index_xml))
    print("Generated public/sitemap.xml (Sitemap Index)")

if __name__ == '__main__':
    main()
