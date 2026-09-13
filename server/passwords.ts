import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

export async function hashPassword(password: string): Promise<string> {
  if (password.length < 8) {
    throw new Error("Пароль должен содержать минимум 8 символов");
  }

  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [algorithm, salt, expected] = storedHash.split("$");
  if (algorithm !== "scrypt" || !salt || !expected) return false;

  const expectedBuffer = Buffer.from(expected, "hex");
  const actualBuffer = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
}
