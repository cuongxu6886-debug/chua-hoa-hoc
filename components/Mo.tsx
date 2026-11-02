"use client";

import { useEffect, useState } from "react";
import { goMo } from "@/lib/sound";

/**
 * Mõ gỗ. Tăng `strike` (số lần gõ) để mõ tự gõ; `label` hiện chữ bay lên (vd "+3 công đức").
 * Bấm vào mõ cũng gõ được cho vui, không cộng điểm.
 */
export default function Mo({
  strike = 0,
  label,
  size = 120,
  interactive = true,
}: {
  strike?: number;
  label?: string | null;
  size?: number;
  interactive?: boolean;
}) {
  const [hit, setHit] = useState(0);
  const [floats, setFloats] = useState<{ id: number; text: string }[]>([]);

  useEffect(() => {
    if (strike <= 0) return;
    setHit((h) => h + 1);
    goMo();
    if (label) {
      const id = Date.now();
      setFloats((f) => [...f, { id, text: label }]);
      const t = setTimeout(() => setFloats((f) => f.filter((x) => x.id !== id)), 1600);
      return () => clearTimeout(t);
    }
  }, [strike, label]);

  const tap = () => {
    if (!interactive) return;
    setHit((h) => h + 1);
    goMo(0.5);
  };

  return (
    <div className="mo" style={{ width: size }}>
      {floats.map((f) => (
        <span key={f.id} className="mo-float" aria-live="polite">
          {f.text}
        </span>
      ))}
      <button
        type="button"
        className="mo-button"
        onClick={tap}
        aria-label="Gõ mõ"
        disabled={!interactive}
      >
        <svg viewBox="0 0 200 160" key={hit} className={hit ? "mo-svg mo-hit" : "mo-svg"} aria-hidden="true">
          <ellipse cx="100" cy="142" rx="78" ry="13" fill="#8E271C" />
          <ellipse cx="100" cy="138" rx="70" ry="9" fill="#B33A2A" />
          <g className="mo-body">
            <path
              d="M28 96 C26 48 84 22 128 30 C174 40 188 88 162 116 C132 142 46 142 28 96 Z"
              fill="#8A4A22"
              stroke="#4A230E"
              strokeWidth="3"
            />
            <path d="M48 70 C64 46 100 36 128 40" stroke="#B26A38" strokeWidth="6" strokeLinecap="round" fill="none" opacity="0.7" />
            <path d="M62 100 C92 116 136 112 162 94" stroke="#3A1B0B" strokeWidth="7" strokeLinecap="round" fill="none" />
          </g>
          <g className="mo-dui">
            <path d="M192 4 L154 26" stroke="#5B2E12" strokeWidth="7" strokeLinecap="round" />
            <circle cx="146" cy="28" r="12" fill="#6E3816" stroke="#3A1B0B" strokeWidth="2" />
          </g>
        </svg>
      </button>
    </div>
  );
}
