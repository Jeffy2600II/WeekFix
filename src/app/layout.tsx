import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WeekFix",
  description: "วางแผนงบประมาณรายสัปดาห์ในครอบครัว",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "WeekFix",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body className="antialiased selection:bg-indigo-100">{children}</body>
    </html>
  );
}
