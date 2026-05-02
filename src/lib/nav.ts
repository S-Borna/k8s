import { BookOpen, GraduationCap, Layers, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  to: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
};

export const navItems: NavItem[] = [
  { to: "/", label: "Översikt", shortLabel: "Hem", icon: Layers },
  { to: "/flashcards", label: "Flashcards", shortLabel: "Kort", icon: BookOpen },
  { to: "/mock-tenta", label: "Tenta", shortLabel: "Tenta", icon: GraduationCap },
  { to: "/installningar", label: "Inställningar", shortLabel: "Mer", icon: Settings },
];
