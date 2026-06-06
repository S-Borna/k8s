import { AnimatePresence } from "motion/react";
import { Outlet, useLocation } from "react-router-dom";
import { AmbientBackground } from "@/components/AmbientBackground";
import { Sidebar } from "@/components/Sidebar";
import { BottomNav } from "@/components/BottomNav";
import { PageTransition } from "@/components/PageTransition";
import { Toaster } from "@/components/Toaster";
import { ScrollToTop } from "@/components/ScrollToTop";
import { ShareLinkLoader } from "@/components/ShareLinkLoader";
import { MusicPlayer } from "@/components/MusicPlayer";
import { ToastProvider, useToastsState } from "@/hooks/useToasts";

export function Layout() {
  const location = useLocation();
  const toasts = useToastsState();

  return (
    <ToastProvider value={toasts}>
      <ScrollToTop />
      <ShareLinkLoader />
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
        <MusicPlayer />
        <Toaster />
      </div>
    </ToastProvider>
  );
}
