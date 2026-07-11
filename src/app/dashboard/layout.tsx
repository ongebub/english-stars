'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { ThemeToggle } from '@/components/ThemeToggle';
import { AppFooter } from '@/components/AppFooter';

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
    <div className="min-h-screen bg-cream dark:bg-gray-900 transition-colors">
      {/* Navigation bar */}
      <nav className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-50 transition-colors">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center">
            <Image
              src="/logo-small.png"
              alt="English Allstars"
              width={96}
              height={96}
              priority
              className="rounded-lg"
            />
          </Link>

          {/* Navigation links */}
          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/dashboard"
              className="rounded-xl px-3 py-2 min-h-[48px] flex flex-col items-center justify-center
                         text-text-mid dark:text-gray-300 hover:text-sky-dark dark:hover:text-sky hover:bg-sky-dark/10 dark:hover:bg-sky-dark/20 transition-colors"
            >
              <span className="font-nunito text-sm font-bold">Dashboard</span>
              <span className="font-sarabun text-xs">แดชบอร์ด</span>
            </Link>

            <Link
              href="/learn"
              className="rounded-xl px-3 py-2 min-h-[48px] flex flex-col items-center justify-center
                         text-text-mid dark:text-gray-300 hover:text-leaf dark:hover:text-leaf hover:bg-leaf/10 dark:hover:bg-leaf/20 transition-colors"
            >
              <span className="font-nunito text-sm font-bold">Learn</span>
              <span className="font-sarabun text-xs">เรียนรู้</span>
            </Link>

            <Link
              href="/gradebook"
              className="rounded-xl px-3 py-2 min-h-[48px] flex flex-col items-center justify-center
                         text-text-mid dark:text-gray-300 hover:text-coral dark:hover:text-coral hover:bg-coral/10 dark:hover:bg-coral/20 transition-colors"
            >
              <span className="font-nunito text-sm font-bold">Gradebook</span>
              <span className="font-sarabun text-xs">สมุดเกรด</span>
            </Link>

            <ThemeToggle variant="light-bg" />

            <button
              onClick={handleLogout}
              className="rounded-xl px-3 py-2 min-h-[48px] flex flex-col items-center justify-center
                         text-text-mid dark:text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
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
      <AppFooter />
    </div>
  );
}
