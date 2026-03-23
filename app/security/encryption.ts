// encryption.ts
import crypto from "crypto";
export function encrypt(data: string, key: string) {
  const cipher = crypto.createCipher("aes-256-ctr", key);
  return cipher.update(data, "utf8", "hex") + cipher.final("hex");
}
