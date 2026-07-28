/**
 * Pure client-side entry used only by the static Capacitor build
 * (`npm run build:static`). The SSR/dev app keeps using TanStack Start.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider, createHashHistory } from "@tanstack/react-router";

import "./styles.css";
import { getRouter } from "./router";

// Hash history so the bundle works from file:// inside Capacitor.
const router = getRouter({ history: createHashHistory() });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
