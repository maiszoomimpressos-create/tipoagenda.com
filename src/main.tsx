import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";

// Adicionado para depuração inicial da URL
console.log('main.tsx - window.location.href:', window.location.href);
console.log('main.tsx - window.location.hash:', window.location.hash);

createRoot(document.getElementById("root")!).render(<App />);