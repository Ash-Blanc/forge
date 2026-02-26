// app/api/seed/route.ts
import { NextResponse } from "next/server";
import { seedIfEmpty } from "@/lib/seed";

export async function POST() {
    try {
        await seedIfEmpty();
        return NextResponse.json({ success: true, message: "Database seeded successfully." });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
