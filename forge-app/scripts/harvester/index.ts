import { createClient } from "@supabase/supabase-js";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import * as dotenv from "dotenv";
import * as path from "path";

// 1. Load Environment Variables from Forge Next.js root (.env.local)
dotenv.config({ path: path.resolve(__dirname, "../../../.env.local") });

// 2. Initialize Clients
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials. Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY are in your .env.local.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 3. AWS Bedrock Auth
if (!process.env.AWS_ACCESS_KEY_ID ||
    !process.env.AWS_SECRET_ACCESS_KEY) {
  console.warn("Warning: Missing AWS credentials. Make sure you have AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env.local if you are using AWS Bedrock Titan.");
}

const bedrock = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  }
});

/**
 * Generate a 1536-dimensional vector embedding using AWS Bedrock Titan.
 * Includes exponential backoff retry.
 */
async function generateEmbedding(text: string, retries: number = 5): Promise<number[]> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await bedrock.send(
        new InvokeModelCommand({
          modelId: "amazon.titan-embed-text-v1",
          contentType: "application/json",
          accept: "application/json",
          body: JSON.stringify({ inputText: text }),
        })
      );
      
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      return responseBody.embedding;
    } catch (error: any) {
      if (attempt === retries) {
        console.error(`Error generating embedding from Bedrock (Final Attempt ${attempt}):`, error.message);
        throw error;
      }
      
      const backoffMs = attempt * 3000;
      console.warn(`AWS Bedrock connection dropped or rate limited (Attempt ${attempt}/${retries}). Retrying in ${backoffMs}ms...`);
      await new Promise(r => setTimeout(r, backoffMs));
    }
  }
  return [];
}

/**
 * Fetch recent papers from arXiv API
 */
async function fetchArxivPapers(limit: number = 50): Promise<any[]> {
  console.log(`Fetching ${limit} recent papers from arXiv (CS & physics domains)...`);
  const url = `http://export.arxiv.org/api/query?search_query=cat:cs.AI+OR+cat:cs.LG+OR+cat:quant-ph&start=0&max_results=${limit}&sortBy=submittedDate&sortOrder=descending`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`arXiv API failed: ${response.statusText}`);
  }

  const xmlData = await response.text();
  const entries = xmlData.match(/<entry>[\s\S]*?<\/entry>/g) || [];
  
  return entries.map(entry => {
    const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/);
    const abstractMatch = entry.match(/<summary>([\s\S]*?)<\/summary>/);
    const publishedMatch = entry.match(/<published>([\s\S]*?)<\/published>/);
    const pdfMatch = entry.match(/<link title="pdf" href="([\s\S]*?)"/);
    
    const authorMatches = entry.match(/<author>[\s\S]*?<name>([\s\S]*?)<\/name>[\s\S]*?<\/author>/g) || [];
    const authors = authorMatches.map(a => {
        const nameMatch = a.match(/<name>([\s\S]*?)<\/name>/);
        return nameMatch ? nameMatch[1].trim() : "Unknown";
    });

    return {
      title: titleMatch ? titleMatch[1].replace(/\n/g, " ").trim() : "Unknown",
      authors,
      abstract: abstractMatch ? abstractMatch[1].replace(/\n/g, " ").trim() : "",
      pdf_url: pdfMatch ? pdfMatch[1] : "",
      year: publishedMatch ? new Date(publishedMatch[1]).getFullYear() : new Date().getFullYear(),
      source: "arxiv"
    };
  });
}

/**
 * Check if the paper already exists in our Supabase table.
 */
async function isDuplicate(title: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("forge_papers")
    .select("id")
    .eq("title", title)
    .limit(1);

  if (error) {
    console.error("Supabase query error during deduplication check:", error.message);
    return false;
  }
  return data && data.length > 0;
}

/**
 * Main ingestion orchestrator
 */
export async function runIngestion() {
  const limit = 50;
  let papers: any[] = [];
  
  try {
     papers = await fetchArxivPapers(limit);
     console.log(`Successfully fetched ${papers.length} papers from arXiv.`);
  } catch (err) {
      console.error("Failed to fetch from arXiv:", err);
      process.exit(1);
  }

  console.log(`Starting ingestion into Supabase...`);

  let newCount = 0;
  let skipCount = 0;

  for (const paper of papers) {
    console.log(`\nProcessing: "${paper.title}"`);
    
    // Deduplication check
    const duplicate = await isDuplicate(paper.title);
    if (duplicate) {
      console.log(`Skipping - Duplicate found in Supabase.`);
      skipCount++;
      continue;
    }

    const textToEmbed = `Title: ${paper.title}\nAuthors: ${paper.authors.join(", ")}\nAbstract: ${paper.abstract}`;
    
    try {
      console.log(`Generating 1536-dimensional vector embedding...`);
      const embedding = await generateEmbedding(textToEmbed);
      
      console.log(`Inserting into Supabase [forge_papers] table...`);
      const { error } = await supabase.from("forge_papers").insert({
        title: paper.title,
        authors: paper.authors,
        abstract: paper.abstract,
        pdf_url: paper.pdf_url,
        year: paper.year,
        source: paper.source,
        embedding: embedding,
      });

      if (error) {
         console.error("Supabase insert failed:", error.message);
      } else {
         console.log("Successfully ingested.");
         newCount++;
      }
    } catch (err) {
      console.error(`Failed to process paper.`);
    }
    
    // Wait a brief period between processing papers to prevent overwhelming AWS Bedrock
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log(`\nIngestion complete. Added ${newCount} new papers. Skipped ${skipCount} duplicates.`);
}

// Execute the script if run directly
if (process.argv[1] && process.argv[1].endsWith("index.ts")) {
  runIngestion().catch(console.error);
}
