import { createRoot } from "react-dom/client";
import { CacheApp } from "./CacheApp";

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("cache: #root not found");
createRoot(rootEl).render(<CacheApp />);
