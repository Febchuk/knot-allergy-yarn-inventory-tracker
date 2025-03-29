"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Package } from "lucide-react";

export function MainNav() {
  const pathname = usePathname();

  const routes = [
    {
      href: "/dashboard",
      label: "Overview",
      active: pathname === "/dashboard",
    },
    {
      href: "/dashboard/yarns",
      label: "Yarn Inventory",
      active: pathname === "/dashboard/yarns",
    },
    {
      href: "/dashboard/projects",
      label: "Projects",
      active: pathname === "/dashboard/projects",
    },
  ];

  return (
    <div className="flex gap-6 md:gap-10">
      <Link href="/dashboard" className="flex items-center space-x-2">
        <Package className="h-6 w-6" />
        <span className="inline-block font-bold">Knot Allergy</span>
      </Link>
      <nav className="flex gap-6">
        {routes.map((route) => (
          <Link
            key={route.href}
            href={route.href}
            className={cn(
              "flex items-center text-sm font-medium transition-colors hover:text-primary",
              route.active ? "text-foreground" : "text-foreground/60"
            )}
          >
            {route.label}
          </Link>
        ))}
      </nav>
    </div>
  );
} 