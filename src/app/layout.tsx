import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rubric Lens",
  description: "Distributed assessment and reflective learning",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
