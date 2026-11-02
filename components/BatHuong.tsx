/** Bát hương với số nén đang cháy; khói chỉ chuyển động khi người dùng không tắt hiệu ứng. */
export default function BatHuong({ sticks = 3, lit = true }: { sticks?: number; lit?: boolean }) {
  const n = Math.max(0, Math.min(sticks, 9));
  const xs = Array.from({ length: n }, (_, i) => 60 + (i - (n - 1) / 2) * 12);
  return (
    <svg viewBox="0 0 120 120" className="bat-huong" aria-hidden="true">
      {lit &&
        xs.map((x, i) => (
          <path
            key={`k${i}`}
            className={`khoi khoi-${i % 3}`}
            d={`M${x} 34 C${x - 8} 24 ${x + 8} 16 ${x} 6`}
            stroke="#C9C3B5"
            strokeWidth="2.4"
            fill="none"
            strokeLinecap="round"
          />
        ))}
      {xs.map((x, i) => (
        <g key={`n${i}`}>
          <line x1={x} y1="36" x2={x} y2="84" stroke="#B0442E" strokeWidth="2.6" strokeLinecap="round" />
          {lit && <circle cx={x} cy="35" r="2.4" fill="#FF9A3C" className="dom-lua" />}
        </g>
      ))}
      <path d="M18 80 L102 80 C100 102 84 112 60 112 C36 112 20 102 18 80 Z" fill="#B88A2E" stroke="#6E4F14" strokeWidth="2" />
      <rect x="14" y="76" width="92" height="7" rx="3" fill="#D9AE4E" stroke="#6E4F14" strokeWidth="1.5" />
      <path d="M44 96 L76 96" stroke="#6E4F14" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
