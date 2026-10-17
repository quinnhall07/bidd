// Mock sign-in (build.md /login). Swap for Supabase email codes later; the domain → campus lookup stays.
import { getCampuses } from "@/lib/data";
import { labQuery, parseLab } from "@/lib/lab";
import { one } from "@/lib/page";
import { LoginFlow } from "@/components/login-flow";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const lab = parseLab(params);
  const q = labQuery(lab);
  q.delete("school");
  const campuses = (await getCampuses()).map(({ slug, name, full_name, email_domains, primary_color, secondary_color, logo_url, logo_url_dark }) => ({
    slug,
    name,
    full_name,
    email_domains,
    primary_color,
    secondary_color,
    logo_url,
    logo_url_dark,
  }));
  return <LoginFlow campuses={campuses} labQuery={q.toString()} initialEmail={one(params.email) ?? ""} logos={lab.logos} />;
}
