import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAppState } from "@/hooks/useAppState";
import { useToasts } from "@/hooks/useToasts";
import { decodeStateFromUrl } from "@/lib/share";

export function ShareLinkLoader() {
  const { setState } = useAppState();
  const { push } = useToasts();
  const navigate = useNavigate();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    if (!window.location.hash.startsWith("#state=")) return;
    handled.current = true;

    const incoming = decodeStateFromUrl(window.location.hash);
    if (!incoming) {
      push({
        message: "Kunde inte läsa länken",
        detail: "Den såg inte ut som en giltig sync-länk",
      });
      navigate("/", { replace: true });
      return;
    }

    setState(incoming);
    push({
      message: "Synkat från länk",
      detail: "Progressen från andra enheten är nu aktiv här",
    });
    navigate("/", { replace: true });
  }, [navigate, push, setState]);

  return null;
}
