"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Users,
  FileText,
  User,
  MapPin,
  List,
  Receipt,
} from "lucide-react";

const nav = [
  { href: "/dashboard",       label: "Dashboard",          icon: LayoutDashboard },
  { href: "/items",           label: "Cikkek",             icon: Package },
  { href: "/partners",        label: "Business Partnerek", icon: Users },
  { href: "/documents/order", label: "Rendelések",         icon: FileText },
  { href: "/documents/invoice", label: "Számlák",          icon: Receipt },
  { href: "/documents/delivery", label: "Szállítólevelek", icon: Receipt },
  { href: "/contacts",        label: "Kapcsolattartók",    icon: User },
  { href: "/entities",        label: "Törzsadatok",        icon: List },
  { href: "/phone-search",    label: "Telefonkeresés",     icon: MapPin },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 w-60 bg-blue-900 text-white flex flex-col shadow-xl z-10">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-blue-800">
        <div className="w-8 h-8 rounded-lg bg-blue-400 flex items-center justify-center font-bold text-blue-900">
          N
        </div>
        <div>
          <div className="text-sm font-semibold leading-tight">Nordtek SAP</div>
          <div className="text-xs text-blue-300">Interface v2</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {nav.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-blue-700 text-white"
                  : "text-blue-200 hover:bg-blue-800 hover:text-white"
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* MCP info */}
      <div className="px-4 py-3 border-t border-blue-800">
        <div className="text-xs text-blue-400">MCP endpoint</div>
        <div className="text-xs text-blue-300 font-mono break-all">
          {process.env.NEXT_PUBLIC_APP_URL || ""}/api/mcp
        </div>
      </div>
    </aside>
  );
}
