import { initMilosAppEssentials } from "./milos-app-essentials.js";

document.body?.setAttribute("data-milos-essentials-app", "waste-guide");
export const milosAppEssentials = initMilosAppEssentials({
  "appKey": "waste-guide",
  "environment": "dev",
  "productionApproved": false,
  "loading": {
    "appName": "Welcher Müll?",
    "iconPath": "assets/icon.svg",
    "iconRuntimePath": "./assets/icon.svg",
    "message": {
      "de": "Entsorgungshinweise werden vorbereitet …",
      "en": "Preparing disposal guidance …"
    }
  },
  "privacy": {
    "mode": "no-cookies",
    "usesLocalStorage": false,
    "optionalTracking": false,
    "privacyUrl": "https://dev.milos-apps.de/datenschutz",
    "storagePurposes": []
  },
  "features": {
    "startup": true,
    "privacyNotice": false,
    "share": true,
    "datePicker": false,
    "placeSearch": false,
    "placeSuggestions": {
      "enabled": false,
      "minChars": 3,
      "debounceMs": 350,
      "providerCapability": "submit-only",
      "evidenceFile": null
    }
  }
});
globalThis.milosAppEssentials = milosAppEssentials;
