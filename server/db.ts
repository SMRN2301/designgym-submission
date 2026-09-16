import { desc, eq, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { attempts, authTokens, InsertAttempt, InsertUser, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "username", "phone", "passwordHash", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByCredential(identifier: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(or(eq(users.email, identifier), eq(users.username, identifier), eq(users.phone, identifier))).limit(1);
  return result[0];
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0];
}

export async function getUserByUsername(username: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
  return result[0];
}

export async function getUserByPhone(phone: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
  return result[0];
}

export async function saveAttempt(attempt: InsertAttempt) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.insert(attempts).values(attempt).onDuplicateKeyUpdate({
    set: { status: attempt.status, submission: attempt.submission, evaluation: attempt.evaluation, updatedAt: new Date() },
  });
}

export async function listAttempts(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.select().from(attempts).where(eq(attempts.userId, userId)).orderBy(desc(attempts.updatedAt));
}

export async function updateUserProfile(userId: number, values: Partial<Pick<InsertUser, "name" | "learningTrack">>) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(users).set(values).where(eq(users.id, userId));
  return db.select().from(users).where(eq(users.id, userId)).limit(1).then(result => result[0]);
}

export async function updateUserPassword(userId: number, passwordHash: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
}

export async function createAuthToken(token: typeof authTokens.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.insert(authTokens).values(token);
}

export async function getAuthToken(tokenHash: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.select().from(authTokens).where(eq(authTokens.tokenHash, tokenHash)).limit(1);
  return result[0];
}

export async function consumeAuthToken(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(authTokens).set({ usedAt: new Date() }).where(eq(authTokens.id, id));
}

export async function markUserVerified(userId: number, kind: "email" | "phone") {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(users).set(kind === "email" ? { emailVerifiedAt: new Date() } : { phoneVerifiedAt: new Date() }).where(eq(users.id, userId));
}
