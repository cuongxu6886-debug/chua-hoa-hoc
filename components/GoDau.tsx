"use client";

import { useEffect, useRef, useState } from "react";
import { goMo } from "@/lib/sound";
import { NhanVat } from "./CanhChua";
import OngTo from "./OngTo";

type Buoc = "bay" | "go" | "xong";

/**
 * Trả lời sai: Ông Tổ bay ra gõ đầu một cái, cho xem đáp án đúng,
 * rồi đệ tử tự đi lên trước bàn thờ vái Tổ và tụng kinh.
 */
export default function GoDau({
  gender,
  dapAn,
  hetGio = false,
  giaiThich,
  phut,
  onDone,
}: {
  gender: "nam" | "nu" | null;
  dapAn: string;
  hetGio?: boolean;
  giaiThich: string | null;
  phut: number;
  onDone: () => void;
}) {
  const [buoc, setBuoc] = useState<Buoc>("bay");
  const [dem, setDem] = useState(giaiThich ? 7 : 4);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    const t1 = setTimeout(() => {
      setBuoc("go");
      goMo(0.9);
    }, 1000);
    const t2 = setTimeout(() => setBuoc("xong"), 1900);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  useEffect(() => {
    if (buoc !== "xong") return;
    if (dem <= 0) {
      done.current();
      return;
    }
    const id = setTimeout(() => setDem((d) => d - 1), 1000);
    return () => clearTimeout(id);
  }, [buoc, dem]);

  return (
    <div className={`go-dau is-${buoc === "xong" ? "tung" : buoc}`} role="alertdialog" aria-modal="true" aria-labelledby="go-dau-tieu-de">
      <div className="go-dau-khung">
        <p id="go-dau-tieu-de" className="go-dau-tieu-de">
          {hetGio ? "Hết giờ!" : "Sai rồi!"} Đáp án đúng là {dapAn}
        </p>

        <div className="go-dau-san" aria-hidden="true">
          <div className="go-dau-to">
            <OngTo mood={buoc === "xong" ? "hien" : "nghiem"} />
          </div>
          <div className="go-dau-thuoc" />
          <div className="go-dau-hs">
            <NhanVat gender={gender} u={buoc !== "bay"} />
          </div>
          <span className="go-dau-coc">Cốc!</span>
        </div>

        {buoc === "xong" && giaiThich ? (
          <div className="go-dau-kinh">
            <p>{giaiThich}</p>
          </div>
        ) : (
          <p className="go-dau-ghi">Ông Tổ gõ đầu nhắc con chú tâm.</p>
        )}
        <p className="go-dau-ghi">
          Giờ con lên trước Ông Tổ vái ba vái, tụng kinh {phut} phút.
        </p>
        <button type="button" className="nut nut-vang" style={{ marginTop: 10 }} onClick={() => done.current()}>
          {buoc === "xong" ? `Lên vái Tổ (${dem})` : "Lên vái Tổ"}
        </button>
      </div>
    </div>
  );
}
