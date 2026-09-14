import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { isNativeApp } from "../lib/native";

export default function NativeLifecycle() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  useEffect(() => {
    if (!isNativeApp()) return;
    const listeners = [
      App.addListener("backButton", ({ canGoBack }) => {
        const dialog =
          document.querySelector<HTMLDialogElement>("dialog[open]");
        if (dialog) {
          if (
            dialog.dispatchEvent(
              new Event("cancel", { bubbles: true, cancelable: true }),
            )
          )
            dialog.close();
          return;
        }
        const close = document.querySelector<HTMLButtonElement>(
          '[role="dialog"] .close-modal:not(:disabled), .mobile-editor-nav button[aria-expanded="true"]',
        );
        if (close) {
          close.click();
          return;
        }
        if (canGoBack) navigate(-1);
        else if (pathname !== "/") navigate("/");
        else void App.exitApp();
      }),
      App.addListener("appUrlOpen", ({ url }) => {
        if (url === "stickerstudio://auth/complete") {
          void Browser.close().catch(() => {});
          window.dispatchEvent(new Event("focus"));
        }
      }),
    ];
    return () => {
      listeners.forEach((listener) => {
        void listener.then((handle) => handle.remove());
      });
    };
  }, [navigate, pathname]);
  return null;
}
