"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Scissors,
  Package,
  FolderKanban,
  Tags,
  Settings,
  BarChart,
} from "lucide-react";

const items = [
  {
    title: "Yarn Inventory",
    href: "/yarn",
    icon: Package,
  },
  {
    title: "Projects",
    href: "/projects",
    icon: FolderKanban,
  },
  {
    title: "Patterns",
    href: "/patterns",
    icon: Scissors,
  },
  {
    title: "Tags",
    href: "/tags",
    icon: Tags,
  },
  {
    title: "Statistics",
    href: "/statistics",
    icon: BarChart,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="grid items-start gap-2 w-64 border-r bg-background p-4">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
              pathname === item.href
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {item.title}
          </Link>
        );
      })}
    </nav>
  );
} 