import { createRoot } from "react-dom/client";
import { Buffer } from "buffer";
import process from "process";
import App from "./App.tsx";
import "./index.css";

if (typeof globalThis.Buffer === "undefined") {
  (globalThis as any).Buffer = Buffer;
}

if (typeof globalThis.process === "undefined") {
  (globalThis as any).process = process;
}

createRoot(document.getElementById("root")!).render(<App />);
