type P = { className?: string };
const base = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export const IconChua = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...base}>
    <path d="M2 10 Q12 3 22 10" />
    <path d="M5 9.5 V20 H19 V9.5" />
    <path d="M10 20 V14 H14 V20" />
    <path d="M2 10 Q3 7.5 4.5 8" />
    <path d="M22 10 Q21 7.5 19.5 8" />
  </svg>
);

export const IconHuong = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...base}>
    <path d="M12 9 V18" />
    <path d="M8 10 V18" />
    <path d="M16 10 V18" />
    <path d="M4 18 H20 Q19 22 12 22 Q5 22 4 18 Z" />
    <path d="M12 6 Q10.5 4.5 12 3" />
  </svg>
);

export const IconBang = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...base}>
    <rect x="3" y="4" width="18" height="10" rx="1.5" />
    <path d="M7 14 V20" />
    <path d="M17 14 V20" />
    <path d="M8 9 H16" />
  </svg>
);

export const IconSo = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...base}>
    <path d="M4 5 Q8 3 12 5 V20 Q8 18 4 20 Z" />
    <path d="M20 5 Q16 3 12 5 V20 Q16 18 20 20 Z" />
  </svg>
);

export const IconNguoi = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...base}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21 Q5 14 12 14 Q19 14 20 21" />
  </svg>
);

export const IconCongDuc = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...base}>
    <circle cx="12" cy="12" r="8" />
    <rect x="9.5" y="9.5" width="5" height="5" />
  </svg>
);

export const IconAmThanh = ({ className, on }: P & { on: boolean }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...base}>
    <path d="M4 9 H8 L13 5 V19 L8 15 H4 Z" />
    {on ? <path d="M16 9 Q18 12 16 15 M18.5 7 Q22 12 18.5 17" /> : <path d="M16 9 L21 15 M21 9 L16 15" />}
  </svg>
);
