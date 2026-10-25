import type { MoviElement } from "movi-player/element";

export const MOVI_ASSETS = "/vendor/movi-player/0.4.1";
let pending: Promise<void> | undefined;

/** A same-origin module keeps the player and WASM available in standalone Docker builds. */
export function loadMovi(): Promise<void> {
  if (customElements.get("movi-player")) return Promise.resolve();
  if (!pending) {
    pending = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.type = "module";
      script.src = `${MOVI_ASSETS}/element.js`;
      const timer = window.setTimeout(() => fail(), 30000);
      const fail = () => {
        window.clearTimeout(timer);
        script.remove();
        pending = undefined;
        reject(new Error("The video player could not load. Please retry."));
      };
      script.onerror = fail;
      script.onload = () => {
        if (!customElements.get("movi-player")) { fail(); return; }
        window.clearTimeout(timer);
        resolve();
      };
      document.head.appendChild(script);
    });
  }
  return pending;
}

export function createMovi(): MoviElement {
  return document.createElement("movi-player");
}
