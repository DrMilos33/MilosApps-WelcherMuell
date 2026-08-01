import { registerMilosAppShell } from "./milos-app-shell.js";

registerMilosAppShell({
  "appKey": "waste-guide",
  "environment": "dev",
  "productionApproved": false,
  "description": {
    "de": "Quellenbasierte Entsorgungshinweise mit sichtbarer regionaler Unsicherheit.",
    "en": "Source-based disposal guidance with clear regional uncertainty."
  },
  "theme": {
    "accent": "#d9ff56",
    "accentContrast": "#10211d",
    "surface": "#f6f2e8",
    "text": "#12231f",
    "muted": "#53655f",
    "border": "#b8c8c1",
    "focus": "#b44300"
  }
});
