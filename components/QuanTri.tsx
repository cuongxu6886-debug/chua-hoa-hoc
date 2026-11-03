"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LETTERS, TIER_NAMES, errorText } from "@/lib/game";
import type { AdminQuestion, Letter, Topic } from "@/lib/types";

type Tab = "cau-hoi" | "hoc-sinh" | "huong" | "cau-hinh";

export default function QuanTri() {
  const [tab, setTab] = useState<Tab>("cau-hoi");
  return (
    <main className="page page-rong stack">
      <div className="row">
        <h1 style={{ margin: 0 }}>Quản trị</h1>
        <span className="spacer" />
        <Link href="/man-hinh-live" className="nut nut-phu nut-nho">
          Mở Màn hình live
        </Link>
        <Link href="/man-hinh-live/khach" className="nut nut-vang nut-nho">
          Mở Chùa live (khách TikTok)
        </Link>
      </div>
      <div className="tabs" role="group" aria-label="Mục quản trị">
        {(
          [
            ["cau-hoi", "Câu hỏi"],
            ["hoc-sinh", "Học sinh"],
            ["huong", "Hương TikTok"],
            ["cau-hinh", "Cấu hình"],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button key={id} type="button" aria-pressed={tab === id} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      {tab === "cau-hoi" && <CauHoi />}
      {tab === "hoc-sinh" && <HocSinh />}
      {tab === "huong" && <Huong />}
      {tab === "cau-hinh" && <CauHinh />}
    </main>
  );
}

/* ======================= Câu hỏi ======================= */

type Draft = {
  id?: number;
  topic_id: string;
  level: number;
  content: string;
  options: string[];
  answer: Letter;
  explanation: string;
  is_published: boolean;
};

const emptyDraft = (topic_id = ""): Draft => ({
  topic_id,
  level: 1,
  content: "",
  options: ["", "", "", ""],
  answer: "A",
  explanation: "",
  is_published: true,
});

function CauHoi() {
  const supabase = useMemo(() => createClient(), []);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [qs, setQs] = useState<AdminQuestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [filter, setFilter] = useState({ grade: "", topic: "", level: "", q: "" });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [importing, setImporting] = useState(false);

  const load = useCallback(async () => {
    const [t, q] = await Promise.all([
      supabase.from("topics").select("id, name, grade").order("sort_order"),
      supabase
        .from("questions")
        .select("id, topic_id, level, content, options, answer, explanation, is_published, updated_at")
        .order("id", { ascending: false })
        .range(0, 4999),
    ]);
    if (t.error || q.error) setError(errorText(t.error ?? q.error));
    setTopics((t.data as Topic[]) ?? []);
    setQs((q.data as AdminQuestion[]) ?? []);
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  const topicName = useMemo(() => Object.fromEntries(topics.map((t) => [t.id, t])), [topics]);

  const shown = (qs ?? []).filter((q) => {
    const t = topicName[q.topic_id];
    if (filter.grade && String(t?.grade) !== filter.grade) return false;
    if (filter.topic && q.topic_id !== filter.topic) return false;
    if (filter.level && String(q.level) !== filter.level) return false;
    if (filter.q && !q.content.toLowerCase().includes(filter.q.toLowerCase())) return false;
    return true;
  });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    setError(null);
    const row = {
      topic_id: draft.topic_id,
      level: draft.level,
      content: draft.content.trim(),
      options: draft.options.map((o) => o.trim()),
      answer: draft.answer,
      explanation: draft.explanation.trim() || null,
      is_published: draft.is_published,
      updated_at: new Date().toISOString(),
    };
    if (row.options.some((o) => !o)) return setError("Cần điền đủ 4 phương án.");
    const res = draft.id
      ? await supabase.from("questions").update(row).eq("id", draft.id)
      : await supabase.from("questions").insert(row);
    if (res.error) return setError(errorText(res.error));
    setNotice(draft.id ? `Đã lưu câu #${draft.id}.` : "Đã thêm câu hỏi mới.");
    setDraft(null);
    void load();
  }

  async function remove(q: AdminQuestion) {
    if (!window.confirm(`Xóa câu #${q.id}? Lịch sử trả lời câu này của học sinh cũng bị xóa.`)) return;
    const { error } = await supabase.from("questions").delete().eq("id", q.id);
    if (error) return setError(errorText(error));
    setNotice(`Đã xóa câu #${q.id}.`);
    void load();
  }

  async function togglePublish(q: AdminQuestion) {
    const { error } = await supabase.from("questions").update({ is_published: !q.is_published }).eq("id", q.id);
    if (error) return setError(errorText(error));
    void load();
  }

  function exportJson() {
    const data = (qs ?? []).map((q) => ({
      topic: q.topic_id,
      level: q.level,
      content: q.content,
      options: q.options,
      answer: q.answer,
      explanation: q.explanation,
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `cau-hoi-chua-hoa-hoc-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <section className="stack">
      {error && (
        <p className="thong-bao" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="thong-bao thong-bao-tot" role="status">
          {notice}
        </p>
      )}

      {draft ? (
        <DraftForm draft={draft} setDraft={setDraft} topics={topics} onSubmit={save} onCancel={() => setDraft(null)} />
      ) : importing ? (
        <ImportJson
          topics={topics}
          onDone={(n) => {
            setImporting(false);
            setNotice(`Đã nhập ${n} câu hỏi.`);
            void load();
          }}
          onCancel={() => setImporting(false)}
        />
      ) : (
        <div className="row">
          <button type="button" className="nut" onClick={() => setDraft(emptyDraft(topics[0]?.id))}>
            Thêm câu hỏi
          </button>
          <button type="button" className="nut nut-phu" onClick={() => setImporting(true)}>
            Nhập từ JSON
          </button>
          <button type="button" className="nut nut-phu" onClick={exportJson} disabled={!qs?.length}>
            Tải về JSON
          </button>
        </div>
      )}

      <div className="giay">
        <div className="loc">
          <select className="input" value={filter.grade} onChange={(e) => setFilter({ ...filter, grade: e.target.value, topic: "" })} aria-label="Lọc theo lớp">
            <option value="">Mọi lớp</option>
            <option value="10">Hóa 10</option>
            <option value="11">Hóa 11</option>
            <option value="12">Hóa 12</option>
          </select>
          <select className="input" value={filter.topic} onChange={(e) => setFilter({ ...filter, topic: e.target.value })} aria-label="Lọc theo chuyên đề">
            <option value="">Mọi chuyên đề</option>
            {topics
              .filter((t) => !filter.grade || String(t.grade) === filter.grade)
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.grade} – {t.name}
                </option>
              ))}
          </select>
          <select className="input" value={filter.level} onChange={(e) => setFilter({ ...filter, level: e.target.value })} aria-label="Lọc theo mức">
            <option value="">Mọi mức</option>
            {[1, 2, 3, 4].map((l) => (
              <option key={l} value={l}>
                {TIER_NAMES[l]}
              </option>
            ))}
          </select>
          <input className="input" placeholder="Tìm trong đề…" value={filter.q} onChange={(e) => setFilter({ ...filter, q: e.target.value })} aria-label="Tìm câu hỏi" />
        </div>
        <p className="muted small">
          {qs === null ? "Đang tải…" : `${shown.length} / ${qs.length} câu`}
        </p>
        <div className="bang-cuon">
          <table className="bang">
            <thead>
              <tr>
                <th>#</th>
                <th>Câu hỏi</th>
                <th>Chuyên đề</th>
                <th>Mức</th>
                <th>Đáp án</th>
                <th>Hiện</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {shown.map((q) => (
                <tr key={q.id}>
                  <td className="cot-so">{q.id}</td>
                  <td style={{ minWidth: 260 }}>{q.content.length > 140 ? q.content.slice(0, 140) + "…" : q.content}</td>
                  <td className="small">
                    {topicName[q.topic_id] ? `${topicName[q.topic_id].grade} – ${topicName[q.topic_id].name}` : q.topic_id}
                  </td>
                  <td className="small">{TIER_NAMES[q.level]}</td>
                  <td>{q.answer}</td>
                  <td>
                    <input
                      type="checkbox"
                      checked={q.is_published}
                      onChange={() => togglePublish(q)}
                      aria-label={q.is_published ? "Đang hiện, bấm để ẩn" : "Đang ẩn, bấm để hiện"}
                    />
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <button
                      type="button"
                      className="nut nut-phu nut-nho"
                      onClick={() =>
                        setDraft({
                          id: q.id,
                          topic_id: q.topic_id,
                          level: q.level,
                          content: q.content,
                          options: [...q.options],
                          answer: q.answer,
                          explanation: q.explanation ?? "",
                          is_published: q.is_published,
                        })
                      }
                    >
                      Sửa
                    </button>{" "}
                    <button type="button" className="nut nut-phu nut-nho" onClick={() => remove(q)}>
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function DraftForm({
  draft,
  setDraft,
  topics,
  onSubmit,
  onCancel,
}: {
  draft: Draft;
  setDraft: (d: Draft) => void;
  topics: Topic[];
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}) {
  return (
    <form className="giay" onSubmit={onSubmit}>
      <h2>{draft.id ? `Sửa câu #${draft.id}` : "Thêm câu hỏi"}</h2>
      <div className="row" style={{ alignItems: "flex-start" }}>
        <div className="field" style={{ flex: 2, minWidth: 220 }}>
          <label htmlFor="d-topic">Chuyên đề</label>
          <select id="d-topic" value={draft.topic_id} required onChange={(e) => setDraft({ ...draft, topic_id: e.target.value })}>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                Hóa {t.grade} – {t.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field" style={{ flex: 1, minWidth: 160 }}>
          <label htmlFor="d-level">Mức độ</label>
          <select id="d-level" value={draft.level} onChange={(e) => setDraft({ ...draft, level: Number(e.target.value) })}>
            {[1, 2, 3, 4].map((l) => (
              <option key={l} value={l}>
                {TIER_NAMES[l]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="field">
        <label htmlFor="d-content">Nội dung câu hỏi</label>
        <textarea id="d-content" required minLength={5} value={draft.content} onChange={(e) => setDraft({ ...draft, content: e.target.value })} />
      </div>
      <fieldset className="field" style={{ border: 0, padding: 0 }}>
        <legend style={{ fontWeight: 600, fontSize: "0.92rem", marginBottom: 6 }}>Phương án (chọn đáp án đúng)</legend>
        {LETTERS.map((l, i) => (
          <div key={l} className="pa-sua">
            <input
              type="radio"
              name="d-answer"
              checked={draft.answer === l}
              onChange={() => setDraft({ ...draft, answer: l })}
              aria-label={`Đáp án đúng là ${l}`}
            />
            <input
              className="input"
              placeholder={`Phương án ${l}`}
              value={draft.options[i]}
              required
              onChange={(e) => {
                const options = [...draft.options];
                options[i] = e.target.value;
                setDraft({ ...draft, options });
              }}
            />
          </div>
        ))}
      </fieldset>
      <div className="field">
        <label htmlFor="d-exp">Lời giải ngắn</label>
        <textarea id="d-exp" value={draft.explanation} onChange={(e) => setDraft({ ...draft, explanation: e.target.value })} />
        <span className="hint">Hiện cho học sinh sau khi trả lời và trong Sổ sám hối.</span>
      </div>
      <label className="row small" style={{ marginBottom: 14 }}>
        <input type="checkbox" checked={draft.is_published} onChange={(e) => setDraft({ ...draft, is_published: e.target.checked })} />
        Cho học sinh xin quẻ ra câu này
      </label>
      <div className="row">
        <button type="submit" className="nut">
          Lưu câu hỏi
        </button>
        <button type="button" className="nut nut-phu" onClick={onCancel}>
          Hủy
        </button>
      </div>
    </form>
  );
}

const MAU_JSON = `[
  {
    "topic": "t12-kim-loai",
    "level": 2,
    "content": "Kim loại nào sau đây có tính khử mạnh nhất?",
    "options": ["Fe", "Cu", "Mg", "Ag"],
    "answer": "C",
    "explanation": "Trong dãy, Mg có thế điện cực chuẩn nhỏ nhất."
  }
]`;

function ImportJson({ topics, onDone, onCancel }: { topics: Topic[]; onDone: (n: number) => void; onCancel: () => void }) {
  const supabase = useMemo(() => createClient(), []);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const ids = new Set(topics.map((t) => t.id));

  async function run() {
    setError(null);
    let arr: unknown;
    try {
      arr = JSON.parse(text);
    } catch {
      return setError("Không đọc được JSON. Kiểm tra lại dấu ngoặc, dấu phẩy.");
    }
    if (!Array.isArray(arr)) return setError("JSON phải là một danh sách [ … ].");
    const rows: {
      topic_id: string;
      level: number;
      content: string;
      options: string[];
      answer: string;
      explanation: string | null;
    }[] = [];
    for (let i = 0; i < arr.length; i++) {
      const q = arr[i] as Record<string, unknown>;
      const topic = String(q.topic ?? q.topic_id ?? "");
      const level = Number(q.level);
      let options = q.options as string[] | undefined;
      let answer = String(q.answer ?? "").toUpperCase();
      if (!options && typeof q.correct === "string" && Array.isArray(q.wrong) && q.wrong.length === 3) {
        options = [q.correct, ...(q.wrong as string[])];
        for (let k = options.length - 1; k > 0; k--) {
          const j = Math.floor(Math.random() * (k + 1));
          [options[k], options[j]] = [options[j], options[k]];
        }
        answer = LETTERS[options.indexOf(q.correct)];
      }
      if (!ids.has(topic)) return setError(`Câu ${i + 1}: chuyên đề "${topic}" không có.`);
      if (![1, 2, 3, 4].includes(level)) return setError(`Câu ${i + 1}: level phải từ 1 đến 4.`);
      if (typeof q.content !== "string" || q.content.trim().length < 5) return setError(`Câu ${i + 1}: thiếu nội dung.`);
      if (!Array.isArray(options) || options.length !== 4) return setError(`Câu ${i + 1}: cần đúng 4 phương án.`);
      if (!LETTERS.includes(answer as Letter)) return setError(`Câu ${i + 1}: answer phải là A, B, C hoặc D.`);
      rows.push({
        topic_id: topic,
        level,
        content: q.content.trim(),
        options: options.map((o) => String(o).trim()),
        answer,
        explanation: typeof q.explanation === "string" ? q.explanation : null,
      });
    }
    setBusy(true);
    const { error } = await supabase.from("questions").insert(rows);
    setBusy(false);
    if (error) return setError(errorText(error));
    onDone(rows.length);
  }

  return (
    <div className="giay">
      <h2>Nhập câu hỏi từ JSON</h2>
      <p className="small muted">
        Mỗi câu gồm: <code>topic</code> (mã chuyên đề), <code>level</code> (1–4), <code>content</code>, <code>options</code> (4
        phương án), <code>answer</code> (A–D), <code>explanation</code>. Mã chuyên đề:{" "}
        {topics.map((t) => t.id).join(", ")}.
      </p>
      <div className="field">
        <label htmlFor="json-file">Chọn file .json</label>
        <input
          id="json-file"
          type="file"
          accept="application/json,.json"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) setText(await file.text());
          }}
        />
      </div>
      <div className="field">
        <label htmlFor="json-text">Hoặc dán JSON vào đây</label>
        <textarea id="json-text" value={text} onChange={(e) => setText(e.target.value)} placeholder={MAU_JSON} style={{ minHeight: 200, fontFamily: "monospace" }} />
      </div>
      {error && (
        <p className="thong-bao" role="alert">
          {error}
        </p>
      )}
      <div className="row">
        <button type="button" className="nut" onClick={run} disabled={busy || !text.trim()}>
          {busy ? "Đang nhập…" : "Nhập câu hỏi"}
        </button>
        <button type="button" className="nut nut-phu" onClick={onCancel}>
          Hủy
        </button>
      </div>
    </div>
  );
}

/* ======================= Học sinh ======================= */

type HS = {
  id: string;
  display_name: string;
  gender: "nam" | "nu" | null;
  school: string | null;
  class_name: string | null;
  tiktok_username: string | null;
  role: string;
  level: number;
  cong_duc: number;
  huong: number;
  total_correct: number;
  total_wrong: number;
  penalty_minutes: number;
  last_seen_at: string | null;
  sam_hoi_at: string | null;
};

function HocSinh() {
  const supabase = useMemo(() => createClient(), []);
  const [list, setList] = useState<HS[] | null>(null);
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("admin_hoc_sinh");
    if (error) setError(errorText(error));
    else setList(data as HS[]);
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  async function tangHuong(h: HS) {
    const { error } = await supabase.rpc("admin_cap_huong", { p_user: h.id, p_so: 1, p_ghi_chu: "Thầy cô tặng" });
    if (error) return setError(errorText(error));
    setNotice(`Đã tặng ${h.display_name} 1 nén hương.`);
    void load();
  }

  async function xoaPhat(h: HS) {
    const { error } = await supabase.rpc("admin_xoa_phat", { p_user: h.id });
    if (error) return setError(errorText(error));
    setNotice(`Đã xóa phạt cho ${h.display_name}.`);
    void load();
  }

  const shown = (list ?? []).filter((h) =>
    [h.display_name, h.class_name, h.school, h.tiktok_username].join(" ").toLowerCase().includes(q.toLowerCase())
  );

  return (
    <section className="giay stack">
      {error && <p className="thong-bao">{error}</p>}
      {notice && <p className="thong-bao thong-bao-tot">{notice}</p>}
      <input className="input" placeholder="Tìm theo tên, lớp, trường, TikTok…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Tìm học sinh" />
      <p className="muted small">{list === null ? "Đang tải…" : `${shown.length} tài khoản`}</p>
      <div className="bang-cuon">
        <table className="bang">
          <thead>
            <tr>
              <th>Tên</th>
              <th>Giới tính</th>
              <th>Lớp</th>
              <th>TikTok</th>
              <th className="cot-so">Cấp</th>
              <th className="cot-so">Công đức</th>
              <th className="cot-so">Hương</th>
              <th className="cot-so">Đúng/Sai</th>
              <th>Phạt</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {shown.map((h) => (
              <tr key={h.id}>
                <td>
                  {h.display_name}
                  {h.role === "admin" && <span className="nhan" style={{ marginLeft: 6 }}>thầy cô</span>}
                  {h.sam_hoi_at && <span className="nhan nhan-la" style={{ marginLeft: 6 }}>sám hối</span>}
                </td>
                <td className="small">{h.gender === "nam" ? "Nam" : h.gender === "nu" ? "Nữ" : ""}</td>
                <td className="small">{[h.class_name, h.school].filter(Boolean).join(", ")}</td>
                <td className="small">{h.tiktok_username ?? ""}</td>
                <td className="cot-so">{h.level}</td>
                <td className="cot-so">{h.cong_duc}</td>
                <td className="cot-so">{h.huong}</td>
                <td className="cot-so">
                  {h.total_correct}/{h.total_wrong}
                </td>
                <td>{h.penalty_minutes > 0 ? `${h.penalty_minutes} phút` : ""}</td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button type="button" className="nut nut-phu nut-nho" onClick={() => tangHuong(h)}>
                    +1 hương
                  </button>{" "}
                  {h.penalty_minutes > 0 && (
                    <button type="button" className="nut nut-phu nut-nho" onClick={() => xoaPhat(h)}>
                      Xóa phạt
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ======================= Hương TikTok ======================= */

function Huong() {
  const supabase = useMemo(() => createClient(), []);
  const [form, setForm] = useState({ tiktok: "", so: 1, note: "Hoa hồng trên live" });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, setPending] = useState<{ tiktok_username: string; so: number; last_at: string }[]>([]);
  const [origin, setOrigin] = useState("");

  const loadPending = useCallback(async () => {
    const { data } = await supabase.rpc("admin_qua_cho");
    setPending((data as typeof pending) ?? []);
  }, [supabase]);

  useEffect(() => {
    setOrigin(window.location.origin);
    void loadPending();
  }, [loadPending]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const { data, error } = await supabase.rpc("admin_cap_huong", {
      p_tiktok: form.tiktok,
      p_so: form.so,
      p_ghi_chu: form.note,
    });
    if (error) return setMsg({ ok: false, text: errorText(error) });
    setMsg({
      ok: true,
      text:
        data.status === "granted"
          ? `Đã cộng ${data.so} nén hương cho ${data.display_name} (${data.tiktok_username}).`
          : `Chưa có học sinh gắn tên ${data.tiktok_username}. ${data.so} nén hương được giữ lại, ai gắn tên này trong Hồ sơ sẽ nhận.`,
    });
    setForm({ ...form, tiktok: "" });
    void loadPending();
  }

  return (
    <section className="stack">
      <form className="giay" onSubmit={submit}>
        <h2>Cộng hương khi có quà trên live</h2>
        <p className="muted small">Gõ tên TikTok của người vừa tặng hoa hồng. Màn hình live sẽ đọc lời cảm ơn.</p>
        <div className="row" style={{ alignItems: "flex-end" }}>
          <div className="field" style={{ flex: 2, minWidth: 200 }}>
            <label htmlFor="g-tiktok">Tên TikTok</label>
            <input id="g-tiktok" required value={form.tiktok} placeholder="vd: an.hoahoc" autoCapitalize="none" onChange={(e) => setForm({ ...form, tiktok: e.target.value })} />
          </div>
          <div className="field" style={{ flex: 1, minWidth: 100 }}>
            <label htmlFor="g-so">Số hương</label>
            <input id="g-so" type="number" min={1} max={1000} value={form.so} onChange={(e) => setForm({ ...form, so: Number(e.target.value) || 1 })} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="g-note">Ghi chú</label>
          <input id="g-note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </div>
        {msg && <p className={msg.ok ? "thong-bao thong-bao-tot" : "thong-bao"}>{msg.text}</p>}
        <button type="submit" className="nut">
          Cộng hương
        </button>
      </form>

      <div className="giay">
        <h2>Hương đang chờ người nhận</h2>
        {pending.length === 0 ? (
          <p className="muted">Không có.</p>
        ) : (
          <table className="bang">
            <thead>
              <tr>
                <th>Tên TikTok</th>
                <th className="cot-so">Hương</th>
                <th>Lần tặng cuối</th>
              </tr>
            </thead>
            <tbody>
              {pending.map((p) => (
                <tr key={p.tiktok_username}>
                  <td>{p.tiktok_username}</td>
                  <td className="cot-so">{p.so}</td>
                  <td>{new Date(p.last_at).toLocaleString("vi-VN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="giay">
        <h2>Tự động cộng hương bằng webhook</h2>
        <p className="small">
          Nếu phần mềm livestream của bạn gửi được webhook khi có quà, cho nó gọi đường link dưới đây. Thay{" "}
          <code>KHOA_BI_MAT</code> bằng giá trị <code>TIKTOK_WEBHOOK_SECRET</code> đã đặt khi cài web, và thay các chỗ trong
          ngoặc nhọn bằng biến tên người tặng, tên quà, số lượng của phần mềm đó.
        </p>
        <p className="code" style={{ display: "block", padding: 10 }}>
          {origin}/api/qua-tiktok?key=KHOA_BI_MAT&amp;user={"{username}"}&amp;gift={"{giftname}"}&amp;count={"{repeatcount}"}
        </p>
        <p className="small muted">Chỉ quà có tên trong TIKTOK_GIFT_NAMES (mặc định: rose, hoa hồng) mới được đổi ra hương.</p>
      </div>
    </section>
  );
}

/* ======================= Cấu hình ======================= */

function CauHinh() {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<{ key: string; value: number; note: string | null }[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from("app_config").select("key, value, note").order("key");
    setRows((data as typeof rows) ?? []);
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(key: string, value: number) {
    const { error } = await supabase.from("app_config").update({ value }).eq("key", key);
    setMsg(error ? errorText(error) : `Đã lưu ${key} = ${value}.`);
    void load();
  }

  return (
    <section className="giay">
      <h2>Cấu hình luật chơi</h2>
      {msg && <p className="thong-bao thong-bao-tot">{msg}</p>}
      <div className="bang-cuon">
        <table className="bang">
          <tbody>
            {rows.map((r) => (
              <tr key={r.key}>
                <td>
                  <strong>{r.note ?? r.key}</strong>
                  <div className="muted small">
                    <code>{r.key}</code>
                  </div>
                </td>
                <td style={{ width: 160 }}>
                  <form
                    className="row"
                    style={{ flexWrap: "nowrap" }}
                    onSubmit={(e) => {
                      e.preventDefault();
                      const v = Number((e.currentTarget.elements.namedItem("v") as HTMLInputElement).value);
                      if (Number.isFinite(v)) void save(r.key, v);
                    }}
                  >
                    <input name="v" className="input" type="number" step="any" defaultValue={r.value} aria-label={r.note ?? r.key} style={{ width: 84 }} />
                    <button type="submit" className="nut nut-phu nut-nho">
                      Lưu
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
