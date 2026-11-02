"use client";

import { useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

export default function HoiTo() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const q = text.trim();
    if (!q || busy) return;
    const next: Msg[] = [...msgs, { role: "user", content: q }];
    setMsgs(next);
    setText("");
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/hoi-to", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.slice(-8) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ông Tổ chưa trả lời được, con thử lại sau.");
      setMsgs([...next, { role: "assistant", content: data.reply }]);
      setRemaining(data.remaining);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ông Tổ chưa trả lời được, con thử lại sau.");
      setMsgs(msgs);
      setText(q);
    } finally {
      setBusy(false);
      setTimeout(() => logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" }), 50);
    }
  }

  return (
    <section className="hoi-to" aria-labelledby="hoi-to-tieu-de">
      <h3 id="hoi-to-tieu-de">Hỏi Ông Tổ</h3>
      <p className="muted small">
        Hỏi bài Hóa, Tổ gợi ý từng bước chứ không giải hộ ngay.
        {remaining !== null ? ` Hôm nay con còn ${remaining} lượt hỏi.` : ""}
      </p>
      {msgs.length > 0 && (
        <div className="hoi-to-log" ref={logRef} aria-live="polite">
          {msgs.map((m, i) => (
            <div key={i} className={`loi ${m.role === "user" ? "loi-con" : "loi-to-ai"}`}>
              {m.content}
            </div>
          ))}
          {busy && <div className="loi loi-to-ai muted">Tổ đang vuốt râu suy nghĩ…</div>}
        </div>
      )}
      {error && (
        <p className="thong-bao" role="alert">
          {error}
        </p>
      )}
      <form onSubmit={send}>
        <label htmlFor="hoi-to-input" className="sr-only">
          Câu hỏi cho Ông Tổ
        </label>
        <input
          id="hoi-to-input"
          className="input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ví dụ: vì sao Fe³⁺ oxi hóa được Cu?"
          maxLength={800}
        />
        <button type="submit" className="nut nut-vang" disabled={busy || !text.trim()}>
          Hỏi
        </button>
      </form>
    </section>
  );
}
