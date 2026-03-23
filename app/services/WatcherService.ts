import fs from "fs";
import path from "path";
import { supabaseServer } from "@/app/api/_supabase/server";

export function watchProjectDir(basePath: string) {
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
