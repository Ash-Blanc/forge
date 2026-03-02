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

    const entryXml = xml.match(/<entry>([\s\S]*?)<\/entry>/)?.[1];
    if (!entryXml) throw new Error("Could not parse paper entry from arXiv response");

    const title = entryXml.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.replace(/\s+/g, " ").trim();
    const abstract = entryXml.match(/<summary>([\s\S]*?)<\/summary>/)?.[1]?.replace(/\s+/g, " ").trim();
    const published = entryXml.match(/<published>([^T<]+)/)?.[1]?.trim();
    const authorMatches = [...entryXml.matchAll(/<name>([^<]+)<\/name>/g)].map(m => m[1].trim());

    if (!title) throw new Error("Could not parse paper title from arXiv response");

    return {
        title: title ?? "Unknown Title",
        abstract: abstract ?? "",
        authors: authorMatches.slice(0, 6),
        published: published ?? "",
    };
}
