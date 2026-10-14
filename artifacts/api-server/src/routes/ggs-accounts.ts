import {
  createHash,
  randomBytes,
} from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { Router, type IRouter, type Response } from "express";
import {
  hashPassword,
  hashSessionToken,
  verifyPassword,
} from "../lib/account-security";
import {
  GetGgsAccountSessionResponse,
  LoginGgsAccountBody,
  RegisterGgsAccountBody,
} from "@workspace/api-zod";
import {
  db,
  ggsCustomerAccountsTable,
  ggsCustomerSessionsTable,
  type GgsAccountIdentifierType,
} from "@workspace/db";

const router: IRouter = Router();
const sessionCookieName = "ggs_customer_session";
const sessionCookiePath = "/api/ggs/account";
const sessionMaxAgeMs = 1000 * 60 * 60 * 24 * 30;
const accountAttemptLimit = 12;
const attemptWindowMs = 15 * 60 * 1000;

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: sessionCookiePath,
};

const attemptBuckets = new Map<
  string,
  { count: number; resetAt: number }
>();

function normalizeIdentifier(
  type: GgsAccountIdentifierType,
  identifier: string,
): string {
  const trimmed = identifier.trim();
  if (type === "email") return trimmed.toLowerCase();

  const digits = trimmed.replace(/\D/g, "");
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("62")) return digits;
  return `62${digits}`;
}

function isValidIdentifier(
  type: GgsAccountIdentifierType,
  identifier: string,
): boolean {
  if (type === "email") {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
  }

  const digits = identifier.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

function consumeAttempt(
  bucketKey: string,
  maxAttempts = accountAttemptLimit,
): boolean {
  const now = Date.now();
  if (attemptBuckets.size > 5000) {
    for (const [key, bucket] of attemptBuckets) {
      if (bucket.resetAt <= now) attemptBuckets.delete(key);
    }
  }
  const current = attemptBuckets.get(bucketKey);
  if (!current || current.resetAt <= now) {
    attemptBuckets.set(bucketKey, { count: 1, resetAt: now + attemptWindowMs });
    return true;
  }

  if (current.count >= maxAttempts) return false;
  current.count += 1;

  return true;
}

function isRateLimited(
  ip: string,
  type?: GgsAccountIdentifierType,
  identifier?: string,
): boolean {
  const ipAllowed = consumeAttempt(`ip:${ip}`, 40);
  if (!ipAllowed) return true;
  if (!type || !identifier) return false;

  const identityHash = createHash("sha256")
    .update(`${type}:${identifier}`)
    .digest("hex");
  return !consumeAttempt(`account:${identityHash}`, 10);
}

function setSessionCookie(
  res: Response,
  token: string,
): void {
  res.cookie(sessionCookieName, token, {
    ...cookieOptions,
    maxAge: sessionMaxAgeMs,
  });
}

function serializeAccount(account: typeof ggsCustomerAccountsTable.$inferSelect) {
  return GetGgsAccountSessionResponse.parse({
    id: account.id,
    name: account.name,
    identifierType: account.identifierType,
    identifier: account.identifier,
    points: account.points,
    createdAt: account.createdAt.toISOString(),
  });
}

async function createSession(accountId: string) {
  const token = randomBytes(32).toString("base64url");
  await db.insert(ggsCustomerSessionsTable).values({
    tokenHash: hashSessionToken(token),
    accountId,
    expiresAt: new Date(Date.now() + sessionMaxAgeMs),
  });
  return token;
}

router.post("/ggs/account/register", async (req, res): Promise<void> => {
  const parsed = RegisterGgsAccountBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Lengkapi nama, kontak, dan kata sandi dengan benar." });
    return;
  }

  const name = parsed.data.name.trim();
  const identifier = normalizeIdentifier(
    parsed.data.identifierType,
    parsed.data.identifier,
  );
  if (
    name.length < 2 ||
    !isValidIdentifier(parsed.data.identifierType, identifier)
  ) {
    res.status(400).json({ error: "Nama atau format kontak belum benar." });
    return;
  }

  const ip = req.ip || req.socket.remoteAddress || "unknown";
  if (isRateLimited(ip, parsed.data.identifierType, identifier)) {
    res.status(429).json({ error: "Terlalu banyak percobaan. Coba lagi nanti." });
    return;
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const token = randomBytes(32).toString("base64url");
  const account = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(ggsCustomerAccountsTable)
      .values({
        name,
        identifierType: parsed.data.identifierType,
        identifier,
        passwordHash,
      })
      .onConflictDoNothing({
        target: [
          ggsCustomerAccountsTable.identifierType,
          ggsCustomerAccountsTable.identifier,
        ],
      })
      .returning();

    if (!created) return null;

    await tx.insert(ggsCustomerSessionsTable).values({
      tokenHash: hashSessionToken(token),
      accountId: created.id,
      expiresAt: new Date(Date.now() + sessionMaxAgeMs),
    });
    return created;
  });

  if (!account) {
    res.status(409).json({ error: "Email atau nomor WhatsApp sudah terdaftar." });
    return;
  }

  setSessionCookie(res, token);
  res.status(201).json(serializeAccount(account));
});

router.post("/ggs/account/login", async (req, res): Promise<void> => {
  const parsed = LoginGgsAccountBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Masukkan kontak dan kata sandi dengan benar." });
    return;
  }

  const identifier = normalizeIdentifier(
    parsed.data.identifierType,
    parsed.data.identifier,
  );
  if (!isValidIdentifier(parsed.data.identifierType, identifier)) {
    res.status(400).json({ error: "Format email atau nomor WhatsApp belum benar." });
    return;
  }

  const ip = req.ip || req.socket.remoteAddress || "unknown";
  if (isRateLimited(ip, parsed.data.identifierType, identifier)) {
    res.status(429).json({ error: "Terlalu banyak percobaan. Coba lagi nanti." });
    return;
  }

  const [account] = await db
    .select()
    .from(ggsCustomerAccountsTable)
    .where(
      and(
        eq(ggsCustomerAccountsTable.identifierType, parsed.data.identifierType),
        eq(ggsCustomerAccountsTable.identifier, identifier),
      ),
    )
    .limit(1);

  if (!account || !(await verifyPassword(parsed.data.password, account.passwordHash))) {
    res.status(401).json({ error: "Kontak atau kata sandi tidak cocok." });
    return;
  }

  const token = await createSession(account.id);
  setSessionCookie(res, token);
  res.json(serializeAccount(account));
});

router.get("/ggs/account/session", async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "no-store");
  const token: unknown = req.cookies?.[sessionCookieName];
  if (typeof token !== "string" || token.length < 32) {
    res.status(401).json({ error: "Belum masuk." });
    return;
  }

  const [session] = await db
    .select({ account: ggsCustomerAccountsTable })
    .from(ggsCustomerSessionsTable)
    .innerJoin(
      ggsCustomerAccountsTable,
      eq(ggsCustomerSessionsTable.accountId, ggsCustomerAccountsTable.id),
    )
    .where(
      and(
        eq(ggsCustomerSessionsTable.tokenHash, hashSessionToken(token)),
        gt(ggsCustomerSessionsTable.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!session) {
    await db
      .delete(ggsCustomerSessionsTable)
      .where(eq(ggsCustomerSessionsTable.tokenHash, hashSessionToken(token)));
    res.clearCookie(sessionCookieName, cookieOptions);
    res.status(401).json({ error: "Sesi masuk sudah berakhir." });
    return;
  }

  res.json(serializeAccount(session.account));
});

router.post("/ggs/account/logout", async (req, res): Promise<void> => {
  const token: unknown = req.cookies?.[sessionCookieName];
  if (typeof token === "string" && token.length >= 32) {
    await db
      .delete(ggsCustomerSessionsTable)
      .where(eq(ggsCustomerSessionsTable.tokenHash, hashSessionToken(token)));
  }

  res.clearCookie(sessionCookieName, cookieOptions);
  res.sendStatus(204);
});

export default router;
