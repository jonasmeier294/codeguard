import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CodeGuard - AI-Powered Code Reviews",
  description:
    "Automated code reviews powered by AI. Security scanning, code smell detection, and performance tips for every pull request.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
