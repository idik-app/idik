"use client";

/** Target unggahan Fast-Track setelah kompresi (500 KB). */
export const FAST_TRACK_MAX_IMAGE_BYTES = 500 * 1024;

function sanitizeBaseName(name: string): string {
  const base = name
    .replace(/\.[^.]+$/, "")
    .replace(/[^\w\-\s]/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 80);
  return base || "foto";
}

function canvasToJpegBlob(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), "image/jpeg", quality);
  });
}

/**
 * Kompresi gambar di browser (JPEG) hingga ukuran ≤ maxBytes.
 * PNG/WebP/GIF di-render ke JPEG (latar putih untuk transparansi).
 */
export async function compressImageForUpload(
  file: File,
  maxBytes: number = FAST_TRACK_MAX_IMAGE_BYTES,
): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  if (file.size <= maxBytes) return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("Format gambar tidak bisa diproses.");
  }

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Kanvas 2D tidak tersedia.");
  }

  try {
    const iw = bitmap.width;
    const ih = bitmap.height;
    if (iw < 1 || ih < 1) {
      throw new Error("Ukuran gambar tidak valid.");
    }
    const ratio = iw / ih;

    let maxSide = Math.min(2400, Math.max(iw, ih));

    const MIME = "image/jpeg";
    const outName = `${sanitizeBaseName(file.name)}.jpg`;

    while (maxSide >= 160) {
      let w: number;
      let h: number;
      if (iw >= ih) {
        w = Math.round(Math.min(maxSide, iw));
        h = Math.max(1, Math.round(w / ratio));
      } else {
        h = Math.round(Math.min(maxSide, ih));
        w = Math.max(1, Math.round(h * ratio));
      }

      canvas.width = w;
      canvas.height = h;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(bitmap, 0, 0, w, h);

      for (let q = 0.9; q >= 0.38; q -= 0.04) {
        const blob = await canvasToJpegBlob(canvas, q);
        if (!blob) continue;
        if (blob.size <= maxBytes) {
          return new File([blob], outName, {
            type: MIME,
            lastModified: Date.now(),
          });
        }
      }

      maxSide = Math.round(maxSide * 0.78);
    }

    throw new Error(
      "Gambar tidak bisa diturunkan di bawah 500 KB. Coba foto dengan resolusi lebih kecil.",
    );
  } finally {
    bitmap.close();
  }
}
