import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "dev-secret";
const COOKIE_NAME = "session";

/* ============================================================
   🔐 LOGIN DENGAN ROLE-BASED REDIRECT (v2.1 – Stable)
============================================================ */
export async function POST(req: Request) {
  const { username, password } = await req.json();

  // 🧩 Daftar user mock (sementara sebelum integrasi Supabase)
  const USERS = [
    { username: "admin", password: "12345", role: "admin" },
    { username: "habib", password: "idik", role: "user" },
    { username: "nurse", password: "cathlab", role: "staff" },
  ];

  // 🔎 Validasi kredensial
  const user = USERS.find(
    (u) => u.username === username && u.password === password
  );

  if (!user) {
    return NextResponse.json(
      { ok: false, message: "Username atau password salah." },
      { status: 401 }
    );
  }

  // 🔐 Buat token JWT
  const token = jwt.sign({ username: user.username, role: user.role }, SECRET, {
    expiresIn: "1h",
  });

  // 🎯 Role redirect
  const routeMap: Record<string, string> = {
    admin: "/dashboard/admin",
    staff: "/dashboard/inventaris",
    user: "/dashboard/pasien",
  };
  const target = routeMap[user.role] || "/dashboard";

  // ✅ Buat response redirect manual agar tidak error di fetch()
  const res = new NextResponse(null, {
    status: 307,
    headers: { Location: target },
  });

  // 🧁 Tambahkan cookie JWT
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60,
  });

  return res;
}

/* ============================================================
   🚪 LOGOUT – Hapus Cookie Session
============================================================ */
export async function DELETE() {
  const res = new NextResponse(
    JSON.stringify({ ok: true, message: "Logout berhasil" }),
    { status: 200 }
  );

  res.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return res;
}
