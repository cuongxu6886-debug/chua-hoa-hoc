"use client";

// Âm thanh tự tổng hợp bằng Web Audio, không cần file âm thanh.
let ctx: AudioContext | null = null;
const KEY = "chua-am-thanh";

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

export function isMuted(): boolean {
  try {
    return localStorage.getItem(KEY) === "tat";
  } catch {
    return false;
  }
}

export function setMuted(muted: boolean) {
  try {
    localStorage.setItem(KEY, muted ? "tat" : "bat");
  } catch {
    /* trình duyệt chặn lưu trữ: bỏ qua */
  }
}

/** Tiếng gõ mõ gỗ */
export function goMo(volume = 0.7) {
  if (isMuted()) return;
  const c = audio();
  if (!c) return;
  const t = c.currentTime;

  const body = c.createOscillator();
  const bodyGain = c.createGain();
  body.type = "sine";
  body.frequency.setValueAtTime(760, t);
  body.frequency.exponentialRampToValueAtTime(380, t + 0.09);
  bodyGain.gain.setValueAtTime(0.0001, t);
  bodyGain.gain.exponentialRampToValueAtTime(volume, t + 0.004);
  bodyGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
  body.connect(bodyGain).connect(c.destination);
  body.start(t);
  body.stop(t + 0.25);

  const len = Math.floor(c.sampleRate * 0.025);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const click = c.createBufferSource();
  click.buffer = buf;
  const band = c.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 2100;
  band.Q.value = 2;
  const clickGain = c.createGain();
  clickGain.gain.value = volume * 0.45;
  click.connect(band).connect(clickGain).connect(c.destination);
  click.start(t);
}

/** Tiếng chuông chùa ngân dài */
export function chuong(volume = 0.35) {
  if (isMuted()) return;
  const c = audio();
  if (!c) return;
  const t = c.currentTime;
  const base = 196;
  [1, 2.76, 5.4, 8.93].forEach((ratio, i) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "sine";
    o.frequency.value = base * ratio;
    const peak = volume / (i + 1);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 4.5 / (i * 0.6 + 1));
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + 5);
  });
}

/** Đọc to một câu tiếng Việt (giọng có sẵn trong máy). Tắt tiếng thì không đọc.
 *  gioi = "nam": chọn giọng nam nếu máy có (vd. NamMinh), không có thì hạ trầm giọng. */
function giongViet(gioi: "nam" | "nu" | undefined): { v: SpeechSynthesisVoice | null; nam: boolean } {
  const vi = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("vi"));
  if (gioi === "nam") {
    const v = vi.find((x) => /NamMinh|male|\bnam\b|\ban\b|minh/i.test(x.name) && !/female|HoaiMy|Linh/i.test(x.name));
    if (v) return { v, nam: true };
  }
  const v =
    vi.find((x) => /HoaiMy|Natural|Online/i.test(x.name)) ?? vi.find((x) => /Google/i.test(x.name)) ?? vi[0] ?? null;
  return { v, nam: false };
}

export function docTo(text: string, rate = 0.95, gioi?: "nam" | "nu"): SpeechSynthesisUtterance | null {
  if (isMuted() || typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "vi-VN";
    u.rate = rate;
    const { v, nam } = giongViet(gioi);
    if (v) u.voice = v;
    // Máy không có giọng nam: hạ trầm giọng sẵn có cho giống giọng nam
    if (gioi === "nam" && !nam) u.pitch = 0.55;
    window.speechSynthesis.speak(u);
    return u;
  } catch {
    /* trình duyệt không cho đọc: bỏ qua */
    return null;
  }
}

/** Tiếng vỗ tay của khán giả: nhiều tiếng tách ngắn chồng lên nhau. */
export function voTay(volume = 0.35, giay = 1.4) {
  if (isMuted()) return;
  const c = audio();
  if (!c) return;
  const len = Math.floor(c.sampleRate * 0.03);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  const so = Math.floor(giay * 26);
  for (let k = 0; k < so; k++) {
    const src = c.createBufferSource();
    src.buffer = buf;
    const g = c.createGain();
    const t = c.currentTime + Math.random() * giay;
    const fade = 1 - (t - c.currentTime) / giay;
    g.gain.value = volume * (0.4 + Math.random() * 0.6) * (0.3 + fade * 0.7);
    const f = c.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = 1200 + Math.random() * 1800;
    src.connect(f).connect(g).connect(c.destination);
    src.start(t);
  }
}
