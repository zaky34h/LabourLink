import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Labourlink — Agency portal",
  description:
    "Manage your roster of labourers and keep your bench billable. The Labourlink agency dashboard.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
