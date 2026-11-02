import { formatClock } from "@/lib/game";
import type { RoomSeat } from "@/lib/types";

/** Phòng Điện Tổ: mỗi bồ đoàn là một chỗ ngồi; chỗ có người hiện chữ cái đầu tên. */
export default function RoomGrid({
  capacity,
  seated,
  waiting,
  title = "Phòng tụng kinh",
}: {
  capacity: number;
  seated: RoomSeat[];
  waiting: number;
  title?: string;
}) {
  const shown = Math.min(Math.max(capacity, 1), 200);
  const initial = (name: string) => {
    const parts = name.trim().split(/\s+/);
    return (parts[parts.length - 1]?.[0] ?? "?").toUpperCase();
  };
  return (
    <section className="phong" aria-label={title}>
      <div className="phong-dau">
        <h3 style={{ margin: 0 }}>{title}</h3>
        <span className="muted small">
          {seated.length}/{capacity} chỗ
          {waiting > 0 ? `, ${waiting} người chờ ngoài sân` : ""}
        </span>
      </div>
      <div className="bo-doan">
        {Array.from({ length: shown }, (_, i) => {
          const s = seated[i];
          if (!s) return <span key={i} aria-hidden="true" />;
          return (
            <span
              key={i}
              className={s.me ? "la-con" : "co-nguoi"}
              title={`${s.name}: còn ${formatClock(s.remaining)}`}
              aria-label={`${s.me ? "Con" : s.name}, còn ${formatClock(s.remaining)}`}
            >
              {initial(s.name)}
            </span>
          );
        })}
      </div>
    </section>
  );
}
