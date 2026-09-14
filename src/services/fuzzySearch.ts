/**
 * Phonetic & Fuzzy Search Matcher
 * Provides robust typo tolerance for Indian/Tamil names, English transliterations,
 * and spelling variations (e.g. kathi -> kaththi, cooly -> coolie, karupu -> karuppu, rehman -> rahman).
 */

export function normalizePhonetic(text: string): string {
  if (!text) return '';
  let s = text.toLowerCase().trim();
  // Remove non-alphanumeric chars
  s = s.replace(/[^a-z0-9\s]/g, '');
  // Collapse duplicate consecutive characters (e.g. 'kaththi' -> 'kathi', 'karuppu' -> 'karupu')
  s = s.replace(/([a-z])\1+/g, '$1');
  // Common Tamil phonetic & transliteration normalizations
  s = s.replace(/th/g, 't').replace(/dh/g, 't').replace(/d/g, 't');
  s = s.replace(/ph/g, 'f');
  s = s.replace(/ee/g, 'i').replace(/ea/g, 'i').replace(/y/g, 'i');
  s = s.replace(/oo/g, 'u');
  s = s.replace(/kh/g, 'k').replace(/c/g, 'k').replace(/q/g, 'k').replace(/g/g, 'k');
  s = s.replace(/zh/g, 'l').replace(/sh/g, 's').replace(/z/g, 's');
  // Tamil/Indian r/l interchange (e.g., choran vs chozhan vs cholan)
  s = s.replace(/r/g, 'l');
  return s.trim();
}

export function levenshteinDistance(s1: string, s2: string): number {
  if (s1 === s2) return 0;
  if (!s1.length) return s2.length;
  if (!s2.length) return s1.length;

  let prev = Array.from({ length: s2.length + 1 }, (_, i) => i);
  let curr = new Array(s2.length + 1);

  for (let i = 0; i < s1.length; i++) {
    curr[0] = i + 1;
    for (let j = 0; j < s2.length; j++) {
      const cost = s1[i] === s2[j] ? 0 : 1;
      curr[j + 1] = Math.min(
        curr[j] + 1, // insertion
        prev[j + 1] + 1, // deletion
        prev[j] + cost // substitution
      );
    }
    prev = [...curr];
  }
  return prev[s2.length];
}

/**
 * Returns a score between 0 and 100 for how well query matches target.
 * 0 means no relevant match.
 */
export function calculateFuzzyScore(query: string, target: string): number {
  const qRaw = (query || '').toLowerCase().trim();
  const tRaw = (target || '').toLowerCase().trim();
  if (!qRaw || !tRaw) return 0;

  // 1. Direct exact or substring match in original text
  if (qRaw === tRaw) return 100;
  if (tRaw.startsWith(qRaw)) return 90;
  if (tRaw.includes(qRaw)) return 80;

  // 2. Phonetic normalized matching
  const qNorm = normalizePhonetic(qRaw);
  const tNorm = normalizePhonetic(tRaw);
  if (!qNorm || !tNorm) return 0;

  if (qNorm === tNorm) return 85;
  if (tNorm.startsWith(qNorm)) return 75;
  if (tNorm.includes(qNorm)) return 70;

  // 3. Word-token matching (handles queries like 'arabik kuthu' -> 'arabic kuthu', 'selfi pula' -> 'selfie pulla')
  const qWords = qNorm.split(/\s+/).filter(Boolean);
  const tWords = tNorm.split(/\s+/).filter(Boolean);

  let matchedWordCount = 0;
  for (const qw of qWords) {
    for (const tw of tWords) {
      if (qw === tw) {
        matchedWordCount++;
        break;
      }
      if (qw.length >= 3 && tw.length >= 3) {
        if (qw.includes(tw) || (tw.length >= 4 && tw.includes(qw))) {
          matchedWordCount++;
          break;
        }
        const dist = levenshteinDistance(qw, tw);
        const maxAllowed = qw.length <= 5 ? 1 : 2;
        if (dist <= maxAllowed) {
          matchedWordCount++;
          break;
        }
      }
    }
  }

  if (qWords.length > 0 && matchedWordCount === qWords.length) {
    return 65;
  }

  // 4. Whole string edit distance for single word / short queries
  if (qWords.length === 1 && tWords.length === 1) {
    const dist = levenshteinDistance(qNorm, tNorm);
    const maxLen = Math.max(qNorm.length, tNorm.length);
    const threshold = maxLen <= 4 ? 1 : maxLen <= 7 ? 2 : 3;
    if (dist <= threshold) {
      return Math.max(40, 60 - dist * 5);
    }
  }

  return 0;
}
