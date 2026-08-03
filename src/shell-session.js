const SUPPORTED_LANGUAGES = new Set(["de", "en"]);
let pendingShell;
let shellPlaceholder;

if (typeof document !== "undefined") {
  pendingShell = document.querySelector("milos-app-shell");
  if (pendingShell) {
    shellPlaceholder = document.createComment("session-only-shell");
    pendingShell.replaceWith(shellPlaceholder);
  }
}

export function languageFromUrl(value = globalThis.location?.href) {
  if (!value) return "de";
  const language = new URL(value).searchParams.get("lang");
  return SUPPORTED_LANGUAGES.has(language) ? language : "de";
}

export function updateLanguageUrl(language, environment = globalThis) {
  const selected = language === "en" ? "en" : "de";
  const url = new URL(environment.location.href);
  if (selected === "en") url.searchParams.set("lang", "en");
  else url.searchParams.delete("lang");
  environment.history.replaceState(
    environment.history.state,
    "",
    `${url.pathname}${url.search}${url.hash}`
  );
  return selected;
}

export function mountSessionOnlyShell(environment = globalThis) {
  const shell = pendingShell;
  const ShellElement = environment.customElements.get("milos-app-shell");
  if (!shell || !ShellElement) throw new Error("The vendored app shell is not registered");

  environment.customElements.upgrade(shell);

  const applyShellLocale = ShellElement.prototype.applyLocale;
  Object.defineProperties(shell, {
    readLocale: {
      configurable: true,
      value: () => languageFromUrl(environment.location.href)
    },
    applyLocale: {
      configurable: true,
      value(language) {
        const selected = updateLanguageUrl(language, environment);
        return applyShellLocale.call(this, selected, false);
      }
    }
  });

  shellPlaceholder.replaceWith(shell);
  pendingShell = undefined;
  shellPlaceholder = undefined;
  return shell;
}
