import fs from "fs";
import path from "path";
import { createAdminClient } from "@/lib/supabase/admin";

export function watchProjectDir(basePath: string) {
  const supabaseServer = createAdminClient();
  fs.watch(basePath, { recursive: true }, async (event, filename) => {
    if (!filename) return;
    const full = path.join(basePath, filename);
    const size = fs.existsSync(full) ? fs.statSync(full).size : 0;
    await supabaseServer.from("system_filelog").insert({
      path: filename,
      event,
      size,
      detected_by: "server",
    });
  });
}
