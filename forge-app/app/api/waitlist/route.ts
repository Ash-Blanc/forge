import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase";

export async function GET() {
    try {
        const { count, error } = await db
            .from("waitlist")
            .select('*', { count: 'exact', head: true });

        if (error) {
            console.error("Error fetching waitlist count:", error);
            // If the table doesn't exist yet, just return 0
            if (error.code === '42P01') return NextResponse.json({ count: 0 });
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ count: count || 0 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { email } = body;

        if (!email || typeof email !== 'string') {
            return NextResponse.json({ error: "Invalid email" }, { status: 400 });
        }

        // Insert email
        const { error } = await db
            .from("waitlist")
            .insert({ email });

        // If duplicate email, it's fine, we treat it as success.
        if (error && error.code !== '23505') {
            console.error("Error joining waitlist:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Get new count
        const { count } = await db
            .from("waitlist")
            .select('*', { count: 'exact', head: true });

        return NextResponse.json({ success: true, count: count || 0 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
