import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function UploadRedirectPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?next=/subtitles");
  }
  if (user.role !== "admin") {
    redirect("/dashboard");
  }
  redirect("/subtitles");
}
