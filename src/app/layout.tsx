import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "English Allstars | เรียนภาษาอังกฤษ",
  description: "English Allstars - K-1 ESL test prep for Thai children preparing for English school entrance exams.",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "English Allstars",
    description: "K-1 ESL test prep for Thai children",
    images: ["/logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-nunito antialiased">
        {children}
      </body>
    </html>
  );
}
