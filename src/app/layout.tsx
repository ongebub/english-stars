import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "English Stars 🦉 · เรียนภาษาอังกฤษสนุกๆ",
  description: "Prepare your child for English school entrance exams. Fun flashcards, e-books, quizzes and more for Thai children aged 4-10.",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
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
