"use client";

import { useEffect, useState } from "react";

type BipEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/** Đăng kí service worker và hiện nút "Cài app" khi trình duyệt cho phép cài. */
export default function CaiApp({ className }: { className?: string }) {
  const [ev, setEv] = useState<BipEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [huongDan, setHuongDan] = useState(false);
  const [daCai, setDaCai] = useState(true);

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    setDaCai(standalone);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent) && !standalone);
    const onBip = (e: Event) => {
      e.preventDefault();
      setEv(e as BipEvent);
    };
    const onInstalled = () => {
      setEv(null);
      setDaCai(true);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (daCai || (!ev && !ios)) return null;

  return (
    <>
      <button
        type="button"
        className={className ?? "chip"}
        style={{ border: 0, cursor: "pointer", color: "inherit", fontWeight: 700 }}
        onClick={async () => {
          if (ev) {
            await ev.prompt();
            await ev.userChoice.catch(() => null);
            setEv(null);
          } else setHuongDan((v) => !v);
        }}
      >
        Cài app
      </button>
      {huongDan && (
        <div className="cai-app-hd" role="dialog" aria-label="Cách cài app trên iPhone">
          <p>
            Trên iPhone, iPad: bấm nút <b>Chia sẻ</b> (ô vuông có mũi tên lên) ở thanh dưới Safari, rồi chọn{" "}
            <b>Thêm vào MH chính</b>.
          </p>
          <button type="button" className="nut nut-nho nut-vang" onClick={() => setHuongDan(false)}>
            Đã hiểu
          </button>
        </div>
      )}
    </>
  );
}
