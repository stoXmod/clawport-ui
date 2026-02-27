"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const NAV_ITEMS = [
  { href: "/", icon: "🗺️", label: "Manor Map" },
  { href: "/crons", icon: "⏰", label: "Cron Monitor" },
  { href: "/memory", icon: "🧠", label: "Memory" },
];

export function NavLinks() {
  const pathname = usePathname();
  const [agentCount, setAgentCount] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/agents")
      .then((r) => r.json())
      .then((agents: unknown[]) => setAgentCount(agents.length))
      .catch(() => {});
  }, []);

  return (
    <nav className="flex-1 flex flex-col">
      <div className="p-3 space-y-0.5">
        <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#86869b]/60">
          Navigation
        </div>
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
                isActive
                  ? "bg-[#f5c518]/[0.08] text-[#f5c518]"
                  : "text-[#c8c8d4] hover:bg-[#1a1a24] hover:text-[#f5f5f7]"
              }`}
            >
              {/* Gold left border for active */}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[#f5c518]" />
              )}
              <span className="w-[18px] h-[18px] flex items-center justify-center text-sm flex-shrink-0">
                {item.icon}
              </span>
              <span className="font-medium">{item.label}</span>
              {item.href === "/" && agentCount !== null && (
                <span className="ml-auto text-[10px] font-mono text-[#86869b] bg-[#1a1a24] px-1.5 py-0.5 rounded">
                  {agentCount}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* User section */}
      <div className="p-3 border-t border-[#262632]">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-[#262632] flex items-center justify-center text-xs font-semibold text-[#86869b] flex-shrink-0">
            JR
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-[#f5f5f7] truncate">John Rice</div>
            <div className="text-[10px] text-[#86869b]">Owner</div>
          </div>
        </div>
      </div>
    </nav>
  );
}
