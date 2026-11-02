import { TIER_NAMES } from "@/lib/game";

/**
 * Tràng hạt 100 hạt = 100 cấp. Mỗi chuỗi 25 hạt là một mức câu hỏi.
 * Hạt vàng: cấp đã qua; hạt son có viền: cấp hiện tại.
 */
export default function TrangHat({
  level,
  max = 100,
  perTier = 25,
}: {
  level: number;
  max?: number;
  perTier?: number;
}) {
  const rows = Math.max(1, Math.ceil(max / perTier));
  const gap = 12;
  const width = perTier * gap;

  return (
    <div className="trang-hat" role="img" aria-label={`Cấp ${level} trên ${max}`}>
      {Array.from({ length: rows }, (_, row) => {
        const start = row * perTier + 1;
        const end = Math.min(max, (row + 1) * perTier);
        const active = level >= start && level <= end;
        const done = level > end;
        return (
          <div key={row} className={`trang-hat-row${active ? " is-active" : ""}${done ? " is-done" : ""}`}>
            <div className="trang-hat-label">
              <span>{TIER_NAMES[row + 1] ?? `Mức ${row + 1}`}</span>
              <span className="trang-hat-range">
                {start}–{end}
              </span>
            </div>
            <svg viewBox={`0 0 ${width} 16`} className="trang-hat-svg" aria-hidden="true">
              <line x1={gap / 2} y1="8" x2={width - gap / 2} y2="8" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.2" />
              {Array.from({ length: end - start + 1 }, (_, i) => {
                const n = start + i;
                const cx = gap / 2 + i * gap;
                if (n < level) return <circle key={n} cx={cx} cy="8" r="4.6" className="hat hat-qua" />;
                if (n === level)
                  return (
                    <g key={n}>
                      <circle cx={cx} cy="8" r="6.6" className="hat-vong" />
                      <circle cx={cx} cy="8" r="4.6" className="hat hat-nay" />
                    </g>
                  );
                return <circle key={n} cx={cx} cy="8" r="4.2" className="hat hat-chua" />;
              })}
            </svg>
          </div>
        );
      })}
    </div>
  );
}
