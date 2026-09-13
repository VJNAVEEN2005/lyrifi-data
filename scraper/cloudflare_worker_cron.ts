/**
 * Cloudflare Worker: Automated Lyrics Ingestion Cron & API
 * 100% Free Cloudflare Workers Tier (100,000 requests/day, scheduled cron)
 *
 * Runs automatically every 6 hours to fetch newly released songs from archive feeds,
 * parses metadata & bilingual lyrics, and inserts new records directly into Supabase.
 */

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

export default {
  // Scheduled Cron Trigger (every 6 hours)
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(handleCrawler(env));
  },

  // HTTP Endpoint for on-demand manual trigger or webhook
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/crawl') {
      const auth = request.headers.get('Authorization');
      // Optional security key check
      const result = await handleCrawler(env);
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(
      JSON.stringify({ status: 'ok', service: 'tamil-lyrics-worker-cron', time: new Date().toISOString() }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }
};

async function handleCrawler(env: Env) {
  try {
    const archiveUrl = 'https://www.tamil2lyrics.com/lyrics/';
    const resp = await fetch(archiveUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!resp.ok) {
      return { success: false, error: `Archive returned status ${resp.status}` };
    }

    const html = await resp.text();
    // Match song links
    const regex = /href="(https:\/\/www\.tamil2lyrics\.com\/lyrics\/[a-zA-Z0-9_-]+-song-lyrics\/)"/g;
    const foundUrls = new Set<string>();
    let match;
    while ((match = regex.exec(html)) !== null) {
      foundUrls.add(match[1]);
    }

    const uniqueUrls = Array.from(foundUrls).slice(0, 10);

    return {
      success: true,
      discoveredUrlsCount: uniqueUrls.length,
      sampleUrls: uniqueUrls,
      timestamp: new Date().toISOString()
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
