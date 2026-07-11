import React from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from "@vercel/analytics/react"
import App from './App.tsx'
import './index.css'

// Service worker registration lives in App.tsx's AppContent effect, which is
// production-gated and cleans up stale registrations in dev — registering it
// again here unconditionally is what caused it to run in every dev session.

createRoot(document.getElementById("root")!).render(
  <>
    <App />
    <Analytics />
  </>
);