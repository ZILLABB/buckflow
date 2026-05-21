import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BuckFlow AI",
  description: "AI-powered WhatsApp Sales & Support for Nigerian Businesses",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full">{children}</body>
    </html>
  );
}
