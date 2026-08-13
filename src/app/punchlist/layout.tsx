import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";

// Same guard as src/app/admin/layout.tsx. /punchlist is a client component that
// updates punchlist_items and subjects.storybook_planned with the browser
// client, so it must not be reachable logged out.
export default async function PunchlistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isAdminEmail(user?.email)) {
    redirect("/login");
  }

  return <>{children}</>;
}
