import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Voda Haul Admin",
  description: "Operations dashboard for Accra logistics marketplace"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
