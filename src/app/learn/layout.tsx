import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ChildSessionGuard } from "@/components/ChildSessionGuard";
import { AppFooter } from "@/components/AppFooter";
import TutorialOverlay from "@/components/TutorialOverlay";
import { InstallPrompt } from "@/components/InstallPrompt";

export default function LearnLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white dark:bg-[#111827] transition-colors relative">
      {/* Background starfield — light */}
      <div
        className="fixed inset-0 z-0 pointer-events-none dark:hidden"
        style={{
          backgroundImage: "url(/starfield-light.webp)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      {/* Background starfield — dark */}
      <div
        className="fixed inset-0 z-0 pointer-events-none hidden dark:block"
        style={{
          backgroundImage: "url(/starfield-dark.webp)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      {/* ── Sticky top nav ── */}
      <nav className="sticky top-0 z-30 bg-sky-dark px-4 py-2 shadow-md relative">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link href="/learn" className="flex-shrink-0 flex items-center">
            <Image
              src="/logo-small.png"
              alt="English Allstars"
              width={64}
              height={64}
              priority
              className="rounded-lg w-12 h-12 sm:w-16 sm:h-16"
            />
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/learn"
              className="font-nunito text-sm font-semibold text-white/90 hover:text-white"
            >
              <span className="sm:hidden text-base" aria-label="Home">🏠</span>
              <span className="hidden sm:inline">Home / <span className="font-sarabun">หน้าหลัก</span></span>
            </Link>
            <Link
              href="/dashboard"
              className="font-nunito text-sm font-semibold text-white/90 hover:text-white"
            >
              <span className="sm:hidden text-base" aria-label="Dashboard">📊</span>
              <span className="hidden sm:inline">Dashboard / <span className="font-sarabun">แดชบอร์ด</span></span>
            </Link>
            <Link
              href="/settings/profile"
              className="font-nunito text-sm font-semibold text-white/90 hover:text-white"
            >
              <span className="sm:hidden text-base" aria-label="Profile">👤</span>
              <span className="hidden sm:inline">Profile / <span className="font-sarabun">โปรไฟล์</span></span>
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </nav>

      {/* ── Page content with session guard ── */}
      <main className="mx-auto max-w-4xl px-4 py-6 relative">
        <ChildSessionGuard>{children}</ChildSessionGuard>
      </main>
      <TutorialOverlay />
      <AppFooter />
      <InstallPrompt />
    </div>
  );
}
