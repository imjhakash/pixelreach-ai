import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGO = "aes-256-cbc";

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY!;
  return Buffer.from(key.padEnd(32).slice(0, 32), "utf8");
}

export function encrypt(text: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

export function decrypt(payload: string): string {
  const [ivHex, encHex] = payload.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const enc = Buffer.from(encHex, "hex");
  const decipher = createDecipheriv(ALGO, getKey(), iv);
  const decrypted = Buffer.concat([decipher.update(enc), decipher.final()]);
  return decrypted.toString("utf8");
}
