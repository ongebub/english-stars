import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DashboardClient from './DashboardClient';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch parent profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // Fetch children profiles
  const { data: children } = await supabase
    .from('profiles')
    .select('*')
    .eq('parent_id', user.id)
    .order('created_at', { ascending: true });

  return (
    <DashboardClient
      profile={profile ?? null}
      childProfiles={children ?? []}
    />
  );
}
