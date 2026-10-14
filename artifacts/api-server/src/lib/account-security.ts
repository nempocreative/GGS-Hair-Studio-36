import {
  createHash,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";

const passwordKeyLength = 64;

function scryptKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(
      password,
      salt,
      passwordKeyLength,
      { N: 1 << 14, r: 8, p: 1, maxmem: 32 * 1024 * 1024 },
      (error, key) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(key);
      },
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptKey(password, salt);
  return `scrypt$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

export async function verifyPassword(
  password: string,
  encoded: string,
): Promise<boolean> {
  const [algorithm, saltPart, keyPart] = encoded.split("$");
  if (algorithm !== "scrypt" || !saltPart || !keyPart) return false;

  try {
    const salt = Buffer.from(saltPart, "base64url");
    const expected = Buffer.from(keyPart, "base64url");
    if (salt.length !== 16 || expected.length !== passwordKeyLength) return false;
    const actual = await scryptKey(password, salt);
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
