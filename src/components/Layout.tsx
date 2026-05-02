import { AnimatePresence } from "motion/react";
import { Outlet, useLocation } from "react-router-dom";
import { AmbientBackground } from "@/components/AmbientBackground";
import { Sidebar } from "@/components/Sidebar";
import { BottomNav } from "@/components/BottomNav";
import { PageTransition } from "@/components/PageTransition";

export function Layout() {
  const location = useLocation();

  return (
    <div className="relative min-h-screen">
      <AmbientBackground />
      <Sidebar />

      <main className="md:pl-64">
        <div className="mx-auto w-full max-w-5xl px-5 pt-6 pb-28 md:px-10 md:pt-10 md:pb-12">
          <AnimatePresence mode="wait">
            <PageTransition key={location.pathname}>
              <Outlet />
            </PageTransition>
          </AnimatePresence>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
