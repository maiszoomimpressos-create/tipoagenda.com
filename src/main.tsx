import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster"; // Importar Toaster
import { Toaster as Sonner } from "@/components/ui/sonner"; // Importar Sonner
import React from "react"; // Importar React para usar React.StrictMode

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
    <Toaster />
    <Sonner />
  </React.StrictMode>
);