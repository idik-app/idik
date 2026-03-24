import CinematicIntro from "@/components/ui/CinematicIntro";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { jwtVerify } from "jose";
import { getRedirectTargetForRole } from "@/lib/auth/redirect";

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (process.env.NODE_ENV === "production" && !secret) return "";
  return secret || "dev-secret";
}

export default async function Home() {
  // Root: tampilkan intro; tapi jika sudah login (cookie `session` valid),
  // langsung redirect supaya user tidak "terlihat keluar" saat klik `/`.
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  const secret = getSecret();

  if (token && secret) {
    try {
      const secretKey = new TextEncoder().encode(secret);
      const { payload } = await jwtVerify(token, secretKey);
      const role = (payload as any)?.role;
      redirect(getRedirectTargetForRole(role));
    } catch {
      // Token invalid/expired -> tetap tampilkan intro & login.
    }
  }

  return (
    <main className="relative min-h-[100dvh] min-h-screen flex items-center justify-center overflow-x-hidden overflow-y-auto overscroll-y-contain bg-black text-white py-5 px-0 sm:py-0">
      <CinematicIntro />
    </main>
  );
}
