import { NextRequest, NextResponse } from "next/server";
import { performResearchSearch } from "@/lib/research/api";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query");
    const limitParam = searchParams.get("limit");
    
    if (!query || query.trim().length === 0) {
      return NextResponse.json({ error: "Missing 'query' parameter" }, { status: 400 });
    }

    const limit = limitParam ? parseInt(limitParam, 10) : 10;
    if (isNaN(limit) || limit < 1 || limit > 50) {
       return NextResponse.json({ error: "Invalid 'limit' parameter (must be 1-50)" }, { status: 400 });
    }

    const result = await performResearchSearch(query.trim(), limit);
    
    return NextResponse.json(result, { status: 200 });
    
  } catch (error: any) {
    console.error("[Research API Error]", error);
    
    // Check if it's a known rate limit error
    if (error.message?.includes("Rate Limit") || error.message?.includes("429")) {
        return NextResponse.json({ 
            error: "Too Many Requests", 
            details: "External research API rate limits exceeded. Please try again later."
        }, { status: 429 });
    }

    return NextResponse.json({ 
        error: "Internal Server Error", 
        details: error.message || "Unknown error occurred" 
    }, { status: 500 });
  }
}
