import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Use both for iOS + general reliability
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });

    // If you have a scroll container instead of window, we can adjust later
  }, [pathname]);

  return null;
}
