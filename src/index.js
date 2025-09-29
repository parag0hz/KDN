// src/index.js
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// ---------- DEV 전용 잡음 억제 ----------
if (process.env.NODE_ENV !== "production") {
  const roRegex = /ResizeObserver loop (limit exceeded|completed with undelivered notifications)/i;

  // 1) 전역 error 차단 (CRA 오버레이로 전파 방지)
  window.addEventListener(
    "error",
    (e) => {
      const msg = e?.message || e?.error?.message || "";
      if (roRegex.test(msg)) {
        e.stopImmediatePropagation();
        e.preventDefault();
      }
    },
    true
  );

  // 2) 전역 unhandledrejection 차단
  window.addEventListener(
    "unhandledrejection",
    (e) => {
      const msg = e?.reason?.message || "";
      if (roRegex.test(msg)) {
        e.stopImmediatePropagation();
        e.preventDefault();
      }
    },
    true
  );

  // 3) 콘솔 에러 억제(오버레이가 console.error도 후킹함)
  const origError = console.error.bind(console);
  console.error = (...args) => {
    const first = args?.[0];
    const msg =
      typeof first === "string" ? first : first?.message || first?.stack || "";
    if (roRegex.test(msg)) return;
    origError(...args);
  };

  // 4) ResizeObserver 자체를 래핑해 콜백 내부 루프 에러 무시
  if (window.ResizeObserver) {
    const NativeRO = window.ResizeObserver;
    window.ResizeObserver = class extends NativeRO {
      constructor(callback) {
        super((entries, observer) => {
          try {
            callback(entries, observer);
          } catch (err) {
            if (err && roRegex.test(err.message || "")) {
              // 무시
              return;
            }
            throw err;
          }
        });
      }
    };
  }
}
// ----------------------------------------

const root = createRoot(document.getElementById("root"));
// StrictMode는 필요 시 다시 켜도 됩니다. (GS3D 중복 dispose 이슈가 있으면 끄세요)
root.render(<App />);
