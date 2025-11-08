// app/api/pasien/add/route.ts
import { NextResponse } from "next/server";
import { addPatient } from "@/app/dashboard/pasien/actions/addPatient";

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const result = await addPatient(data); // panggil server action di sisi server
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Gagal menambah pasien:", err);
    return NextResponse.json(
      { error: err.message || "Gagal menambah pasien" },
      { status: 500 }
    );
  }
}
