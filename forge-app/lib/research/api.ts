import { Redis } from "@upstash/redis";

// Initialize Redis if environment variables are available, otherwise cache will just gracefully bypass
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

export interface Paper {
  title: string;
  authors: string[];
  abstract_snippet: string;
  pdf_url: string;
  citation_count: number;
  year: number;
  source: "semanticscholar" | "arxiv";
}

export interface ResearchResponse {
  papers: Paper[];
}

/**
 * Wrapper to check Redis before hitting external APIs.
 */
async function getCachedOrFetch<T>(cacheKey: string, fetchFunc: () => Promise<T>, ttlSeconds: number = 3600): Promise<T> {
  if (!redis) {
    console.warn("Redis not configured. Bypassing cache.");
    return await fetchFunc();
  }

  try {
    const cached = await redis.get<T>(cacheKey);
    if (cached) {
      console.log(`Cache HIT for key: ${cacheKey}`);
      return cached;
    }
  } catch (error) {
    console.error("Redis get error:", error);
  }

  console.log(`Cache MISS for key: ${cacheKey}. Fetching...`);
  const data = await fetchFunc();

  try {
    if (data) {
      await redis.set(cacheKey, data, { ex: ttlSeconds });
    }
  } catch (error) {
    console.error("Redis set error:", error);
  }

  return data;
}

/**
 * Primary Search: Semantic Scholar
 */
async function searchSemanticScholar(query: string, limit: number): Promise<any[]> {
  const fields = "title,authors,abstract,year,citationCount,openAccessPdf";
  const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=${limit}&fields=${fields}`;
  
  const headers: Record<string, string> = {};
  if (process.env.SEMANTIC_SCHOLAR_API_KEY) {
    headers["x-api-key"] = process.env.SEMANTIC_SCHOLAR_API_KEY;
  }

  const response = await fetch(url, { headers });
  
  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("Semantic Scholar Rate Limit Exceeded");
    }
    throw new Error(`Semantic Scholar Error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data || [];
}

/**
 * Fallback Search: arXiv API (XML response handling)
 */
async function searchArxivFallback(query: string, limit: number): Promise<Paper[]> {
  const url = `http://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=${limit}&sortBy=submittedDate&sortOrder=descending`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`arXiv Error: ${response.statusText}`);
  }

  const xmlData = await response.text();
  
  // Basic Regex XML parsing (since we want to avoid heavy DOM parsers on edge/serverless)
  const entries: string[] = xmlData.match(/<entry>[\s\S]*?<\/entry>/g) || [];
  
  return entries.map(entry => {
    const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/);
    const abstractMatch = entry.match(/<summary>([\s\S]*?)<\/summary>/);
    const publishedMatch = entry.match(/<published>([\s\S]*?)<\/published>/);
    const pdfMatch = entry.match(/<link title="pdf" href="([\s\S]*?)"/);
    
    // Extract multiple authors
    const authorMatches = entry.match(/<author>[\s\S]*?<name>([\s\S]*?)<\/name>[\s\S]*?<\/author>/g) || [];
    const authors = authorMatches.map(a => {
        const nameMatch = a.match(/<name>([\s\S]*?)<\/name>/);
        return nameMatch ? nameMatch[1].trim() : "Unknown";
    });

    return {
      title: titleMatch ? titleMatch[1].replace(/\n/g, " ").trim() : "Unknown Title",
      authors,
      abstract_snippet: abstractMatch ? abstractMatch[1].replace(/\n/g, " ").trim().substring(0, 300) + "..." : "",
      pdf_url: pdfMatch ? pdfMatch[1] : "",
      citation_count: 0, // arXiv API does not provide citation counts directly
      year: publishedMatch ? new Date(publishedMatch[1]).getFullYear() : new Date().getFullYear(),
      source: "arxiv",
    };
  });
}

/**
 * Fallback evaluation logic
 */
function evaluateFallback(ssPapers: any[], expectedLimit: number): boolean {
  if (!ssPapers || ssPapers.length === 0) return true;
  
  // 1. Check if we got significantly fewer results than expected
  if (ssPapers.length < expectedLimit * 0.5) {
    return true;
  }

  // 2. Check recency (if the newest paper is older than 48 hours, try arxiv for cutting edge preprints)
  const currentYear = new Date().getFullYear();
  const newestPaperYear = Math.max(...ssPapers.map(p => p.year || 0));
  
  // Simplistic recency check based on year (since Semantic Scholar search doesn't reliably return exact publish dates)
  if (newestPaperYear < currentYear) {
      return true;
  }

  return false;
}

/**
 * Format Semantic Scholar results to uniform schema
 */
function formatSemanticScholar(papers: any[]): Paper[] {
  return papers.filter(p => p.title).map(p => ({
    title: p.title || "Unknown Title",
    authors: p.authors ? p.authors.map((a: any) => a.name) : [],
    abstract_snippet: p.abstract ? p.abstract.substring(0, 300) + "..." : "",
    pdf_url: p.openAccessPdf ? p.openAccessPdf.url : "",
    citation_count: p.citationCount || 0,
    year: p.year || new Date().getFullYear(),
    source: "semanticscholar",
  }));
}

/**
 * Rank papers by Citations + Recency
 */
function rankAndFormatPapers(papers: Paper[]): Paper[] {
  const currentYear = new Date().getFullYear();
  
  return papers.sort((a, b) => {
    // Score heuristically: 1 citation = 1 point. 1 year older = -10 points.
    const scoreA = a.citation_count - ((currentYear - a.year) * 10);
    const scoreB = b.citation_count - ((currentYear - b.year) * 10);
    return scoreB - scoreA;
  });
}

/**
 * Main Orchestration Function
 */
export async function performResearchSearch(query: string, limit: number = 10): Promise<ResearchResponse> {
  const cacheKey = `research:search:${Buffer.from(query).toString('base64')}:${limit}`;
  
  return await getCachedOrFetch(cacheKey, async () => {
    let finalPapers: Paper[] = [];
    
    try {
      console.log(`[Research] Querying Semantic Scholar for: "${query}"`);
      const ssData = await searchSemanticScholar(query, limit);
      
      const needsFallback = evaluateFallback(ssData, limit);
      
      if (needsFallback) {
         console.log(`[Research] Semantic Scholar sparse/outdated. Triggering arXiv fallback for: "${query}"`);
         try {
             const arxivData = await searchArxivFallback(query, limit);
             // Merge and deduplicate (naively by title)
             const combined = [...formatSemanticScholar(ssData), ...arxivData];
             const unique = Array.from(new Map(combined.map(item => [item.title.toLowerCase(), item])).values());
             finalPapers = unique;
         } catch(arxivErr) {
             console.error("[Research] arXiv fallback failed:", arxivErr);
             finalPapers = formatSemanticScholar(ssData); // fall back to whatever SS gave us
         }
      } else {
        finalPapers = formatSemanticScholar(ssData);
      }

    } catch (error) {
       console.error("[Research] Semantic Scholar failed. Forcing arXiv fallback:", error);
       const arxivData = await searchArxivFallback(query, limit);
       finalPapers = arxivData;
    }

    const ranked = rankAndFormatPapers(finalPapers);
    
    return {
      papers: ranked.slice(0, limit)
    };
  });
}
