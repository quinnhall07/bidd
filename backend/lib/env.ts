import "server-only";
import { z } from "zod";

// Validated once per server process. Error messages name the variable, never its value.

const KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
  "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
  "APP_BASE_URL",
  "FRONTEND_ORIGINS",
  "DEMO_MODE",
  "VERCEL_ENV",
] as const;

const EnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string({ error: "is missing" })
    .regex(
      /^(https:\/\/[a-z0-9]{15,40}\.supabase\.co|http:\/\/(127\.0\.0\.1|localhost):\d+)$/,
      "must be the project API URL (https://<project-ref>.supabase.co), not the dashboard link",
    ),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
    .string({ error: "is missing" })
    .regex(/^(sb_publishable_|eyJ)/, "must be the publishable key (sb_publishable_...)"),
  SUPABASE_SECRET_KEY: z
    .string({ error: "is missing" })
    .regex(/^(sb_secret_|eyJ)/, "must be the secret key (sb_secret_...)"),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),
  APP_BASE_URL: z.url("must be a full URL").default("http://localhost:3000"),
  FRONTEND_ORIGINS: z.string().default(""),
  DEMO_MODE: z.enum(["true", "false"], "must be true or false").default("false"),
  VERCEL_ENV: z.string().optional(),
});

export type Env = {
  supabaseUrl: string;
  publishableKey: string;
  secretKey: string;
  turnstileSiteKey: string | null;
  appBaseUrl: string;
  frontendOrigins: string[];
  demoMode: boolean;
  isProduction: boolean;
};

let cached: Env | null = null;

export function env(): Env {
  if (cached) return cached;

  // Literal process.env.X reads, not process.env[key]: Next.js only inlines NEXT_PUBLIC_* values at build time
  // when they're written out, and Vercel "config" variables may not be present at runtime otherwise.
  const values: Record<(typeof KEYS)[number], string | undefined> = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    APP_BASE_URL: process.env.APP_BASE_URL,
    FRONTEND_ORIGINS: process.env.FRONTEND_ORIGINS,
    DEMO_MODE: process.env.DEMO_MODE,
    VERCEL_ENV: process.env.VERCEL_ENV,
  };
  const raw = Object.fromEntries(
    KEYS.map((key) => {
      const value = values[key]?.trim();
      return [key, value === "" ? undefined : value];
    }),
  );

  const parsed = EnvSchema.safeParse(raw);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ");
    throw new Error(`Invalid backend environment (check backend/.env.local): ${problems}`);
  }

  const e = parsed.data;
  const isProduction = e.VERCEL_ENV === "production";
  const demoMode = e.DEMO_MODE === "true";
  if (demoMode && isProduction) {
    throw new Error("DEMO_MODE must never be true on the production deployment");
  }

  cached = {
    supabaseUrl: e.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: e.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    secretKey: e.SUPABASE_SECRET_KEY,
    turnstileSiteKey: e.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? null,
    appBaseUrl: e.APP_BASE_URL.replace(/\/+$/, ""),
    frontendOrigins: e.FRONTEND_ORIGINS.split(",")
      .map((o) => o.trim().replace(/\/+$/, ""))
      .filter(Boolean),
    demoMode,
    isProduction,
  };
  return cached;
}
