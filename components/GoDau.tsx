"use client";

import { useEffect, useRef, useState } from "react";
import { goMo } from "@/lib/sound";
import { NhanVat } from "./CanhChua";
import OngTo from "./OngTo";

type Buoc = "bay" | "go" | "tung";

/**
 * Trả lời sai: Ông Tổ bay ra gõ đầu một cái, đệ tử tụng kinh 5 giây tại chỗ,
 * xong thì chuyển lên Điện Tổ tụng tiếp.
 */
export default function GoDau({
  gender,
  dapAn,
  hetGio = false,
  kinhTitle,
  kinh,
  phut,
  onDone,
}: {
  gender: "nam" | "nu" | null;
  dapAn: string;
  hetGio?: boolean;
  kinhTitle: string | null;
  kinh: string[];
  phut: number;
  onDone: () => void;
}) {
  const [buoc, setBuoc] = useState<Buoc>("bay");
  const [dem, setDem] = useState(5);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    const t1 = setTimeout(() => {
      setBuoc("go");
      goMo(0.9);
    }, 1000);
    const t2 = setTimeout(() => setBuoc("tung"), 1900);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  useEffect(() => {
    if (buoc !== "tung") return;
    if (dem <= 0) {
      done.current();
      return;
    }
    const id = setTimeout(() => {
      goMo(0.35);
      setDem((d) => d - 1);
    }, 1000);
    return () => clearTimeout(id);
  }, [buoc, dem]);

  const dong = kinh.length ? kinh[(5 - Math.max(dem, 1)) % kinh.length] : "Học kĩ bài, đọc kĩ đề, chọn đáp án cho chắc.";

  return (
    <div className={`go-dau is-${buoc}`} role="alertdialog" aria-modal="true" aria-labelledby="go-dau-tieu-de">
      <div className="go-dau-khung">
        <p id="go-dau-tieu-de" className="go-dau-tieu-de">
          {buoc === "tung" ? "Ngồi xuống tụng kinh 5 giây" : `${hetGio ? "Hết giờ!" : "Sai rồi!"} Đáp án đúng là ${dapAn}`}
        </p>

        <div className="go-dau-san" aria-hidden="true">
          <div className="go-dau-to">
            <OngTo mood={buoc === "tung" ? "hien" : "nghiem"} />
          </div>
          <div className="go-dau-thuoc" />
          <div className="go-dau-hs">
            <NhanVat gender={gender} u={buoc !== "bay"} />
          </div>
          <span className="go-dau-coc">Cốc!</span>
        </div>

        {buoc === "tung" ? (
          <div className="go-dau-kinh" aria-live="polite">
            {kinhTitle && <div className="go-dau-kinh-ten">{kinhTitle}</div>}
            <p>{dong}</p>
            <div className="go-dau-dem">{dem}</div>
          </div>
        ) : (
          <p className="go-dau-ghi">Ông Tổ gõ đầu nhắc con chú tâm.</p>
        )}
        <p className="go-dau-ghi">
          Xong sẽ tự lên Điện Tổ tụng tiếp {phut} phút.{" "}
          <button type="button" className="vao-chua-link" onClick={() => done.current()}>
            Lên ngay
          </button>
        </p>
      </div>
    </div>
  );
}
