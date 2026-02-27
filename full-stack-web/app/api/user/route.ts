// app/api/user/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase";

export async function POST(req: NextRequest) {
    const { id, name, role } = await req.json();
    if (!id || !name || !role) {
        return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const { data, error } = await db
        .from("users")
        .upsert({ id, name, role }, { onConflict: "id", ignoreDuplicates: true })
        .select("id, name, role")
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}

export async function GET(req: NextRequest) {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Provide ?id=" }, { status: 400 });

    const { data, error } = await db
        .from("users")
        .select("id, name, role")
        .eq("id", id)
        .single();

    if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(data);
}