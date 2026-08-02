import { initMilosAppEssentials } from "./milos-app-essentials.js";

document.body?.setAttribute("data-milos-essentials-app", "waste-guide");
export const milosAppEssentials = initMilosAppEssentials({
  "appKey": "waste-guide",
  "environment": "dev",
  "productionApproved": false,
  "loading": {
    "appName": "Welcher Müll?",
    "iconPath": "assets/icon.svg",
    "message": {
      "de": "Entsorgungshinweise werden vorbereitet …",
      "en": "Preparing disposal guidance …"
    }
  },
  "privacy": {
    "mode": "no-cookies",
    "usesLocalStorage": true,
    "optionalTracking": false,
    "privacyUrl": "https://dev.milos-apps.de/datenschutz"
  },
  "features": {
    "startup": true,
    "privacyNotice": true,
    "share": true,
    "datePicker": false,
    "placeSearch": false
  }
});
globalThis.milosAppEssentials = milosAppEssentials;
