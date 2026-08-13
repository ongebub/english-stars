import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";

// Second layer of defence for the internal review tools. Layer 1 is
// protectedRoutes in src/middleware.ts (rejects logged-out requests); layer 3
// is RLS, which restricts the content-table writes these pages make to the
// authenticated role.
//
// This lives in a layout rather than in each page because every admin page
// except funnel is a client component ("use client"), which cannot run a
// server-side session check itself. A layout is also the only version of this
// guard that a newly added admin page cannot forget to include.
export default async function AdminLayout({
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
