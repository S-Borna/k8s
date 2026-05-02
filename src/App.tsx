import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Chapter from "@/pages/Chapter";
import Flashcards from "@/pages/Flashcards";
import MockExam from "@/pages/MockExam";
import Settings from "@/pages/Settings";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="kapitel/:n" element={<Chapter />} />
          <Route path="flashcards" element={<Flashcards />} />
          <Route path="mock-tenta" element={<MockExam />} />
          <Route path="installningar" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
