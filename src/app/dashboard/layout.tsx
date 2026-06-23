'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* Navigation bar */}
      <nav className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo */}
          <Link
            href="/dashboard"
            className="text-xl font-bold text-text-dark font-nunito hover:text-sky-dark transition-colors"
          >
            English Stars 🦉
          </Link>

          {/* Navigation links */}
          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/dashboard"
              className="rounded-xl px-3 py-2 min-h-[48px] flex flex-col items-center justify-center
                         text-text-mid hover:text-sky-dark hover:bg-sky-dark/10 transition-colors"
            >
              <span className="font-nunito text-sm font-bold">Dashboard</span>
              <span className="font-sarabun text-xs">แดชบอร์ด</span>
            </Link>

            <Link
              href="/learn"
              className="rounded-xl px-3 py-2 min-h-[48px] flex flex-col items-center justify-center
                         text-text-mid hover:text-leaf hover:bg-leaf/10 transition-colors"
            >
              <span className="font-nunito text-sm font-bold">Learn</span>
              <span className="font-sarabun text-xs">เรียนรู้</span>
            </Link>

            <Link
              href="/gradebook"
              className="rounded-xl px-3 py-2 min-h-[48px] flex flex-col items-center justify-center
                         text-text-mid hover:text-coral hover:bg-coral/10 transition-colors"
            >
              <span className="font-nunito text-sm font-bold">Gradebook</span>
              <span className="font-sarabun text-xs">สมุดเกรด</span>
            </Link>

            <button
              onClick={handleLogout}
              className="rounded-xl px-3 py-2 min-h-[48px] flex flex-col items-center justify-center
                         text-text-mid hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              <span className="font-nunito text-sm font-bold">Logout</span>
              <span className="font-sarabun text-xs">ออกจากระบบ</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Page content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
