import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ChildSessionGuard } from "@/components/ChildSessionGuard";
import { AppFooter } from "@/components/AppFooter";

export default function LearnLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F5F7FA] dark:bg-gray-900 transition-colors relative">
      {/* Background starfield */}
      <div
        className="fixed inset-0 z-0 pointer-events-none opacity-50 dark:opacity-30"
        style={{
          backgroundImage: "url(/starfield.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />
      {/* ── Sticky top nav ── */}
      <nav className="sticky top-0 z-30 bg-sky-dark px-4 py-2 shadow-md relative">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link href="/learn" className="flex items-center">
            <Image
              src="/logo-small.png"
              alt="English Allstars"
              width={96}
              height={96}
              priority
              className="rounded-lg"
            />
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/learn"
              className="font-nunito text-sm font-semibold text-white/90 hover:text-white"
            >
              Home / <span className="font-sarabun">หน้าหลัก</span>
            </Link>
            <Link
              href="/dashboard"
              className="font-nunito text-sm font-semibold text-white/90 hover:text-white"
            >
              Dashboard / <span className="font-sarabun">แดชบอร์ด</span>
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </nav>

      {/* ── Page content with session guard ── */}
      <main className="mx-auto max-w-4xl px-4 py-6 relative z-10">
        <ChildSessionGuard>{children}</ChildSessionGuard>
      </main>
      <AppFooter />
    </div>
  );
}
