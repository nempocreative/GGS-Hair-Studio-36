import { clerkClient, getAuth } from "@clerk/express";
import type { RequestHandler } from "express";

export const requireGgsOwner: RequestHandler = async (req, res, next) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Masuk untuk membuka CMS GGS." });
    return;
  }

  const allowedEmail = process.env.GGS_ADMIN_EMAIL?.trim().toLowerCase();
  if (!allowedEmail) {
    req.log.error("GGS_ADMIN_EMAIL is not configured");
    res.status(503).json({ error: "Akses admin belum dikonfigurasi." });
    return;
  }

  try {
    const user = await clerkClient.users.getUser(userId);
    const isAllowedOwner = user.emailAddresses.some(
      (email) =>
        email.emailAddress.trim().toLowerCase() === allowedEmail &&
        email.verification?.status === "verified",
    );
    if (!isAllowedOwner) {
      res.status(403).json({ error: "Akun ini tidak memiliki akses CMS GGS." });
      return;
    }
    next();
  } catch (error) {
    req.log.error({ err: error }, "Failed to verify GGS CMS owner");
    res.status(401).json({ error: "Sesi masuk tidak dapat diverifikasi." });
  }
};
