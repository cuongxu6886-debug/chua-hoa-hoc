"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { BAC, NHIEM_VU, bacCua, dangLam, ghiSuKien, type Bac, type SuKien, type TienDo } from "@/lib/nhiemVu";
import { chuong, docTo } from "@/lib/sound";

type NvCtx = {
  td: TienDo;
  bac: Bac;
  /** Báo đã làm một việc; nhiệm vụ nào đủ điều kiện thì tự hoàn thành */
  bao: (su: SuKien, so?: number) => void;
  moBang: () => void;
};

const Ctx = createContext<NvCtx | null>(null);
const RONG: TienDo = { diem: 0, dem: {}, xong: [] };

/** Dùng được cả ngoài AppShell (khi đó báo việc không làm gì) */
export function useNhiemVu(): NvCtx {
  return useContext(Ctx) ?? { td: RONG, bac: BAC[0], bao: () => undefined, moBang: () => undefined };
}

type Bao = { id: number; loai: "xong" | "bac" | "moi"; tieuDe: string; chu: string };

/** Giữ tiến độ nhiệm vụ trên máy này (theo tài khoản), hiện thông báo khi xong nhiệm vụ, lên bậc. */
export function NhiemVuProvider({ userId, children }: { userId: string; children: React.ReactNode }) {
  const KEY = `chua-nhiem-vu-${userId}`;
  const [td, setTd] = useState<TienDo>(RONG);
  const [bang, setBang] = useState(false);
  const [thongBao, setThongBao] = useState<Bao[]>([]);
  const tdRef = useRef(td);
  tdRef.current = td;
  const daNap = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const v = JSON.parse(raw) as TienDo;
        if (typeof v.diem === "number") setTd({ diem: v.diem, dem: v.dem ?? {}, xong: v.xong ?? [] });
      } else {
        // lần đầu: giới thiệu nhiệm vụ
        setTimeout(
          () =>
            day({
              loai: "moi",
              tieuDe: "Nhiệm vụ đầu tiên",
              chu: `${dangLam(RONG)
                .map((n) => n.ten)
                .join(" · ")}. Bấm nút Nhiệm vụ trên cùng để xem.`,
            }),
          4000
        );
      }
    } catch {
      /* bỏ qua */
    }
    daNap.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [KEY]);

  const luu = useCallback(
    (v: TienDo) => {
      try {
        localStorage.setItem(KEY, JSON.stringify(v));
      } catch {
        /* bỏ qua */
      }
    },
    [KEY]
  );

  const day = useCallback((b: Omit<Bao, "id">) => {
    const id = Date.now() + Math.random();
    setThongBao((ds) => [...ds, { ...b, id }].slice(-3));
    setTimeout(() => setThongBao((ds) => ds.filter((x) => x.id !== id)), b.loai === "bac" ? 9000 : 6000);
  }, []);

  const bao = useCallback(
    (su: SuKien, so = 1) => {
      const { td: moi, xongMoi, lenBac } = ghiSuKien(tdRef.current, su, so);
      tdRef.current = moi;
      setTd(moi);
      luu(moi);
      for (const n of xongMoi) {
        day({ loai: "xong", tieuDe: `Hoàn thành: ${n.ten}`, chu: `+${n.diem} điểm tu` });
        chuong(0.2);
      }
      if (lenBac) {
        day({ loai: "bac", tieuDe: `Lên Bậc ${lenBac.so}: ${lenBac.ten}!`, chu: `Mở khóa: ${lenBac.mo.join(" · ")}` });
        docTo(`Chúc mừng con đã lên bậc ${lenBac.so}, ${lenBac.ten}! Trò chơi và món ăn ngon hơn đã mở.`, 0.95);
        const tiep = dangLam(moi);
        if (tiep.length) setTimeout(() => day({ loai: "moi", tieuDe: "Nhiệm vụ mới", chu: tiep.map((n) => n.ten).join(" · ") }), 3500);
      } else if (xongMoi.length) {
        const tiep = dangLam(moi);
        if (tiep.length) setTimeout(() => day({ loai: "moi", tieuDe: "Việc cần làm tiếp", chu: tiep[0].ten }), 2500);
      }
    },
    [day, luu]
  );

  const bac = bacCua(td.diem);
  return (
    <Ctx.Provider value={{ td, bac, bao, moBang: () => setBang(true) }}>
      {children}
      <div className="nhv-thong-bao" aria-live="polite">
        {thongBao.map((b) => (
          <div key={b.id} className={`nhv-tb nhv-${b.loai}`} onClick={() => setBang(true)}>
            <b>{b.tieuDe}</b>
            <span>{b.chu}</span>
          </div>
        ))}
      </div>
      {bang && <BangNhiemVu td={td} onDong={() => setBang(false)} />}
    </Ctx.Provider>
  );
}

function BangNhiemVu({ td, onDong }: { td: TienDo; onDong: () => void }) {
  const bac = bacCua(td.diem);
  const sau = BAC.find((b) => b.so === bac.so + 1);
  const lam = dangLam(td);
  const phan = sau ? Math.min(100, Math.round(((td.diem - bac.tu) / (sau.tu - bac.tu)) * 100)) : 100;
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onDong();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onDong]);
  return (
    <div className="nhv-nen" role="dialog" aria-modal="true" aria-label="Nhiệm vụ" onClick={onDong}>
      <section className="nhv-bang" onClick={(e) => e.stopPropagation()}>
        <div className="nhv-dau">
          <div>
            <h2>
              Bậc {bac.so}: {bac.ten}
            </h2>
            <p className="small" style={{ margin: 0 }}>
              {td.diem} điểm tu{sau ? ` · còn ${sau.tu - td.diem} điểm nữa lên Bậc ${sau.so}: ${sau.ten}` : " · bậc cao nhất"}
            </p>
          </div>
          <button type="button" className="nut nut-nho nut-vang" onClick={onDong}>
            Đóng
          </button>
        </div>
        <div className="nhv-thanh" aria-hidden="true">
          <i style={{ width: `${phan}%` }} />
        </div>

        <h3>Việc cần làm</h3>
        {lam.length ? (
          <ul className="nhv-ds">
            {lam.map((n) => {
              const co = Math.min(n.can, td.dem[n.su] ?? 0);
              return (
                <li key={n.id}>
                  <span className="nhv-ten">{n.ten}</span>
                  <span className="nhv-so">
                    {co}/{n.can} · +{n.diem}
                  </span>
                  <span className="nhv-tien" aria-hidden="true">
                    <i style={{ width: `${(co / n.can) * 100}%` }} />
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="small">Con đã làm hết nhiệm vụ của bậc này. Học thêm để mở bậc mới nhé!</p>
        )}

        {sau && (
          <>
            <h3>Lên Bậc {sau.so} sẽ mở</h3>
            <ul className="nhv-mo">
              {sau.mo.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </>
        )}

        <h3>Đã làm được</h3>
        {td.xong.length ? (
          <ul className="nhv-xong">
            {NHIEM_VU.filter((n) => td.xong.includes(n.id)).map((n) => (
              <li key={n.id}>
                {n.ten} <b>+{n.diem}</b>
              </li>
            ))}
          </ul>
        ) : (
          <p className="small muted">Chưa có. Làm việc đầu tiên ở trên nhé!</p>
        )}

        <h3>Các bậc</h3>
        <ol className="nhv-cac-bac">
          {BAC.map((b) => (
            <li key={b.so} className={b.so <= bac.so ? "is-dat" : undefined}>
              <b>
                Bậc {b.so}: {b.ten}
              </b>{" "}
              <span className="small">({b.tu} điểm)</span>
              <div className="small">{b.mo.join(" · ")}</div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
