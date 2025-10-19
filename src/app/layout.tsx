import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FinLit Classroom",
  description: "A financial literacy app for classrooms",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
