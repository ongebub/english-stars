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
    .eq('account_type', 'family')
    .order('created_at', { ascending: true });

  // Fetch subscription
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('status, plan_type, child_count')
    .eq('user_id', user.id)
    .single();

  const isSubscribed = subscription?.status === 'active';
  const planType = (subscription?.plan_type as 'family' | 'school') || 'family';
  const childCount = subscription?.child_count ?? Math.max((children ?? []).length, 1);

  // Get school code if school plan
  let schoolCode: string | null = null;
  let schoolName: string | null = null;
  if (planType === 'school') {
    const { data: code } = await supabase
      .from('school_codes')
      .select('code, school_name')
      .eq('user_id', user.id)
      .single();
    schoolCode = code?.code ?? null;
    schoolName = code?.school_name ?? null;
  }

  return (
    <DashboardClient
      profile={profile ?? null}
      childProfiles={children ?? []}
      isSubscribed={isSubscribed}
      planType={planType}
      childCount={childCount}
      schoolCode={schoolCode}
      schoolName={schoolName}
    />
  );
}
