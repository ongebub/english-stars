import Link from "next/link";

export function AppFooter() {
  return (
    <footer className="text-center py-4 px-4 text-xs text-text-light">
      <p>
        &copy; {new Date().getFullYear()} English Allstars LLC. All Rights Reserved.
      </p>
      <p className="font-sarabun mt-0.5">
        เนื้อหาทั้งหมดเป็นทรัพย์สินของ English Allstars LLC สงวนลิขสิทธิ์
      </p>
      <div className="mt-1 flex items-center justify-center gap-3">
        <Link href="/terms" className="hover:underline text-sky-dark">
          Terms & Conditions
        </Link>
        <span>·</span>
        <a href="mailto:info@englishallstars.com" className="hover:underline text-sky-dark">
          info@englishallstars.com
        </a>
      </div>
    </footer>
  );
}
