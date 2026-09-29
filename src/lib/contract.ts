import { z } from "zod";
export const subscriptionInput = z.object({
  app: z.string().regex(/^[a-z][a-z0-9-]{1,40}$/),
  subscription: z.object({ endpoint: z.url().refine((value) => value.startsWith("https://")), expirationTime: z.number().nullable().optional(), keys: z.object({ p256dh: z.string().min(20), auth: z.string().min(10) }) }),
});
export const eventInput = z.object({
  app: z.string().regex(/^[a-z][a-z0-9-]{1,40}$/),
  event: z.string().regex(/^[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*$/),
  title: z.string().trim().min(1).max(100),
  body: z.string().trim().min(1).max(240),
  path: z.string().startsWith("/").max(200).refine((path) => !path.startsWith("//") && !path.includes("\\") && !path.includes("..")),
  priority: z.enum(["normal", "high"]).default("normal"),
  expiresAt: z.iso.datetime().nullable().optional(),
  dedupeKey: z.string().trim().min(1).max(150),
});
