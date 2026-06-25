import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfilePickerClient from "./ProfilePickerClient";

export const dynamic = "force-dynamic";

export default async function SelectProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: children } = await supabase
    .from("profiles")
    .select("*")
    .eq("parent_id", user.id)
    .order("created_at", { ascending: true });

  return <ProfilePickerClient childProfiles={children ?? []} />;
}
