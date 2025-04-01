import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Box, GitFork, Package } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="px-4 lg:px-6 h-14 flex items-center">
        <Link className="flex items-center justify-center" href="/">
          <Package className="h-6 w-6 text-primary" />
          <span className="ml-2 text-lg font-semibold">Knot Allergy</span>
        </Link>
        <nav className="ml-auto flex gap-4">
          <Link href="/auth/signin">
            <Button variant="ghost">Sign In</Button>
          </Link>
        </nav>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                  Manage Your Yarn Collection with Ease
                </h1>
                <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
                  Keep track of your yarn inventory, manage projects, and never run out of your favorite yarns again.
                </p>
              </div>
              <Link href="/auth/signin">
                <Button size="lg" className="mt-4">
                  Get Started <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gray-100 dark:bg-gray-800">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-3 items-center">
              <div className="flex flex-col justify-center items-center text-center space-y-4">
                <Box className="h-12 w-12 text-primary" />
                <h3 className="text-xl font-bold">Inventory Management</h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Track your yarn stash with detailed information about brand, product line, materials, weight, and yardage.
                </p>
              </div>
              <div className="flex flex-col justify-center items-center text-center space-y-4">
                <GitFork className="h-12 w-12 text-primary" />
                <h3 className="text-xl font-bold">Project Tracking</h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Manage your knitting and crochet projects and their yarn requirements.
                </p>
              </div>
              <div className="flex flex-col justify-center items-center text-center space-y-4">
                <Package className="h-12 w-12 text-primary" />
                <h3 className="text-xl font-bold">Yarn Usage</h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Monitor yarn usage across projects and maintain optimal stock levels.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          © 2024 Knot Allergy. All rights reserved.
        </p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link className="text-xs hover:underline underline-offset-4" href="#">
            Terms of Service
          </Link>
          <Link className="text-xs hover:underline underline-offset-4" href="#">
            Privacy
          </Link>
        </nav>
      </footer>
    </div>
  );
}
