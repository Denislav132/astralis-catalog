import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("products")
    .select("*")
    .or("status.eq.published,status.is.null")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Products API error:", error.message);
    return NextResponse.json({ error: "Unable to load products." }, { status: 500 });
  }

  return NextResponse.json({ products: data || [] });
}
