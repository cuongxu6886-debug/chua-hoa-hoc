"use client";

import { useContext, useEffect, useRef, useState } from "react";
import { chuong, docTo, goMo } from "@/lib/sound";
import { useNhiemVu } from "./NhiemVu";
import { LuatSan, PhaoGiay, TIEU_NOI, TO_NOI, ToNoi, capNhatCoVu, moiCoVu, nenSanChua, noiDoi, pick, reo, useCanvas, useVongLap, veKhanGia } from "./sanChung";

type DoiKeo = "to" | "tieu" | "ban";
const TEN: Record<DoiKeo, string> = { to: "Ông Tổ", tieu: "Chú tiểu", ban: "Bạn 2" };
const W = 360;
const H = 270;
const DAT = 150;
const DAY_Y = 214;
/** Khoảng cách vạch thắng tính từ giữa sân (px) */
const VACH = 70;
const NHIP = 0.62; // giây giữa hai tiếng "hò dô"
const THOI_GIAN = 45;

const LOI_TO_KEO = {
  batDau: ["Kéo co với Tổ à? Đội Tổ toàn chú tiểu ăn cơm chay khỏe lắm!", "Hò dô ta nào! Xem ai mạnh hơn.", "Lực kéo của Tổ là lực liên kết ion đấy!"],
  phep: ["Tổ phẩy tay: đội Tổ được tiếp sức!", "Chất xúc tác của Tổ vào rồi, kéo mạnh lên các con!", "Gần thua à? Tổ niệm chú, sợi dây tự chạy về!"],
};

export default function KeoCo() {
  const luat = useContext(LuatSan);
  const { bac } = useNhiemVu();
  const khoe = 1 + 0.04 * (bac.so - 1); // bậc cao kéo khỏe hơn
  const cv = useCanvas(W, H);
  const [doi, setDoiRaw] = useState<DoiKeo>("to");
  const [pha, setPha] = useState<"cho" | "dem" | "keo" | "xong">("cho");
  const [tb, setTb] = useState("Bấm thật nhanh nút KÉO. Bấm đúng nhịp “hò dô” thì lực mạnh gấp đôi!");
  const [toNoi, setToNoi] = useState<string | null>(pick(LOI_TO_KEO.batDau));
  const [conThang, setConThang] = useState(false);
  const st = useRef({
    t: 0,
    dem: 0,
    pos: 0, // <0 là dây về phía con (bên trái)
    vel: 0,
    lucCon: 0,
    lucDoi: 0,
    conGiat: 0,
    doiGiat: 0,
    nhipT: 0,
    nhipSo: 0,
    phepT: 0,
    daPhep: 0,
    con: 0,
    ketThuc: 0, // >0 thì đang diễn cảnh thắng thua
    benThang: 0 as -1 | 0 | 1,
    chu: [] as { x: number; y: number; t: number; s: string; mau: string }[],
    bui: [] as { x: number; y: number; vx: number; vy: number; t: number }[],
    cv: moiCoVu(),
    rung: 0,
  });
  const phaRef = useRef(pha);
  phaRef.current = pha;
  const doiRef = useRef(doi);
  doiRef.current = doi;

  function setDoi(v: DoiKeo) {
    setDoiRaw(v);
    datLai();
    setToNoi(v === "to" ? pick(LOI_TO_KEO.batDau) : v === "tieu" ? pick(TIEU_NOI.batDau) : null);
  }

  function datLai() {
    Object.assign(st.current, { pos: 0, vel: 0, lucCon: 0, lucDoi: 0, phepT: 0, daPhep: 0, ketThuc: 0, benThang: 0, con: THOI_GIAN, chu: [], bui: [] });
    setPha("cho");
    setConThang(false);
    setTb("Bấm thật nhanh nút KÉO. Bấm đúng nhịp “hò dô” thì lực mạnh gấp đôi!");
  }

  function batDau() {
    datLai();
    st.current.dem = 3.2;
    setPha("dem");
    goMo(0.2);
  }

  /** Một cái kéo của đội bên trái (ben = -1) hoặc bên phải (ben = 1, khi hai bạn chơi) */
  function keo(ben: -1 | 1) {
    const s = st.current;
    if (phaRef.current === "cho" || phaRef.current === "xong") {
      if (phaRef.current === "cho" && ben === -1) batDau();
      return;
    }
    if (phaRef.current !== "keo") return;
    // đúng nhịp: gần tiếng hò dô
    const lech = Math.min(s.nhipT, NHIP - s.nhipT);
    const dung = lech < 0.13;
    const luc = (dung ? 1.8 : 1) * (ben === -1 ? khoe : 1);
    if (ben === -1) {
      s.lucCon += luc;
      s.conGiat = 1;
    } else {
      s.lucDoi += luc;
      s.doiGiat = 1;
    }
    if (dung) s.chu.push({ x: ben === -1 ? 70 : W - 70, y: DAY_Y - 70, t: 0.8, s: "Đều tay!", mau: "#ffe066" });
    for (let i = 0; i < 2; i++)
      s.bui.push({ x: (ben === -1 ? W / 2 - VACH - 60 : W / 2 + VACH + 60) + s.pos * 0, y: DAY_Y + 30, vx: (Math.random() - 0.5) * 40 - ben * 30, vy: -20 - Math.random() * 30, t: 0.6 });
  }

  // bàn phím: phím cách / A cho bên trái, L / Enter cho bên phải
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === "Space" || e.key === "a" || e.key === "A") {
        e.preventDefault();
        keo(-1);
      } else if (doiRef.current === "ban" && (e.key === "l" || e.key === "L" || e.key === "Enter")) {
        e.preventDefault();
        keo(1);
      }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function xong(benThang: -1 | 1) {
    const s = st.current;
    if (s.ketThuc > 0) return;
    s.ketThuc = 2.2;
    s.benThang = benThang;
    s.rung = 0.5;
    setPha("xong");
    luat.choi("keoco");
    const d = doiRef.current;
    if (benThang === -1) {
      reo(s.cv, true);
      chuong(0.35);
      setConThang(true);
      setTb(d === "ban" ? "Đội Bạn 1 thắng!" : "Đội con thắng! Cả sân reo hò.");
      luat.thang();
      if (d === "tieu") {
        const l = pick(TIEU_NOI.thua);
        setToNoi(l);
        noiDoi("tieu", l);
      }
    } else {
      setTb(d === "ban" ? "Đội Bạn 2 thắng!" : `Đội ${TEN[d]} thắng.`);
      if (d !== "ban") {
        reo(s.cv, false);
        const l = d === "to" ? pick(TO_NOI.toThang) : pick(TIEU_NOI.thang);
        setToNoi(l);
        noiDoi(d, l);
        setTimeout(() => luat.thua(`Đội ${TEN[d]} kéo dây qua vạch.`), 2000);
      }
    }
  }

  useVongLap((dt) => {
    const s = st.current;
    s.t += dt;
    const d = doiRef.current;
    const ph = phaRef.current;
    if (ph === "dem") {
      const truoc = Math.ceil(s.dem);
      s.dem -= dt;
      if (Math.ceil(s.dem) !== truoc && s.dem > 0) goMo(0.18);
      if (s.dem <= 0) {
        setPha("keo");
        s.nhipT = 0;
        docTo("Hò dô ta, kéo!", 1.1);
      }
    }
    if (ph === "keo") {
      s.con -= dt;
      // nhịp hò dô
      s.nhipT += dt;
      if (s.nhipT >= NHIP) {
        s.nhipT -= NHIP;
        s.nhipSo++;
        goMo(0.1);
      }
      // đội máy kéo
      if (d !== "ban") {
        let muc: number;
        if (d === "tieu") muc = (1.85 + Math.sin(s.t * 0.9) * 0.35 + Math.sin(s.t * 2.3) * 0.15) * (s.t % 9 < 1.4 ? 0.55 : 1); // thỉnh thoảng chú tiểu mỏi tay
        else {
          // Ông Tổ: kéo theo sức con, gần thua thì hóa phép
          muc = Math.max(1.5, s.lucCon * (0.86 + 0.12 * Math.sin(s.t * 0.5)));
          if (s.pos < -0.62 && s.phepT <= 0) {
            // lần thứ ba thì Tổ kéo tới khi thắng
            s.phepT = s.daPhep >= 2 ? 99 : 3;
            s.daPhep++;
            const l = pick(LOI_TO_KEO.phep);
            setToNoi(l);
            noiDoi("to", l);
            chuong(0.2);
            reo(s.cv, true);
          }
          if (s.phepT > 0) {
            s.phepT -= dt;
            muc = s.lucCon + 1.6;
          }
        }
        s.lucDoi += (muc - s.lucDoi) * Math.min(1, dt * 3);
        if (Math.random() < dt * 4) s.doiGiat = 1;
      }
      s.lucCon *= Math.exp(-dt * 2.6);
      if (d === "ban") s.lucDoi *= Math.exp(-dt * 2.6);
      // dây chạy theo hiệu lực, có quán tính
      const ep = (s.lucDoi - s.lucCon) * 0.18;
      s.vel += (ep - s.vel) * Math.min(1, dt * 4);
      s.pos += s.vel * dt;
      if (d === "to" && s.pos < -0.93) {
        s.pos = -0.93;
        s.vel = Math.max(0, s.vel);
      }
      if (s.pos <= -1) xong(-1);
      else if (s.pos >= 1) xong(1);
      else if (s.con <= 0) {
        if (d === "to") {
          s.phepT = 5;
          s.vel = 0.8;
        } else xong(s.pos < 0 ? -1 : 1);
      }
    }
    if (s.ketThuc > 0) {
      s.ketThuc -= dt;
      s.pos += s.benThang * dt * 0.6;
      s.pos = Math.max(-1.6, Math.min(1.6, s.pos));
    }
    s.conGiat = Math.max(0, s.conGiat - dt * 5);
    s.doiGiat = Math.max(0, s.doiGiat - dt * 5);
    s.rung = Math.max(0, s.rung - dt);
    s.chu = s.chu.filter((c) => (c.t -= dt) > 0);
    s.bui = s.bui.filter((b) => {
      b.t -= dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.vy += 60 * dt;
      return b.t > 0;
    });
    capNhatCoVu(s.cv, dt);
    ve();
  });

  function veNguoiKeo(g: CanvasRenderingContext2D, x: number, ben: -1 | 1, ao: string, nghieng: number, kieu: "to" | "tieu" | "nguoi", nga: boolean) {
    // ben = -1: đứng bên trái, kéo sang trái (ngả người sang trái)
    const y = DAY_Y;
    g.save();
    g.translate(x, y + 38);
    g.rotate(nga ? -ben * 1.2 : ben * nghieng);
    // chân
    g.strokeStyle = "#3a2a20";
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(-4, -16);
    g.lineTo(-8 - ben * 4, 0);
    g.moveTo(4, -16);
    g.lineTo(8 - ben * 4, 0);
    g.stroke();
    // thân áo
    g.fillStyle = ao;
    g.beginPath();
    g.moveTo(-10, -14);
    g.lineTo(-8, -40);
    g.lineTo(8, -40);
    g.lineTo(10, -14);
    g.fill();
    // tay cầm dây (đưa về phía dây ở giữa)
    g.strokeStyle = "#e8b48a";
    g.lineWidth = 3.5;
    g.beginPath();
    g.moveTo(0, -34);
    g.lineTo(-ben * 14, -24);
    g.stroke();
    // đầu
    g.fillStyle = "#e8b48a";
    g.beginPath();
    g.arc(0, -50, 9, 0, Math.PI * 2);
    g.fill();
    if (kieu === "to") {
      g.fillStyle = "#24160f";
      g.fillRect(-10, -60, 20, 6);
      g.fillStyle = "#f3efe6";
      g.beginPath();
      g.moveTo(-6, -46);
      g.lineTo(6, -46);
      g.lineTo(0, -30);
      g.fill();
    } else if (kieu === "tieu") {
      g.fillStyle = "#2b1d16";
      g.beginPath();
      g.arc(0, -59, 2.5, 0, Math.PI * 2);
      g.fill();
    } else {
      g.fillStyle = "#2b1d16";
      g.beginPath();
      g.arc(0, -53, 9.5, Math.PI, 0);
      g.fill();
    }
    g.restore();
  }

  function ve() {
    const g = cv.current?.getContext("2d");
    if (!g) return;
    const s = st.current;
    const d = doiRef.current;
    g.save();
    if (s.rung > 0) g.translate((Math.random() - 0.5) * 6 * s.rung, (Math.random() - 0.5) * 4 * s.rung);
    nenSanChua(g, W, H, DAT, s.t);
    veKhanGia(g, W, DAT + 22, s.t, s.cv);
    // vạch giữa và hai vạch thắng
    g.fillStyle = "rgba(255,240,210,0.85)";
    g.fillRect(W / 2 - 1.5, DAY_Y + 6, 3, 50);
    g.fillStyle = "#d2402a";
    g.fillRect(W / 2 - VACH - 2, DAY_Y + 6, 4, 50);
    g.fillStyle = "#3f8a66";
    g.fillRect(W / 2 + VACH - 2, DAY_Y + 6, 4, 50);
    const lech = s.pos * VACH;
    // dây thừng gợn nhẹ
    g.strokeStyle = "#c9a066";
    g.lineWidth = 5;
    g.beginPath();
    for (let x = 0; x <= W; x += 8) {
      const yy = DAY_Y + Math.sin(x * 0.05 + s.t * 9) * (0.6 + Math.abs(s.vel) * 2.2) + 10;
      if (x === 0) g.moveTo(x, yy);
      else g.lineTo(x, yy);
    }
    g.stroke();
    g.strokeStyle = "rgba(110,74,34,0.55)";
    g.lineWidth = 1.5;
    g.setLineDash([3, 5]);
    g.stroke();
    g.setLineDash([]);
    // dải lụa đỏ giữa dây
    g.fillStyle = "#d2402a";
    g.beginPath();
    g.moveTo(W / 2 + lech - 6, DAY_Y + 8);
    g.lineTo(W / 2 + lech + 6, DAY_Y + 8);
    g.lineTo(W / 2 + lech + 3 + Math.sin(s.t * 8) * 2, DAY_Y + 34);
    g.lineTo(W / 2 + lech - 3 + Math.sin(s.t * 8) * 2, DAY_Y + 30);
    g.fill();
    // hai đội
    const ngaTrai = s.ketThuc > 0 && s.benThang === 1;
    const ngaPhai = s.ketThuc > 0 && s.benThang === -1;
    const nghiengTrai = 0.32 + s.conGiat * 0.18 + Math.min(0.15, s.lucCon * 0.05);
    const nghiengPhai = 0.32 + s.doiGiat * 0.18 + Math.min(0.15, s.lucDoi * 0.05);
    for (let k = 0; k < 3; k++) {
      const x = W / 2 - VACH - 30 - k * 34 + lech;
      veNguoiKeo(g, x, -1, k === 0 ? "#b8b1a3" : k === 1 ? "#7f98ab" : "#c9772a", nghiengTrai + Math.sin(s.t * 3 + k) * 0.03, "nguoi", ngaTrai);
    }
    for (let k = 0; k < 3; k++) {
      const x = W / 2 + VACH + 30 + k * 34 + lech;
      const kieu = d === "to" ? (k === 0 ? "to" : "tieu") : d === "tieu" ? "tieu" : "nguoi";
      const ao = kieu === "to" ? "#1f5a45" : kieu === "tieu" ? "#d98a2b" : k === 1 ? "#8a9fae" : "#7a5a3e";
      veNguoiKeo(g, x, 1, ao, nghiengPhai + Math.sin(s.t * 3.2 + k) * 0.03, kieu, ngaPhai);
    }
    // bụi dưới chân
    for (const b of s.bui) {
      g.fillStyle = `rgba(230,210,180,${b.t})`;
      g.beginPath();
      g.arc(b.x + lech, b.y, 3 + (0.6 - b.t) * 6, 0, Math.PI * 2);
      g.fill();
    }
    // hào quang khi Tổ hóa phép
    if (s.phepT > 0 && d === "to") {
      const gr = g.createRadialGradient(W / 2 + VACH + 30 + lech, DAY_Y - 10, 4, W / 2 + VACH + 30 + lech, DAY_Y - 10, 70);
      gr.addColorStop(0, "rgba(255,226,120,0.55)");
      gr.addColorStop(1, "rgba(255,226,120,0)");
      g.fillStyle = gr;
      g.fillRect(0, DAT, W, H - DAT);
    }
    g.restore();
    // thanh lực hai bên
    const bar = (x: number, v: number, mau: string) => {
      g.fillStyle = "rgba(0,0,0,0.4)";
      g.fillRect(x, 12, 110, 9);
      g.fillStyle = mau;
      g.fillRect(x, 12, Math.min(110, v * 32), 9);
    };
    bar(12, s.lucCon, "#e2b957");
    bar(W - 122, s.lucDoi, "#5dae84");
    g.fillStyle = "#f3ead6";
    g.font = "700 11px 'Be Vietnam Pro', system-ui";
    g.fillText(d === "ban" ? "Bạn 1" : "Đội con", 12, 34);
    g.textAlign = "right";
    g.fillText(d === "ban" ? "Bạn 2" : `Đội ${TEN[d]}`, W - 12, 34);
    g.textAlign = "center";
    // nhịp hò dô: vòng tròn đập theo nhịp
    if (phaRef.current === "keo") {
      const k = 1 - Math.min(s.nhipT, NHIP - s.nhipT) / (NHIP / 2);
      g.fillStyle = `rgba(255,224,102,${0.25 + k * 0.6})`;
      g.beginPath();
      g.arc(W / 2, 30, 10 + k * 8, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#24160f";
      g.font = "800 10px 'Be Vietnam Pro', system-ui";
      g.fillText(s.nhipSo % 2 ? "dô" : "hò", W / 2, 34);
      g.fillStyle = "#f3ead6";
      g.font = "700 11px 'Be Vietnam Pro', system-ui";
      g.fillText(`${Math.max(0, Math.ceil(s.con))} giây`, W / 2, 60);
    }
    if (phaRef.current === "dem") {
      g.fillStyle = "#ffe29a";
      g.font = "900 54px 'Be Vietnam Pro', system-ui";
      g.fillText(s.dem > 0.2 ? String(Math.ceil(s.dem - 0.2)) : "KÉO!", W / 2, 120);
    }
    for (const c of s.chu) {
      g.globalAlpha = Math.min(1, c.t * 2);
      g.fillStyle = c.mau;
      g.font = "800 14px 'Be Vietnam Pro', system-ui";
      g.fillText(c.s, c.x, c.y - (0.8 - c.t) * 30);
      g.globalAlpha = 1;
    }
    g.textAlign = "start";
  }

  const nutTrai = pha === "cho" ? "Bắt đầu kéo" : pha === "xong" ? "Kéo lại" : doi === "ban" ? "Bạn 1 KÉO" : "KÉO!";
  return (
    <div className="tro-canvas">
      <div className="row" style={{ marginBottom: 10 }}>
        {(["to", "tieu", "ban"] as DoiKeo[]).map((v) => (
          <button key={v} type="button" className={`chip-chon${doi === v ? " is-chon" : ""}`} onClick={() => setDoi(v)}>
            {v === "to" ? "Kéo với đội Ông Tổ" : v === "tieu" ? "Kéo với đội Chú tiểu" : "Hai bạn chung máy"}
          </button>
        ))}
      </div>
      <ToNoi text={toNoi} ai={doi === "ban" ? "ban" : doi} />
      <canvas
        ref={cv}
        style={{ width: "100%", maxWidth: W, aspectRatio: `${W} / ${H}`, touchAction: "manipulation" }}
        onPointerDown={(e) => {
          if (doi === "ban") {
            const r = (e.currentTarget as HTMLCanvasElement).getBoundingClientRect();
            keo(e.clientX - r.left < r.width / 2 ? -1 : 1);
          } else keo(-1);
        }}
      />
      <div className="kc-nut">
        <button
          type="button"
          className="kc-keo"
          onPointerDown={(e) => {
            e.preventDefault();
            if (pha === "xong") batDau();
            else keo(-1);
          }}
        >
          {nutTrai}
        </button>
        {doi === "ban" && pha === "keo" && (
          <button
            type="button"
            className="kc-keo is-phai"
            onPointerDown={(e) => {
              e.preventDefault();
              keo(1);
            }}
          >
            Bạn 2 KÉO
          </button>
        )}
      </div>
      <p className="small muted" style={{ margin: "6px 0 0" }}>
        {tb}
        {doi === "ban" ? " Trên máy tính: Bạn 1 bấm A, Bạn 2 bấm L." : " Trên máy tính có thể bấm phím cách."}
      </p>
      <PhaoGiay chay={conThang} />
    </div>
  );
}
