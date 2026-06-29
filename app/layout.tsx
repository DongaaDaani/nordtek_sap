import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nordtek SAP Interface",
  description: "SAP Business One integrációs felület — Nordtek",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hu">
      <body className="bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  );
}
