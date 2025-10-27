import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Inject Node.js Buffer globally for browser compatibility
import { Buffer } from 'buffer';
(window as any).Buffer = Buffer;
(window as any).global = window;

createRoot(document.getElementById("root")!).render(<App />);
