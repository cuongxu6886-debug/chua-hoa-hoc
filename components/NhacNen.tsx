"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const KEY = "chua-nhac-nen";
const SRC = "/nhac/nhac-nen.mp3";

/**
 * Nhạc nền lặp lại, âm lượng nhỏ. Trình duyệt chỉ cho phát sau lần chạm/bấm đầu tiên,
 * nên nhạc tự bắt đầu ở lần tương tác đầu nếu đang bật.
 */
export function useNhacNen(volume = 0.18) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const onRef = useRef(false);
  const [on, setOn] = useState(false);

  useEffect(() => {
    let pref = true;
    try {
      pref = localStorage.getItem(KEY) !== "tat";
    } catch {
      /* bỏ qua */
    }
    const audio = new Audio(SRC);
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = volume;
    audioRef.current = audio;
    onRef.current = pref;
    setOn(pref);

    const start = () => {
      if (onRef.current && audio.paused) void audio.play().catch(() => undefined);
      window.removeEventListener("pointerdown", start);
      window.removeEventListener("keydown", start);
    };
    if (pref) void audio.play().catch(() => undefined);
    window.addEventListener("pointerdown", start);
    window.addEventListener("keydown", start);
    return () => {
      window.removeEventListener("pointerdown", start);
      window.removeEventListener("keydown", start);
      audio.pause();
      audioRef.current = null;
    };
  }, [volume]);

  const toggle = useCallback(() => {
    const next = !onRef.current;
    onRef.current = next;
    setOn(next);
    try {
      localStorage.setItem(KEY, next ? "bat" : "tat");
    } catch {
      /* bỏ qua */
    }
    const audio = audioRef.current;
    if (audio) {
      if (next) void audio.play().catch(() => undefined);
      else audio.pause();
    }
  }, []);

  /** Hạ nhỏ nhạc khi đang đọc thông báo */
  const duck = useCallback(
    (ducked: boolean) => {
      const audio = audioRef.current;
      if (audio) audio.volume = ducked ? volume * 0.3 : volume;
    },
    [volume]
  );

  return { on, toggle, duck };
}

export function IconNhac({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18 V6 L19 4 V16" />
      <circle cx="6.5" cy="18" r="2.5" />
      <circle cx="16.5" cy="16" r="2.5" />
      {!on && <path d="M3 3 L21 21" />}
    </svg>
  );
}
