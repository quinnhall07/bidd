import { notFound } from "next/navigation";
import DevConsole from "./dev-console";

export const metadata = { title: "Bidd /dev" };

// Bare test UI for the team to click through the API. Not the product UI; hidden in production.
export default function DevPage() {
  if (process.env.VERCEL_ENV === "production") notFound();
  return <DevConsole turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || null} />;
}
