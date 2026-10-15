"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Users, 
  Tags, 
  Package, 
  LayoutList, 
  LogOut, 
  Store,
  ShoppingCart,
  MessageSquare,
  Ticket
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "next-auth/react";

const navigation = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Products", href: "/admin/products", icon: Package },
  { name: "Categories", href: "/admin/categories", icon: LayoutList },
  { name: "Brands", href: "/admin/brands", icon: Tags },
  { name: "Orders", href: "/admin/orders", icon: ShoppingCart },
  { name: "Customers", href: "/admin/users", icon: Users },
  { name: "Contact Messages", href: "/admin/messages", icon: MessageSquare, disabled: true },
  { name: "Referral Codes", href: "/admin/referrals", icon: Ticket, disabled: true },
];

export function Sidebar({ isMobile, role = "ADMIN" }: { isMobile?: boolean; role?: string }) {
  const pathname = usePathname();

  const filteredNavigation = navigation.filter(item => {
    if (item.name === "Customers" && role !== "ADMIN") return false;
    return true;
  });

  return (
    <div className={cn("flex h-full flex-col bg-zinc-950 text-zinc-400", isMobile ? "w-full" : "w-64")}>
      <div className="flex h-16 items-center px-6">
        <Link href="/admin" className="text-xl font-medium tracking-tight text-white flex items-center gap-2">
          Backcountrylight <span className="text-sm font-normal text-zinc-400">Retail</span>
        </Link>
      </div>
      
      <div className="flex-1 overflow-y-auto py-6">
        <nav className="space-y-1">
          {filteredNavigation.map((item) => {
            // Dashboard is only active on exact match, others on prefix match
            const isActive = item.href === "/admin" 
              ? pathname === "/admin" 
              : pathname.startsWith(item.href);
            
            return item.disabled ? (
              <div
                key={item.name}
                className="group flex items-center px-6 py-2.5 text-sm font-medium text-zinc-600/50 cursor-not-allowed select-none"
                title="Fitur ini belum tersedia"
              >
                <item.icon
                  className="mr-3 flex-shrink-0 h-5 w-5 text-zinc-700/50"
                  aria-hidden="true"
                />
                {item.name}
              </div>
            ) : (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  isActive
                    ? "bg-zinc-900 text-white relative"
                    : "text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200",
                  "group flex items-center px-6 py-2.5 text-sm font-medium transition-colors"
                )}
              >
                <item.icon
                  className={cn(
                    isActive ? "text-white" : "text-zinc-500 group-hover:text-zinc-300",
                    "mr-3 flex-shrink-0 h-5 w-5"
                  )}
                  aria-hidden="true"
                />
                {item.name}
                {isActive && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-orange-500" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-4 space-y-1 mb-2">
        <Link
          href="/"
          className="group flex w-full items-center px-2 py-2 text-sm font-medium text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200 transition-colors rounded-md"
        >
          <Store className="mr-3 h-5 w-5 flex-shrink-0 text-zinc-500 group-hover:text-zinc-300" />
          Back to Store
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          className="group flex w-full items-center px-2 py-2 text-sm font-medium text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200 transition-colors rounded-md"
        >
          <LogOut className="mr-3 h-5 w-5 flex-shrink-0 text-zinc-500 group-hover:text-zinc-300" />
          Logout
        </button>
      </div>
    </div>
  );
}
