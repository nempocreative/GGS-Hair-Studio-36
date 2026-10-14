import { createHash, randomBytes } from "node:crypto";
import { and, asc, desc, eq, gt, isNull, lt } from "drizzle-orm";
import {
  Router,
  type IRouter,
  type Request,
  type Response,
} from "express";
import {
  CheckInGgsEmployeeAttendanceBody,
  CreateGgsAdminEmployeeBody,
  CreateGgsAdminEmployeeResponse,
  CreateGgsEmployeeAttendanceChallengeBody,
  CreateGgsEmployeeAttendanceChallengeResponse,
  GetGgsEmployeeAttendanceHistoryResponse,
  GetGgsAdminEmployeesResponse,
  GetGgsEmployeeAttendanceTodayResponse,
  GetGgsEmployeeBookingsResponse,
  GetGgsEmployeeSessionResponse,
  CheckInGgsEmployeeAttendanceResponse,
  CheckOutGgsEmployeeAttendanceBody,
  CheckOutGgsEmployeeAttendanceResponse,
  LoginGgsEmployeeBody,
  LoginGgsEmployeeResponse,
  UpdateGgsAdminEmployeeBody,
  UpdateGgsAdminEmployeeParams,
  UpdateGgsAdminEmployeeResponse,
} from "@workspace/api-zod";
import {
  db,
  ggsAppointmentsTable,
  ggsEmployeeAccountsTable,
  ggsEmployeeAttendanceChallengeUsesTable,
  ggsEmployeeAttendanceChallengesTable,
  ggsEmployeeAttendanceTable,
  ggsEmployeeSessionsTable,
} from "@workspace/db";
import {
  hashPassword,
  hashSessionToken,
  verifyPassword,
} from "../lib/account-security";
import { requireGgsOwner } from "../middlewares/requireGgsOwner";

const router: IRouter = Router();
const employeeCookieName = "ggs_employee_session";
const employeeCookiePath = "/api/ggs/employee";
const employeeSessionMaxAgeMs = 1000 * 60 * 60 * 12;
const attemptWindowMs = 15 * 60 * 1000;
const attemptLimit = 10;
const loginAttempts = new Map<string, { count: number; expiresAt: number }>();
const attendanceSalonLocation = {
  latitude: -7.20282,
  longitude: 107.8898963,
  radiusMeters: 100,
  maxAccuracyMeters: 100,
};
const attendanceChallengeLifetimeMs = 45_000;

class AttendanceMutationFailure extends Error {
  constructor(message: string) {
    super(message);
  }
}

type AttendanceLocation = {
  latitude: number;
  longitude: number;
  accuracy: number;
};

function distanceToSalonMeters(latitude: number, longitude: number) {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const earthRadiusMeters = 6_371_000;
  const latitudeDelta = radians(latitude - attendanceSalonLocation.latitude);
  const longitudeDelta = radians(longitude - attendanceSalonLocation.longitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(attendanceSalonLocation.latitude)) *
      Math.cos(radians(latitude)) *
      Math.sin(longitudeDelta / 2) ** 2;
  return (
    earthRadiusMeters *
    2 *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
}

function attendanceLocationFailure(location: AttendanceLocation): string | null {
  if (location.accuracy > attendanceSalonLocation.maxAccuracyMeters) {
    return "Akurasi GPS belum cukup. Aktifkan lokasi presisi lalu coba lagi.";
  }
  if (
    distanceToSalonMeters(location.latitude, location.longitude) >
    attendanceSalonLocation.radiusMeters
  ) {
    return "Absensi hanya dapat dilakukan di area salon.";
  }
  return null;
}

type EmployeeRecord = {
  id: string;
  employeeId: string;
  name: string;
  active: boolean;
  createdAt: Date;
};

function cookieOptions(maxAge?: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: employeeCookiePath,
    ...(maxAge === undefined ? {} : { maxAge }),
  };
}

function serializeEmployee(employee: EmployeeRecord) {
  return {
    id: employee.id,
    employeeId: employee.employeeId,
    name: employee.name,
    active: employee.active,
    createdAt: employee.createdAt.toISOString(),
  };
}

function normalizeEmployeeId(employeeId: string) {
  return employeeId.trim().toUpperCase();
}

function jakartaAttendanceDate(date = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Jakarta",
  }).format(date);
}

function serializeAttendance(
  attendanceDate: string,
  attendance?: typeof ggsEmployeeAttendanceTable.$inferSelect,
) {
  return {
    attendanceDate,
    status: !attendance
      ? "not_started"
      : attendance.checkOutAt
        ? "checked_out"
        : "checked_in",
    checkInAt: attendance?.checkInAt.toISOString() ?? null,
    checkOutAt: attendance?.checkOutAt?.toISOString() ?? null,
  };
}

function attemptKeys(req: Request, employeeId: string) {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const identity = createHash("sha256")
    .update(normalizeEmployeeId(employeeId))
    .digest("hex");
  return [`ip:${ip}`, `employee:${identity}`];
}

function canAttemptLogin(keys: string[]) {
  const now = Date.now();
  let allowed = true;

  for (const key of keys) {
    const existing = loginAttempts.get(key);
    if (!existing || existing.expiresAt <= now) {
      loginAttempts.set(key, {
        count: 1,
        expiresAt: now + attemptWindowMs,
      });
      continue;
    }
    if (existing.count >= attemptLimit) {
      allowed = false;
      continue;
    }
    existing.count += 1;
  }

  for (const [key, attempt] of loginAttempts) {
    if (attempt.expiresAt <= now) loginAttempts.delete(key);
  }

  return allowed;
}

async function getEmployeeForSession(
  req: Request,
  res: Response,
): Promise<EmployeeRecord | null> {
  const token = req.cookies?.[employeeCookieName];
  if (typeof token !== "string" || token.length === 0) {
    res.clearCookie(employeeCookieName, cookieOptions());
    return null;
  }

  const tokenHash = hashSessionToken(token);
  const [employee] = await db
    .select({
      id: ggsEmployeeAccountsTable.id,
      employeeId: ggsEmployeeAccountsTable.employeeId,
      name: ggsEmployeeAccountsTable.name,
      active: ggsEmployeeAccountsTable.active,
      createdAt: ggsEmployeeAccountsTable.createdAt,
    })
    .from(ggsEmployeeSessionsTable)
    .innerJoin(
      ggsEmployeeAccountsTable,
      eq(ggsEmployeeSessionsTable.employeeId, ggsEmployeeAccountsTable.id),
    )
    .where(
      and(
        eq(ggsEmployeeSessionsTable.tokenHash, tokenHash),
        gt(ggsEmployeeSessionsTable.expiresAt, new Date()),
        eq(ggsEmployeeAccountsTable.active, true),
      ),
    )
    .limit(1);

  if (!employee) {
    await db
      .delete(ggsEmployeeSessionsTable)
      .where(eq(ggsEmployeeSessionsTable.tokenHash, tokenHash));
    res.clearCookie(employeeCookieName, cookieOptions());
    return null;
  }
  return employee;
}

router.post("/ggs/employee/login", async (req, res): Promise<void> => {
  const parsed = LoginGgsEmployeeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const employeeId = normalizeEmployeeId(parsed.data.employeeId);
  const keys = attemptKeys(req, employeeId);
  if (!canAttemptLogin(keys)) {
    res.status(429).json({ error: "Terlalu banyak percobaan masuk." });
    return;
  }

  const [employee] = await db
    .select()
    .from(ggsEmployeeAccountsTable)
    .where(eq(ggsEmployeeAccountsTable.employeeId, employeeId))
    .limit(1);

  const passwordMatches = employee
    ? await verifyPassword(parsed.data.password, employee.passwordHash)
    : false;
  if (!employee || !employee.active || !passwordMatches) {
    res.status(401).json({ error: "ID karyawan atau kata sandi tidak sesuai." });
    return;
  }

  for (const key of keys) loginAttempts.delete(key);

  const token = randomBytes(32).toString("base64url");
  await db.insert(ggsEmployeeSessionsTable).values({
    tokenHash: hashSessionToken(token),
    employeeId: employee.id,
    expiresAt: new Date(Date.now() + employeeSessionMaxAgeMs),
  });
  res.cookie(employeeCookieName, token, {
    ...cookieOptions(employeeSessionMaxAgeMs),
  });

  res.json(
    LoginGgsEmployeeResponse.parse(
      serializeEmployee({
        id: employee.id,
        employeeId: employee.employeeId,
        name: employee.name,
        active: employee.active,
        createdAt: employee.createdAt,
      }),
    ),
  );
});

router.get("/ggs/employee/session", async (req, res): Promise<void> => {
  const employee = await getEmployeeForSession(req, res);
  if (!employee) {
    res.status(401).json({ error: "Silakan masuk dengan akun karyawan." });
    return;
  }
  res.json(GetGgsEmployeeSessionResponse.parse(serializeEmployee(employee)));
});

router.post("/ggs/employee/logout", async (req, res): Promise<void> => {
  const token = req.cookies?.[employeeCookieName];
  if (typeof token === "string" && token.length > 0) {
    await db
      .delete(ggsEmployeeSessionsTable)
      .where(eq(ggsEmployeeSessionsTable.tokenHash, hashSessionToken(token)));
  }
  res.clearCookie(employeeCookieName, cookieOptions());
  res.sendStatus(204);
});

router.get("/ggs/employee/bookings", async (req, res): Promise<void> => {
  const employee = await getEmployeeForSession(req, res);
  if (!employee) {
    res.status(401).json({ error: "Silakan masuk dengan akun karyawan." });
    return;
  }

  const appointments = await db
    .select({
      id: ggsAppointmentsTable.id,
      customerName: ggsAppointmentsTable.customerName,
      phone: ggsAppointmentsTable.phone,
      serviceName: ggsAppointmentsTable.serviceName,
      appointmentDate: ggsAppointmentsTable.appointmentDate,
      appointmentTime: ggsAppointmentsTable.appointmentTime,
      notes: ggsAppointmentsTable.notes,
      status: ggsAppointmentsTable.status,
    })
    .from(ggsAppointmentsTable)
    .orderBy(
      asc(ggsAppointmentsTable.appointmentDate),
      asc(ggsAppointmentsTable.appointmentTime),
    );

  res.json(GetGgsEmployeeBookingsResponse.parse(appointments));
});

router.get(
  "/ggs/employee/attendance/today",
  async (req, res): Promise<void> => {
    const employee = await getEmployeeForSession(req, res);
    if (!employee) {
      res.status(401).json({ error: "Silakan masuk dengan akun karyawan." });
      return;
    }

    const attendanceDate = jakartaAttendanceDate();
    const [attendance] = await db
      .select()
      .from(ggsEmployeeAttendanceTable)
      .where(
        and(
          eq(ggsEmployeeAttendanceTable.employeeId, employee.id),
          eq(ggsEmployeeAttendanceTable.attendanceDate, attendanceDate),
        ),
      )
      .limit(1);

    res.json(
      GetGgsEmployeeAttendanceTodayResponse.parse(
        serializeAttendance(attendanceDate, attendance),
      ),
    );
  },
);

router.get(
  "/ggs/employee/attendance/history",
  async (req, res): Promise<void> => {
    const employee = await getEmployeeForSession(req, res);
    if (!employee) {
      res.status(401).json({ error: "Silakan masuk dengan akun karyawan." });
      return;
    }

    const attendanceDate = jakartaAttendanceDate();
    const history = await db
      .select()
      .from(ggsEmployeeAttendanceTable)
      .where(
        and(
          eq(ggsEmployeeAttendanceTable.employeeId, employee.id),
          lt(ggsEmployeeAttendanceTable.attendanceDate, attendanceDate),
        ),
      )
      .orderBy(desc(ggsEmployeeAttendanceTable.attendanceDate))
      .limit(5);

    res.json(
      GetGgsEmployeeAttendanceHistoryResponse.parse(
        history.map((attendance) =>
          serializeAttendance(attendance.attendanceDate, attendance),
        ),
      ),
    );
  },
);

router.post(
  "/ggs/employee/attendance/qr",
  async (req, res): Promise<void> => {
    const employee = await getEmployeeForSession(req, res);
    if (!employee) {
      res.status(401).json({ error: "Silakan masuk dengan akun karyawan." });
      return;
    }

    const parsed = CreateGgsEmployeeAttendanceChallengeBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const locationError = attendanceLocationFailure(parsed.data);
    if (locationError) {
      res.status(403).json({ error: locationError });
      return;
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + attendanceChallengeLifetimeMs);
    const challengeToken = randomBytes(32).toString("base64url");
    await db
      .delete(ggsEmployeeAttendanceChallengesTable)
      .where(lt(ggsEmployeeAttendanceChallengesTable.expiresAt, now));
    await db.insert(ggsEmployeeAttendanceChallengesTable).values({
      tokenHash: hashSessionToken(challengeToken),
      createdByEmployeeId: employee.id,
      expiresAt,
    });

    res.status(201).json(
      CreateGgsEmployeeAttendanceChallengeResponse.parse({
        challengeToken,
        expiresAt: expiresAt.toISOString(),
      }),
    );
  },
);

router.post(
  "/ggs/employee/attendance/check-in",
  async (req, res): Promise<void> => {
    const employee = await getEmployeeForSession(req, res);
    if (!employee) {
      res.status(401).json({ error: "Silakan masuk dengan akun karyawan." });
      return;
    }

    const parsed = CheckInGgsEmployeeAttendanceBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const locationError = attendanceLocationFailure(parsed.data);
    if (locationError) {
      res.status(403).json({ error: locationError });
      return;
    }

    const attendanceDate = jakartaAttendanceDate();
    const checkedInAt = new Date();
    let attendance: typeof ggsEmployeeAttendanceTable.$inferSelect;
    try {
      attendance = await db.transaction(async (tx) => {
        const [challenge] = await tx
          .select()
          .from(ggsEmployeeAttendanceChallengesTable)
          .where(
            eq(
              ggsEmployeeAttendanceChallengesTable.tokenHash,
              hashSessionToken(parsed.data.challengeToken),
            ),
          )
          .limit(1);
        if (!challenge || challenge.expiresAt.getTime() <= checkedInAt.getTime()) {
          throw new AttendanceMutationFailure(
            "QR absensi tidak valid atau sudah kedaluwarsa.",
          );
        }

        const [existingAttendance] = await tx
          .select({ id: ggsEmployeeAttendanceTable.id })
          .from(ggsEmployeeAttendanceTable)
          .where(
            and(
              eq(ggsEmployeeAttendanceTable.employeeId, employee.id),
              eq(ggsEmployeeAttendanceTable.attendanceDate, attendanceDate),
            ),
          )
          .limit(1);
        if (existingAttendance) {
          throw new AttendanceMutationFailure("Anda sudah absen masuk hari ini.");
        }

        const [challengeUse] = await tx
          .insert(ggsEmployeeAttendanceChallengeUsesTable)
          .values({ challengeId: challenge.id, employeeId: employee.id })
          .onConflictDoNothing({
            target: [
              ggsEmployeeAttendanceChallengeUsesTable.challengeId,
              ggsEmployeeAttendanceChallengeUsesTable.employeeId,
            ],
          })
          .returning({ id: ggsEmployeeAttendanceChallengeUsesTable.id });
        if (!challengeUse) {
          throw new AttendanceMutationFailure(
            "QR ini sudah digunakan untuk absensi Anda. Muat QR terbaru.",
          );
        }

        const [createdAttendance] = await tx
          .insert(ggsEmployeeAttendanceTable)
          .values({
            employeeId: employee.id,
            attendanceDate,
            checkInAt: checkedInAt,
          })
          .onConflictDoNothing({
            target: [
              ggsEmployeeAttendanceTable.employeeId,
              ggsEmployeeAttendanceTable.attendanceDate,
            ],
          })
          .returning();
        if (!createdAttendance) {
          throw new AttendanceMutationFailure("Anda sudah absen masuk hari ini.");
        }
        return createdAttendance;
      });
    } catch (error) {
      if (error instanceof AttendanceMutationFailure) {
        res.status(409).json({ error: error.message });
        return;
      }
      throw error;
    }

    res.status(201).json(
      CheckInGgsEmployeeAttendanceResponse.parse(
        serializeAttendance(attendanceDate, attendance),
      ),
    );
  },
);

router.post(
  "/ggs/employee/attendance/check-out",
  async (req, res): Promise<void> => {
    const employee = await getEmployeeForSession(req, res);
    if (!employee) {
      res.status(401).json({ error: "Silakan masuk dengan akun karyawan." });
      return;
    }

    const parsed = CheckOutGgsEmployeeAttendanceBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const locationError = attendanceLocationFailure(parsed.data);
    if (locationError) {
      res.status(403).json({ error: locationError });
      return;
    }

    const attendanceDate = jakartaAttendanceDate();
    const checkedOutAt = new Date();
    let attendance: typeof ggsEmployeeAttendanceTable.$inferSelect;
    try {
      attendance = await db.transaction(async (tx) => {
        const [challenge] = await tx
          .select()
          .from(ggsEmployeeAttendanceChallengesTable)
          .where(
            eq(
              ggsEmployeeAttendanceChallengesTable.tokenHash,
              hashSessionToken(parsed.data.challengeToken),
            ),
          )
          .limit(1);
        if (!challenge || challenge.expiresAt.getTime() <= checkedOutAt.getTime()) {
          throw new AttendanceMutationFailure(
            "QR absensi tidak valid atau sudah kedaluwarsa.",
          );
        }

        const [existingAttendance] = await tx
          .select()
          .from(ggsEmployeeAttendanceTable)
          .where(
            and(
              eq(ggsEmployeeAttendanceTable.employeeId, employee.id),
              eq(ggsEmployeeAttendanceTable.attendanceDate, attendanceDate),
            ),
          )
          .limit(1);
        if (!existingAttendance) {
          throw new AttendanceMutationFailure("Absen masuk terlebih dahulu.");
        }
        if (existingAttendance.checkOutAt) {
          throw new AttendanceMutationFailure("Anda sudah absen pulang hari ini.");
        }

        const [challengeUse] = await tx
          .insert(ggsEmployeeAttendanceChallengeUsesTable)
          .values({ challengeId: challenge.id, employeeId: employee.id })
          .onConflictDoNothing({
            target: [
              ggsEmployeeAttendanceChallengeUsesTable.challengeId,
              ggsEmployeeAttendanceChallengeUsesTable.employeeId,
            ],
          })
          .returning({ id: ggsEmployeeAttendanceChallengeUsesTable.id });
        if (!challengeUse) {
          throw new AttendanceMutationFailure(
            "QR ini sudah digunakan untuk absensi Anda. Muat QR terbaru.",
          );
        }

        const [updatedAttendance] = await tx
          .update(ggsEmployeeAttendanceTable)
          .set({ checkOutAt: checkedOutAt })
          .where(
            and(
              eq(ggsEmployeeAttendanceTable.id, existingAttendance.id),
              isNull(ggsEmployeeAttendanceTable.checkOutAt),
            ),
          )
          .returning();
        if (!updatedAttendance) {
          throw new AttendanceMutationFailure(
            "Absensi sudah diperbarui. Muat ulang halaman.",
          );
        }
        return updatedAttendance;
      });
    } catch (error) {
      if (error instanceof AttendanceMutationFailure) {
        res.status(409).json({ error: error.message });
        return;
      }
      throw error;
    }

    res.json(
      CheckOutGgsEmployeeAttendanceResponse.parse(
        serializeAttendance(attendanceDate, attendance),
      ),
    );
  },
);

router.get(
  "/ggs/admin/employees",
  requireGgsOwner,
  async (_req, res): Promise<void> => {
  const employees = await db
    .select({
      id: ggsEmployeeAccountsTable.id,
      employeeId: ggsEmployeeAccountsTable.employeeId,
      name: ggsEmployeeAccountsTable.name,
      active: ggsEmployeeAccountsTable.active,
      createdAt: ggsEmployeeAccountsTable.createdAt,
    })
    .from(ggsEmployeeAccountsTable)
    .orderBy(asc(ggsEmployeeAccountsTable.name));

  res.json(
    GetGgsAdminEmployeesResponse.parse(
      employees.map((employee) =>
        serializeEmployee({
          ...employee,
          createdAt: employee.createdAt,
        }),
      ),
    ),
  );
  },
);

router.post(
  "/ggs/admin/employees",
  requireGgsOwner,
  async (req, res): Promise<void> => {
  const parsed = CreateGgsAdminEmployeeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const employeeId = normalizeEmployeeId(parsed.data.employeeId);
  const name = parsed.data.name.trim();
  if (name.length < 2) {
    res.status(400).json({ error: "Nama karyawan minimal 2 karakter." });
    return;
  }

  const [existing] = await db
    .select({ id: ggsEmployeeAccountsTable.id })
    .from(ggsEmployeeAccountsTable)
    .where(eq(ggsEmployeeAccountsTable.employeeId, employeeId))
    .limit(1);
  if (existing) {
    res.status(409).json({ error: "ID karyawan sudah digunakan." });
    return;
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const [employee] = await db
    .insert(ggsEmployeeAccountsTable)
    .values({ employeeId, name, passwordHash })
    .onConflictDoNothing({
      target: ggsEmployeeAccountsTable.employeeId,
    })
    .returning({
      id: ggsEmployeeAccountsTable.id,
      employeeId: ggsEmployeeAccountsTable.employeeId,
      name: ggsEmployeeAccountsTable.name,
      active: ggsEmployeeAccountsTable.active,
      createdAt: ggsEmployeeAccountsTable.createdAt,
    });

  if (!employee) {
    res.status(409).json({ error: "ID karyawan sudah digunakan." });
    return;
  }
  res.status(201).json(
    CreateGgsAdminEmployeeResponse.parse(
      serializeEmployee({
        ...employee,
        createdAt: employee.createdAt,
      }),
    ),
  );
  },
);

router.patch(
  "/ggs/admin/employees/:id",
  requireGgsOwner,
  async (req, res): Promise<void> => {
    const params = UpdateGgsAdminEmployeeParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = UpdateGgsAdminEmployeeBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const employeeId =
      parsed.data.employeeId === undefined
        ? undefined
        : normalizeEmployeeId(parsed.data.employeeId);
    const name =
      parsed.data.name === undefined ? undefined : parsed.data.name.trim();
    if (name !== undefined && name.length < 2) {
      res.status(400).json({ error: "Nama karyawan minimal 2 karakter." });
      return;
    }

    if (employeeId) {
      const [existing] = await db
        .select({ id: ggsEmployeeAccountsTable.id })
        .from(ggsEmployeeAccountsTable)
        .where(eq(ggsEmployeeAccountsTable.employeeId, employeeId))
        .limit(1);
      if (existing && existing.id !== params.data.id) {
        res.status(409).json({ error: "ID karyawan sudah digunakan." });
        return;
      }
    }

    const updates: Partial<typeof ggsEmployeeAccountsTable.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (employeeId !== undefined) updates.employeeId = employeeId;
    if (name !== undefined) updates.name = name;
    if (parsed.data.active !== undefined) updates.active = parsed.data.active;
    if (parsed.data.password !== undefined) {
      updates.passwordHash = await hashPassword(parsed.data.password);
    }

    const [employee] = await db
      .update(ggsEmployeeAccountsTable)
      .set(updates)
      .where(eq(ggsEmployeeAccountsTable.id, params.data.id))
      .returning({
        id: ggsEmployeeAccountsTable.id,
        employeeId: ggsEmployeeAccountsTable.employeeId,
        name: ggsEmployeeAccountsTable.name,
        active: ggsEmployeeAccountsTable.active,
        createdAt: ggsEmployeeAccountsTable.createdAt,
      });
    if (!employee) {
      res.status(404).json({ error: "Akun karyawan tidak ditemukan." });
      return;
    }

    if (parsed.data.active === false || parsed.data.password !== undefined) {
      await db
        .delete(ggsEmployeeSessionsTable)
        .where(eq(ggsEmployeeSessionsTable.employeeId, employee.id));
    }

    res.json(
      UpdateGgsAdminEmployeeResponse.parse(
        serializeEmployee({
          ...employee,
          createdAt: employee.createdAt,
        }),
      ),
    );
  },
);

export default router;
