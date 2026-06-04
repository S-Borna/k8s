import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Dashboard from "@/pages/Dashboard";
import Chapter from "@/pages/Chapter";
import Flashcards from "@/pages/Flashcards";
import MockExam from "@/pages/MockExam";
import Cheatsheet from "@/pages/Cheatsheet";
import Settings from "@/pages/Settings";

const Gallery = lazy(() => import("@/playground/Gallery"));
const ScrollNarrative = lazy(() => import("@/playground/templates/ScrollNarrative"));
const Dissolve = lazy(() => import("@/playground/templates/Dissolve"));
const Hologram = lazy(() => import("@/playground/templates/Hologram"));
const Magnetic = lazy(() => import("@/playground/templates/Magnetic"));
const AudioReactive = lazy(() => import("@/playground/templates/AudioReactive"));

const Loading = () => (
  <div className="grid min-h-screen place-items-center text-text-muted">Laddar…</div>
);

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route
            path="/playground"
            element={
              <Suspense fallback={<Loading />}>
                <Gallery />
              </Suspense>
            }
          />
          <Route
            path="/playground/scroll-narrative"
            element={
              <Suspense fallback={<Loading />}>
                <ScrollNarrative />
              </Suspense>
            }
          />
          <Route
            path="/playground/dissolve"
            element={
              <Suspense fallback={<Loading />}>
                <Dissolve />
              </Suspense>
            }
          />
          <Route
            path="/playground/hologram"
            element={
              <Suspense fallback={<Loading />}>
                <Hologram />
              </Suspense>
            }
          />
          <Route
            path="/playground/magnetic"
            element={
              <Suspense fallback={<Loading />}>
                <Magnetic />
              </Suspense>
            }
          />
          <Route
            path="/playground/audio-reactive"
            element={
              <Suspense fallback={<Loading />}>
                <AudioReactive />
              </Suspense>
            }
          />
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="kapitel/:n" element={<Chapter />} />
            <Route path="flashcards" element={<Flashcards />} />
            <Route path="mock-tenta" element={<MockExam />} />
            <Route path="cheatsheet" element={<Cheatsheet />} />
            <Route path="installningar" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
