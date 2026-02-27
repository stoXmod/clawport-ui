import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { NavLinks } from "@/components/NavLinks";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "The Manor — Command Centre",
  description: "AI Agent Management Dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={geist.className}>
        <div className="flex h-screen overflow-hidden bg-[#0a0a0f]">
          <aside className="w-56 flex-shrink-0 border-r border-[#262632] bg-[#0d0d14] flex flex-col">
            <div className="p-5 border-b border-[#262632]">
              <div className="text-[#f5c518] font-bold text-lg tracking-tight">🏰 The Manor</div>
              <div className="text-[#86869b] text-xs mt-0.5">Command Centre</div>
            </div>
            <NavLinks />
          </aside>
          <main className="flex-1 overflow-hidden">{children}</main>
        </div>
      </body>
    </html>
  );
}
