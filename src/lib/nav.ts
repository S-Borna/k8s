import { BookOpen, FileCode, GraduationCap, Layers, Network, Settings, Terminal, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  to: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
};

export const navItems: NavItem[] = [
  { to: "/", label: "Översikt", shortLabel: "Hem", icon: Layers },
  { to: "/plugga", label: "Plugga nu", shortLabel: "Plugga", icon: Zap },
  { to: "/flashcards", label: "Flashcards", shortLabel: "Kort", icon: BookOpen },
  { to: "/mock-tenta", label: "Tenta", shortLabel: "Tenta", icon: GraduationCap },
  { to: "/cheatsheet", label: "Cheatsheet", shortLabel: "CLI", icon: Terminal },
  { to: "/yaml", label: "YAML", shortLabel: "YAML", icon: FileCode },
  { to: "/arkitektur", label: "Arkitektur", shortLabel: "Karta", icon: Network },
  { to: "/installningar", label: "Inställningar", shortLabel: "Mer", icon: Settings },
];
