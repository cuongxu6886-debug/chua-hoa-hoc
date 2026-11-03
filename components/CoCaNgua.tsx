"use client";

import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { chuong, goMo } from "@/lib/sound";
import {
  BUOC_DICH,
  DUONG,
  GOC_CHUONG,
  MAU_HEX,
  banMoi,
  chonNuoc,
  diNgua,
  nuocNgua,
  oCua,
  thangCuoc,
  veDich,
  type BanNgua,
  type MauNgua,
  type NuocNgua,
} from "@/lib/caNgua";
import { KhanGiaDom, LuatSan, PhaoGiay, TIEU_NOI, TO_NOI, ToNoi, noiDoi, pick, useCoVuDom } from "./sanChung";

type DoiNgua = "to" | "tieu" | "ban";
const TEN: Record<DoiNgua, string> = { to: "Ông Tổ", tieu: "Chú tiểu", ban: "Bạn 2" };
const CON: MauNgua = 3; // đỏ, chuồng góc dưới trái
const DOI: MauNgua = 1; // vàng, chuồng góc trên phải

const TO_NGUA = {
  batDau: ["Ngựa của Tổ là ngựa thần, chạy nhanh như electron!", "Gieo 1 hoặc 6 mới được ra chuồng nhé con.", "Cờ cá ngựa à? Tổ chơi từ hồi còn để chỏm."],
  da: ["Ngựa con về chuồng nghỉ chút nhé!", "Đá một phát, như phản ứng thế!", "Tổ xin mời ngựa con về nhà."],
  phep: ["Tổ thổi một hơi, ngựa của con lạc đường rồi!", "Gần về đích à? Tổ niệm chú, ngựa con quay đầu!", "Phép của Tổ: ngựa con đi thêm một vòng cho khỏe!"],
};

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Mặt xúc xắc: vị trí các chấm trên lưới 3x3 */
const CHAM: Record<number, number[]> = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };

export default function CoCaNgua() {
  const [doi, setDoi] = useState<DoiNgua>("to");
  const [so, setSo] = useState(2);
  return (
    <div>
      <div className="row" style={{ marginBottom: 6 }}>
        {(["to", "tieu", "ban"] as DoiNgua[]).map((v) => (
          <button key={v} type="button" className={`chip-chon${doi === v ? " is-chon" : ""}`} onClick={() => setDoi(v)}>
            {v === "to" ? "Thách đấu Ông Tổ" : v === "tieu" ? "Chơi với Chú tiểu" : "Hai bạn chung máy"}
          </button>
        ))}
      </div>
      <div className="row" style={{ marginBottom: 10 }}>
        {[2, 4].map((n) => (
          <button key={n} type="button" className={`chip-chon${so === n ? " is-chon" : ""}`} onClick={() => setSo(n)}>
            {n === 2 ? "Ván nhanh: 2 ngựa" : "Ván đủ: 4 ngựa"}
          </button>
        ))}
      </div>
      <BanCaNgua key={`${doi}-${so}`} doi={doi} soNgua={so} />
    </div>
  );
}

function BanCaNgua({ doi, soNgua }: { doi: DoiNgua; soNgua: number }) {
  const luat = useContext(LuatSan);
  const voiTo = doi === "to";
  const hai = doi === "ban";
  const ten = TEN[doi];
  const [ban, setBan] = useState<BanNgua>(() => banMoi([CON, DOI], soNgua));
  const [hien, setHien] = useState<number[]>(() => ban.ngua.map(() => -1));
  const [luot, setLuot] = useState<MauNgua>(CON);
  const [xx, setXx] = useState(6);
  const [lac, setLac] = useState(false);
  const [cho, setCho] = useState<NuocNgua[] | null>(null); // đang chờ con chọn ngựa
  const [ban2Gieo, setBan2Gieo] = useState(false);
  const [dangChay, setDangChay] = useState(false);
  const [tb, setTb] = useState("Gieo xúc xắc. Ra 1 hoặc 6 thì được đưa ngựa ra chuồng, ra 6 được gieo thêm.");
  const [ketqua, setKetqua] = useState<string | null>(null);
  const [conThang, setConThang] = useState(false);
  const [toNoi, setToNoi] = useState<string | null>(() => (voiTo ? pick(TO_NGUA.batDau) : doi === "tieu" ? pick(TIEU_NOI.batDau) : null));
  const [phep, setPhep] = useState(-1);
  const { cv, reoDom } = useCoVuDom();
  const banRef = useRef(ban);
  banRef.current = ban;
  const song = useRef(true);
  useEffect(() => {
    song.current = true;
    return () => {
      song.current = false;
    };
  }, []);

  /** Gieo xúc xắc có hiệu ứng lắc */
  async function gieo(gia?: number): Promise<number> {
    setLac(true);
    goMo(0.12);
    for (let i = 0; i < 7; i++) {
      setXx(1 + Math.floor(Math.random() * 6));
      await sleep(70);
    }
    const v = gia ?? 1 + Math.floor(Math.random() * 6);
    setXx(v);
    setLac(false);
    goMo(0.2);
    return v;
  }

  /** Cho ngựa nhảy từng ô tới chỗ mới, ngựa bị đá trượt về chuồng */
  async function chay(b: BanNgua, n: NuocNgua): Promise<BanNgua> {
    setDangChay(true);
    const tu = Math.max(-1, n.tu);
    if (tu < 0) {
      setHien((h) => h.map((p, j) => (j === n.chiSo ? 0 : p)));
      goMo(0.18);
      await sleep(260);
    } else {
      for (let p = tu + 1; p <= n.den; p++) {
        if (!song.current) return b;
        setHien((h) => h.map((x, j) => (j === n.chiSo ? p : x)));
        goMo(0.07);
        await sleep(165);
      }
    }
    const moi = diNgua(b, n);
    if (n.da.length) {
      chuong(0.18);
      reoDom(true);
      setHien((h) => h.map((x, j) => (n.da.includes(j) ? -1 : x)));
      await sleep(380);
    }
    if (n.den >= BUOC_DICH) {
      chuong(0.25);
      reoDom(true);
    }
    setBan(moi);
    banRef.current = moi;
    setDangChay(false);
    return moi;
  }

  function ketThuc(b: BanNgua, m: MauNgua) {
    luat.choi("cangua");
    const conLa = m === CON;
    if (conLa) {
      setKetqua(hai ? "Bạn 1 (ngựa đỏ) về đích hết, thắng rồi!" : "Con đưa hết ngựa về đích, thắng rồi!");
      setConThang(true);
      chuong(0.35);
      luat.thang();
      if (doi === "tieu") {
        const l = pick(TIEU_NOI.thua);
        setToNoi(l);
        noiDoi("tieu", l);
      }
    } else {
      setKetqua(hai ? "Bạn 2 (ngựa vàng) về đích hết, thắng rồi!" : `${ten} về đích trước.`);
      if (!hai) {
        const l = voiTo ? pick(TO_NOI.toThang) : pick(TIEU_NOI.thang);
        setToNoi(l);
        noiDoi(doi, l);
        setTimeout(() => luat.thua(`${ten} đưa hết ngựa về đích trước con.`), 2000);
      }
    }
    void b;
  }

  /** Sau một nước của màu m với xúc xắc x: xét thắng, chuyển lượt */
  async function sauNuoc(b: BanNgua, m: MauNgua, x: number) {
    if (thangCuoc(b, m)) return ketThuc(b, m);
    const tiep: MauNgua = x === 6 ? m : m === CON ? DOI : CON;
    setLuot(tiep);
    if (tiep === CON || hai) {
      setTb(
        x === 6
          ? `Ra 6, ${tiep === CON ? (hai ? "Bạn 1" : "con") : "Bạn 2"} được gieo thêm!`
          : `Tới lượt ${tiep === CON ? (hai ? "Bạn 1 (ngựa đỏ)" : "con (ngựa đỏ)") : "Bạn 2 (ngựa vàng)"}: gieo xúc xắc.`
      );
      if (hai && tiep === DOI) setBan2Gieo(true);
      return;
    }
    await sleep(x === 6 ? 500 : 650);
    if (song.current) await mayDi(b);
  }

  /** Lượt con (hoặc Bạn 2 khi chơi chung máy) bấm gieo */
  async function bamGieo() {
    if (dangChay || lac || cho || ketqua) return;
    if (!hai && luot !== CON) return;
    const m = luot;
    setBan2Gieo(false);
    const x = await gieo();
    const ds = nuocNgua(banRef.current, m, x);
    if (!ds.length) {
      setTb(`Ra ${x}: chưa đi được ngựa nào.`);
      await sleep(800);
      return sauNuoc(banRef.current, m, x);
    }
    if (ds.length === 1) {
      await sleep(220);
      return diChon(ds[0], x);
    }
    setCho(ds);
    setTb(`Ra ${x}: chạm vào một ngựa đang sáng để đi.`);
  }

  async function diChon(n: NuocNgua, x = xx) {
    setCho(null);
    const m = banRef.current.ngua[n.chiSo].mau;
    let b = banRef.current;
    // Ông Tổ không để con về đích con ngựa cuối cùng
    if (voiTo && m === CON && thangCuoc(diNgua(b, n), CON)) {
      b = await chay(b, { ...n, den: Math.min(n.den, BUOC_DICH - 1), da: [] });
      const l = pick(TO_NGUA.phep);
      setToNoi(l);
      noiDoi("to", l);
      setPhep(n.chiSo);
      reoDom(true);
      await sleep(700);
      // ngựa quay lại đầu đường về
      setHien((h) => h.map((p, j) => (j === n.chiSo ? 44 : p)));
      b = { ...b, ngua: b.ngua.map((k, j) => (j === n.chiSo ? { ...k, p: 44 } : k)) };
      setBan(b);
      banRef.current = b;
      await sleep(500);
      setPhep(-1);
      return sauNuoc(b, m, x === 6 ? 1 : x);
    }
    const moi = await chay(b, n);
    if (n.da.length && m === DOI && voiTo) setToNoi(pick(TO_NGUA.da));
    return sauNuoc(moi, m, x);
  }

  /** Lượt máy (Ông Tổ / chú tiểu) */
  async function mayDi(b: BanNgua) {
    setTb(`${ten} gieo xúc xắc…`);
    let gia: number | undefined;
    if (voiTo) {
      // xúc xắc của Tổ có phép: gieo hai lần, lấy lần lợi hơn
      const diem = (v: number) => {
        const ds = nuocNgua(b, DOI, v);
        if (!ds.length) return 0;
        const tot = chonNuoc(b, ds, true)!;
        return (tot.da.length ? 4 : 0) + (tot.den >= BUOC_DICH ? 4 : 0) + (v === 6 ? 2 : 0) + 1 + tot.den / 100;
      };
      const a = 1 + Math.floor(Math.random() * 6);
      const c = 1 + Math.floor(Math.random() * 6);
      gia = diem(a) >= diem(c) ? a : c;
    }
    const x = await gieo(gia);
    if (!song.current) return;
    const ds = nuocNgua(banRef.current, DOI, x);
    const n = chonNuoc(banRef.current, ds, voiTo);
    if (!n) {
      setTb(`${ten} ra ${x}, chưa đi được.`);
      await sleep(700);
      return sauNuoc(banRef.current, DOI, x);
    }
    await sleep(260);
    const moi = await chay(banRef.current, n);
    if (n.da.length && voiTo) {
      const l = pick(TO_NGUA.da);
      setToNoi(l);
      noiDoi("to", l);
    }
    return sauNuoc(moi, DOI, x);
  }

  function moi() {
    const b = banMoi([CON, DOI], soNgua);
    setBan(b);
    banRef.current = b;
    setHien(b.ngua.map(() => -1));
    setLuot(CON);
    setCho(null);
    setKetqua(null);
    setConThang(false);
    setBan2Gieo(false);
    setTb("Gieo xúc xắc. Ra 1 hoặc 6 thì được đưa ngựa ra chuồng, ra 6 được gieo thêm.");
  }

  // Vị trí vẽ một ngựa (theo ô, có thể lẻ)
  function viTri(i: number): [number, number] {
    const n = ban.ngua[i];
    const p = hien[i];
    if (p < 0) {
      const [gr, gc] = GOC_CHUONG[n.mau];
      const k = n.so % 4;
      return [gr + 1.5 + (k >> 1) * 2, gc + 1.5 + (k & 1) * 2];
    }
    const [r, c] = oCua(n.mau, Math.min(p, BUOC_DICH));
    if (p >= BUOC_DICH) {
      // về đích: xếp gọn trong ô đích
      const lech = (n.so - 1.5) * 0.18;
      return [r + (n.mau % 2 ? 0 : lech), c + (n.mau % 2 ? lech : 0)];
    }
    return [r, c];
  }

  const choSet = useMemo(() => new Set((cho ?? []).map((n) => n.chiSo)), [cho]);
  const luotCon = hai ? true : luot === CON;
  const coTheGieo = !dangChay && !lac && !cho && !ketqua && luotCon;
  const tenLuot = hai ? (luot === CON ? "Bạn 1 (đỏ)" : "Bạn 2 (vàng)") : luot === CON ? "Con (đỏ)" : `${ten} (vàng)`;

  return (
    <div className="ng-khung">
      <ToNoi text={toNoi} ai={hai ? "ban" : doi} />
      <div className="ti-so">
        <span className="mau-x">
          {hai ? "Bạn 1" : "Con"}: {veDich(ban, CON)}/{soNgua} về đích
        </span>
        <span>·</span>
        <span className="mau-o">
          {ten}: {veDich(ban, DOI)}/{soNgua}
        </span>
      </div>
      <KhanGiaDom cv={cv} />
      <div className="ng-ban">
        <NenBanNgua />
        {ban.ngua.map((n, i) => {
          const [r, c] = viTri(i);
          const sang = choSet.has(i);
          return (
            <button
              key={i}
              type="button"
              className={`ng-ngua${sang ? " is-sang" : ""}${phep === i ? " is-phep" : ""}${hien[i] < 0 ? " is-chuong" : ""}`}
              style={{ transform: `translate(${c * 100}%, ${r * 100}%)`, ["--mau" as string]: MAU_HEX[n.mau] }}
              disabled={!sang}
              onClick={() => {
                const nuoc = cho?.find((x) => x.chiSo === i);
                if (nuoc) void diChon(nuoc);
              }}
              aria-label={`Ngựa ${n.mau === CON ? "đỏ" : "vàng"} số ${n.so + 1}`}
            >
              <i>♞{"︎"}</i>
            </button>
          );
        })}
      </div>
      <PhaoGiay chay={conThang} />
      <div className="ng-dieu-khien">
        <button
          type="button"
          className={`ng-xx${lac ? " is-lac" : ""}${coTheGieo ? " is-moi" : ""}`}
          onClick={() => void bamGieo()}
          disabled={!coTheGieo}
          aria-label={`Xúc xắc đang là ${xx}. Bấm để gieo`}
        >
          {Array.from({ length: 9 }, (_, k) => (
            <span key={k} className={CHAM[xx].includes(k) ? "is-cham" : undefined} />
          ))}
        </button>
        <div className="ng-tb">
          {ketqua ? (
            <strong className="ket-tro">{ketqua}</strong>
          ) : (
            <>
              <b>Lượt: {tenLuot}</b>
              <span className="small">{tb}</span>
              {hai && ban2Gieo && <span className="small">Bạn 2 bấm xúc xắc để gieo.</span>}
            </>
          )}
        </div>
        <button type="button" className="nut nut-nho" onClick={moi}>
          Ván mới
        </button>
      </div>
    </div>
  );
}

/** Bàn cờ vẽ bằng SVG (vẽ một lần) */
function NenBanNgua() {
  return useMemo(() => {
    const o: React.ReactNode[] = [];
    const mauDuong = (r: number, c: number) => {
      // ô cửa chuồng mỗi màu
      const cua: Record<string, number> = { "6,1": 0, "1,8": 1, "8,13": 2, "13,6": 3 };
      const k = cua[`${r},${c}`];
      return k !== undefined ? MAU_HEX[k] : "#fbf3e2";
    };
    DUONG.forEach(([r, c], i) =>
      o.push(<rect key={`d${i}`} x={c} y={r} width={1} height={1} fill={mauDuong(r, c)} stroke="#b08a5a" strokeWidth={0.04} />)
    );
    // đường về đích mỗi màu
    for (const m of [0, 1, 2, 3] as MauNgua[])
      for (let p = 51; p <= 55; p++) {
        const [r, c] = oCua(m, p);
        o.push(<rect key={`v${m}${p}`} x={c} y={r} width={1} height={1} fill={MAU_HEX[m]} opacity={0.75} stroke="#b08a5a" strokeWidth={0.04} />);
      }
    // chuồng bốn góc
    GOC_CHUONG.forEach(([r, c], m) => {
      o.push(<rect key={`c${m}`} x={c} y={r} width={6} height={6} fill={MAU_HEX[m]} />);
      o.push(<rect key={`ct${m}`} x={c + 0.8} y={r + 0.8} width={4.4} height={4.4} rx={0.6} fill="#fbf3e2" />);
      for (let k = 0; k < 4; k++)
        o.push(<circle key={`cs${m}${k}`} cx={c + 2 + (k & 1) * 2} cy={r + 2 + (k >> 1) * 2} r={0.62} fill={MAU_HEX[m]} opacity={0.35} />);
    });
    // đích ở giữa: bốn tam giác
    const tg = [
      ["6,6 7.5,7.5 6,9", 0],
      ["6,6 7.5,7.5 9,6", 1],
      ["9,6 7.5,7.5 9,9", 2],
      ["6,9 7.5,7.5 9,9", 3],
    ] as const;
    tg.forEach(([pts, m]) => o.push(<polygon key={`t${m}`} points={pts} fill={MAU_HEX[m]} stroke="#7a5a3e" strokeWidth={0.05} />));
    o.push(
      <text key="dich" x={7.5} y={7.68} textAnchor="middle" fontSize={0.55} fontWeight={800} fill="#fff">
        Đích
      </text>
    );
    return (
      <svg className="ng-nen" viewBox="0 0 15 15" aria-hidden="true">
        <rect x={0} y={0} width={15} height={15} fill="#e9d2a6" />
        {o}
      </svg>
    );
  }, []);
}
