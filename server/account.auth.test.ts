import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

describe("account settings protection", () => {
  it("rejects profile reads without an authenticated session", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    await expect(caller.profile.me()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects protected verification actions without an authenticated session", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    await expect(caller.profile.requestVerification({ kind: "email" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
