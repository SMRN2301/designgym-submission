import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { nanoid } from "nanoid";
import { z } from "zod";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { sdk } from "./_core/sdk";
import { ENV } from "./_core/env";
import * as db from "./db";

const scrypt = promisify(scryptCallback);
const identifierSchema = z.string().trim().min(3).max(320);
const passwordSchema = z.string().min(8, "Use at least 8 characters").max(128);

function normalizeIdentifier(identifier: string) {
  const value = identifier.trim();
  if (value.includes("@")) return { email: value.toLowerCase() };
  if (/^\+?[0-9 ()-]{8,}$/.test(value)) return { phone: value.replace(/[^0-9+]/g, "") };
  return { username: value.toLowerCase() };
}

async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

async function verifyPassword(password: string, stored: string) {
  const [, saltHex, hashHex] = stored.split("$");
  if (!saltHex || !hashHex) return false;
  const derived = (await scrypt(password, Buffer.from(saltHex, "hex"), 64)) as Buffer;
  const expected = Buffer.from(hashHex, "hex");
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}

function createRawToken() { return randomBytes(32).toString("hex"); }
function tokenHash(token: string) { return createHash("sha256").update(token).digest("hex"); }
async function createVerificationToken(userId: number, kind: "email_verification" | "phone_verification" | "password_reset") {
  const token = createRawToken();
  await db.createAuthToken({ userId, tokenHash: tokenHash(token), kind, expiresAt: new Date(Date.now() + (kind === "password_reset" ? 30 : 60) * 60 * 1000) });
  return token;
}

async function issueCredentialSession(ctx: { req: any; res: any }, user: { openId: string; name: string | null }) {
  const token = await sdk.signSession({ openId: user.openId, appId: ENV.appId, name: user.name || "DesignGym learner" });
  ctx.res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(ctx.req), maxAge: ONE_YEAR_MS });
  return { success: true as const, user };
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    signup: publicProcedure.input(z.object({ name: z.string().trim().min(2).max(120), identifier: identifierSchema, password: passwordSchema })).mutation(async ({ input, ctx }) => {
      const identity = normalizeIdentifier(input.identifier);
      const existing = await db.getUserByCredential(input.identifier.trim().toLowerCase());
      if (existing) throw new Error("An account already exists with that login");
      const conflict = identity.email ? await db.getUserByEmail(identity.email) : identity.username ? await db.getUserByUsername(identity.username) : await db.getUserByPhone(identity.phone!);
      if (conflict) throw new Error("An account already exists with that login");
      const user = {
        openId: `cred_${nanoid(24)}`,
        name: input.name,
        email: identity.email ?? null,
        username: identity.username ?? null,
        phone: identity.phone ?? null,
        passwordHash: await hashPassword(input.password),
        loginMethod: "credentials",
      } as const;
      await db.upsertUser(user);
      const created = await db.getUserByOpenId(user.openId);
      if (!created) throw new Error("Account creation failed");
      return issueCredentialSession(ctx, created);
    }),
    login: publicProcedure.input(z.object({ identifier: identifierSchema, password: passwordSchema })).mutation(async ({ input, ctx }) => {
      const user = await db.getUserByCredential(input.identifier.trim().toLowerCase());
      if (!user?.passwordHash || !(await verifyPassword(input.password, user.passwordHash))) throw new Error("Invalid login details");
      return issueCredentialSession(ctx, user);
    }),
    requestPasswordReset: publicProcedure.input(z.object({ identifier: identifierSchema })).mutation(async ({ input }) => {
      const user = await db.getUserByCredential(input.identifier.trim().toLowerCase());
      if (!user) return { success: true as const, token: null };
      return { success: true as const, token: await createVerificationToken(user.id, "password_reset") };
    }),
    resetPassword: publicProcedure.input(z.object({ token: z.string().min(20), password: passwordSchema })).mutation(async ({ input }) => {
      const record = await db.getAuthToken(tokenHash(input.token));
      if (!record || record.kind !== "password_reset" || record.usedAt || record.expiresAt < new Date()) throw new Error("This reset link is invalid or expired");
      await db.updateUserPassword(record.userId, await hashPassword(input.password));
      await db.consumeAuthToken(record.id);
      return { success: true as const };
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  profile: router({
    me: protectedProcedure.query(({ ctx }) => ctx.user),
    update: protectedProcedure.input(z.object({ name: z.string().trim().min(2).max(120), learningTrack: z.string().trim().min(2).max(96) })).mutation(async ({ input, ctx }) => ({ user: await db.updateUserProfile(ctx.user.id, input) })),
    changePassword: protectedProcedure.input(z.object({ currentPassword: passwordSchema, newPassword: passwordSchema })).mutation(async ({ input, ctx }) => {
      if (!ctx.user.passwordHash || !(await verifyPassword(input.currentPassword, ctx.user.passwordHash))) throw new Error("Current password is incorrect");
      await db.updateUserPassword(ctx.user.id, await hashPassword(input.newPassword));
      return { success: true as const };
    }),
    requestVerification: protectedProcedure.input(z.object({ kind: z.enum(["email", "phone"]) })).mutation(async ({ input, ctx }) => {
      if (input.kind === "email" && !ctx.user.email) throw new Error("Add an email address before verifying it");
      if (input.kind === "phone" && !ctx.user.phone) throw new Error("Add a phone number before verifying it");
      const token = await createVerificationToken(ctx.user.id, input.kind === "email" ? "email_verification" : "phone_verification");
      return { success: true as const, token };
    }),
    verifyContact: protectedProcedure.input(z.object({ kind: z.enum(["email", "phone"]), token: z.string().min(20) })).mutation(async ({ input, ctx }) => {
      const record = await db.getAuthToken(tokenHash(input.token));
      const expectedKind = input.kind === "email" ? "email_verification" : "phone_verification";
      if (!record || record.userId !== ctx.user.id || record.kind !== expectedKind || record.usedAt || record.expiresAt < new Date()) throw new Error("This verification code is invalid or expired");
      await db.markUserVerified(ctx.user.id, input.kind);
      await db.consumeAuthToken(record.id);
      return { success: true as const };
    }),
  }),
  attempts: router({
    list: protectedProcedure.query(({ ctx }) => db.listAttempts(ctx.user.id)),
    save: protectedProcedure.input(z.object({ clientId: z.string().min(1).max(96), problemId: z.string().min(1).max(64), status: z.string().min(1).max(32), format: z.string().min(1).max(64), submission: z.record(z.string(), z.string()), evaluation: z.unknown().nullable().optional() })).mutation(async ({ input, ctx }) => {
      await db.saveAttempt({ ...input, userId: ctx.user.id, evaluation: input.evaluation ?? null });
      return { success: true as const };
    }),
  }),
});

export type AppRouter = typeof appRouter;
