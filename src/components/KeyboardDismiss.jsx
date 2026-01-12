import { useEffect } from "react";

export default function KeyboardDismiss() {
  useEffect(() => {
    const onPointerDown = (e) => {
      const target = e.target;
      const active = document.activeElement;

      // If you tapped inside an input/textarea/select, do nothing
      if (target instanceof HTMLElement) {
        if (target.closest("input, textarea, select")) return;
      }

      // Blur current field to dismiss keyboard
      if (active instanceof HTMLElement) {
        if (active.matches("input, textarea, select")) active.blur();
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  return null;
}
