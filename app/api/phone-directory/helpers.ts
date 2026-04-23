import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export function getAdminOr503() {
  try {
    return { supabase: createAdminClient(), response: null as NextResponse | null };
  } catch {
    return {
      supabase: null,
      response: NextResponse.json(
        {
          ok: false,
          message:
            "Server tidak dikonfigurasi (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).",
        },
        { status: 503 },
      ),
    };
  }
}

export type PhoneDirRow = {
  id: string;
  unit: string;
  ext: string;
  location: string | null;
  floor: string | null;
  is_pinned: boolean;
  pin_order: number | null;
};

export function rowToClient(r: PhoneDirRow) {
  return {
    id: r.id,
    unit: String(r.unit ?? "").trim(),
    ext: String(r.ext ?? "").trim(),
    location: String(r.location ?? "").trim(),
    floor: r.floor != null && String(r.floor).trim() ? String(r.floor).trim() : undefined,
    isPinned: Boolean(r.is_pinned),
  };
}
