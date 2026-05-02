import { useSearchParams } from "react-router-dom";

export type TabKey = "summary" | "flashcards" | "handson" | "lecture";

export function useActiveTab(
  defaultTab: TabKey = "summary",
): [TabKey, (next: TabKey) => void] {
  const [params, setParams] = useSearchParams();
  const param = params.get("tab");
  const active = isTabKey(param) ? param : defaultTab;
  const setActive = (next: TabKey) => {
    const nextParams = new URLSearchParams(params);
    nextParams.set("tab", next);
    setParams(nextParams, { replace: true });
  };
  return [active, setActive];
}

function isTabKey(s: string | null): s is TabKey {
  return s === "summary" || s === "flashcards" || s === "handson" || s === "lecture";
}
