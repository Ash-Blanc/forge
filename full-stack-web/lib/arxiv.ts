// lib/arxiv.ts

export interface ArxivMeta {
    title: string;
    abstract: string;
    authors: string[];
    published: string;
}

export async function fetchArxivMeta(rawId: string): Promise<ArxivMeta> {
    let id = rawId.trim();
    // Support full URLs or `arxiv:` prefixes
    const urlMatch = id.match(/(?:arxiv\.org\/(?:abs|pdf)\/|arxiv:)([\w.-]+)/i);
    if (urlMatch) {
        id = urlMatch[1];
    } else {
        id = id.replace(/\.pdf$/i, "");
    }
    const url = `https://export.arxiv.org/api/query?id_list=${encodeURIComponent(id)}`;

    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error(`arXiv request failed: ${res.status}`);

    const xml = await res.text();

    // Check for no results
    const totalMatch = xml.match(/<opensearch:totalResults[^>]*>(\d+)<\/opensearch:totalResults>/);
    if (totalMatch && totalMatch[1] === "0") throw new Error("No paper found for this arXiv ID");

    const title = xml.match(/<title>(?!ArXiv|Search)([^<]+)<\/title>/)?.[1]?.replace(/\s+/g, " ").trim();
    const abstract = xml.match(/<summary>([^<]+)<\/summary>/)?.[1]?.replace(/\s+/g, " ").trim();
    const published = xml.match(/<published>([^T]+)/)?.[1]?.trim();
    const authorMatches = [...xml.matchAll(/<name>([^<]+)<\/name>/g)].map(m => m[1].trim());

    if (!title) throw new Error("Could not parse paper title from arXiv response");

    return {
        title: title ?? "Unknown Title",
        abstract: abstract ?? "",
        authors: authorMatches.slice(0, 6),
        published: published ?? "",
    };
}