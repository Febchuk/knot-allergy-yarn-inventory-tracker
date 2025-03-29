"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Package, Home, Box, GitFork } from "lucide-react"
import { Button } from "@/components/ui/button"
import { NavUser } from "@/components/nav-user"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

interface AppSidebarProps {
  user: {
    name?: string | null
    email?: string | null
    image?: string | null
  }
}

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname()

  const routes = [
    {
      href: "/dashboard",
      label: "Overview",
      icon: Home,
      active: pathname === "/dashboard",
    },
    {
      href: "/dashboard/yarns",
      label: "Yarn Inventory",
      icon: Box,
      active: pathname === "/dashboard/yarns",
    },
    {
      href: "/dashboard/projects",
      label: "Projects",
      icon: GitFork,
      active: pathname === "/dashboard/projects",
    },
  ]

  const SidebarContent = () => (
    <div className="flex h-full flex-col gap-4 py-4">
      <div className="flex h-[60px] items-center px-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Package className="h-6 w-6" />
          <span className="font-bold">Knot Allergy</span>
        </Link>
      </div>
      <div className="flex-1 px-3">
        <div className="space-y-1">
          {routes.map((route) => (
            <Button
              key={route.href}
              variant={route.active ? "secondary" : "ghost"}
              className="w-full justify-start"
              asChild
            >
              <Link href={route.href}>
                <route.icon className="mr-2 h-4 w-4" />
                {route.label}
              </Link>
            </Button>
          ))}
        </div>
      </div>
      <div className="px-3">
        <NavUser user={user} />
      </div>
    </div>
  )

  return (
    <>
      <div className="hidden md:flex md:flex-col md:h-full">
        <SidebarContent />
      </div>
      <div className="md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" className="h-10 w-10 p-0">
              <Package className="h-6 w-6" />
              <span className="sr-only">Toggle Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0">
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}
