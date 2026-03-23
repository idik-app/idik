import { promises as fs } from "fs";
import path from "path";
import { requireUser } from "@/lib/auth/guards";

export async function GET() {
  const id = await requireUser();
  if (!id.ok) return id.response;

  const pkgPath = path.join(process.cwd(), "package.json");
  const file = await fs.readFile(pkgPath, "utf-8");
  const pkg = JSON.parse(file);

  const deps = pkg.dependencies || {};
  const dev = pkg.devDependencies || {};

  return Response.json({
    versions: {
      "Next.js": deps.next,
      React: deps.react,
      "React DOM": deps["react-dom"],
      "Supabase JS": deps["@supabase/supabase-js"],
      "Framer Motion": deps["framer-motion"],
      "Tailwind CSS": dev.tailwindcss || deps.tailwindcss,
      "Lucide React": deps["lucide-react"],
      Bootstrap: deps.bootstrap,
      TypeScript: dev.typescript,
      "Next Themes": deps["next-themes"],
      "React Hot Toast": deps["react-hot-toast"],
      Sonner: deps["sonner"],
      XLSX: deps["xlsx"],
    },
    timestamp: new Date().toISOString(),
  });
}
