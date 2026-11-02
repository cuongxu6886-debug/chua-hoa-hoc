type Mood = "hien" | "nghiem" | "vui";

/**
 * Ông Tổ nghề Hóa: ông đồ khăn xếp, áo the xanh màu bảng phấn,
 * vầng hào quang hình vòng benzene, tay cầm bình tam giác,
 * trước ngực gắn logo "Tôi yêu Hóa học".
 */
export default function OngTo({
  mood = "hien",
  className,
  title = "Ông Tổ nghề Hóa",
}: {
  mood?: Mood;
  className?: string;
  title?: string;
}) {
  const hex = Array.from({ length: 6 }, (_, k) => {
    const a = ((-90 + 60 * k) * Math.PI) / 180;
    return `${(150 + 74 * Math.cos(a)).toFixed(1)},${(106 + 74 * Math.sin(a)).toFixed(1)}`;
  }).join(" ");

  const brows =
    mood === "nghiem"
      ? { l: "M116 100 Q128 92 143 100", r: "M157 100 Q172 92 184 100", lt: "M116 100 Q109 104 106 112", rt: "M184 100 Q191 104 194 112" }
      : { l: "M117 97 Q129 89 142 96", r: "M158 96 Q171 89 183 97", lt: "M117 97 Q108 102 105 112", rt: "M183 97 Q192 102 195 112" };

  const eyes =
    mood === "vui"
      ? ["M124 110 Q131 103 138 110", "M162 110 Q169 103 176 110"]
      : mood === "nghiem"
        ? ["M124 109 L138 109", "M162 109 L176 109"]
        : ["M124 108 Q131 113 138 108", "M162 108 Q169 113 176 108"];

  const mouth = mood === "nghiem" ? "M144 144 L156 144" : mood === "vui" ? "M141 141 Q150 150 159 141" : "M143 142 Q150 147 157 142";

  return (
    <svg
      viewBox="0 0 300 340"
      className={className}
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      <defs>
        <clipPath id="ongto-logo-clip">
          <rect x="121" y="225" width="58" height="58" rx="2" />
        </clipPath>
        <linearGradient id="ongto-ao" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#25584A" />
          <stop offset="1" stopColor="#173B31" />
        </linearGradient>
      </defs>

      {/* Hào quang vòng benzene */}
      <g className="ongto-halo" fill="none" stroke="#D9AE4E">
        <polygon points={hex} strokeWidth="3" strokeLinejoin="round" />
        <circle cx="150" cy="106" r="50" strokeWidth="2" strokeDasharray="5 6" opacity="0.75" />
      </g>

      {/* Thân áo the */}
      <path
        d="M150 156 C118 158 90 170 78 196 L44 340 L256 340 L222 196 C210 170 182 158 150 156 Z"
        fill="url(#ongto-ao)"
      />
      {/* Tay áo trái buông */}
      <path d="M80 198 C62 236 54 280 58 322 L92 322 C90 288 92 250 100 220 Z" fill="#1B463A" />
      <ellipse cx="75" cy="322" rx="18" ry="7" fill="#123128" />
      {/* Đường cài khuy chéo của áo */}
      <path d="M163 168 Q186 178 206 200" stroke="#D9AE4E" strokeWidth="2" fill="none" strokeDasharray="1 7" strokeLinecap="round" />
      {/* Cổ đứng */}
      <rect x="130" y="150" width="40" height="16" rx="4" fill="#123128" stroke="#D9AE4E" strokeWidth="1.5" />

      {/* Cổ, tai, mặt */}
      <rect x="139" y="140" width="22" height="14" fill="#E9BE97" />
      <ellipse cx="110" cy="114" rx="7" ry="11" fill="#E9BE97" stroke="#5A3A26" strokeWidth="1.5" />
      <ellipse cx="190" cy="114" rx="7" ry="11" fill="#E9BE97" stroke="#5A3A26" strokeWidth="1.5" />
      <ellipse cx="150" cy="108" rx="40" ry="45" fill="#F0CBA6" stroke="#5A3A26" strokeWidth="2" />

      {/* Khăn xếp */}
      <path d="M108 96 C106 60 194 60 192 96 C176 86 124 86 108 96 Z" fill="#1E1A17" />
      <path d="M112 84 C130 74 170 74 188 84" stroke="#3B342E" strokeWidth="3" fill="none" />
      <path d="M116 75 C134 66 166 66 184 75" stroke="#3B342E" strokeWidth="3" fill="none" />
      <path d="M108 96 C124 86 176 86 192 96" stroke="#3B342E" strokeWidth="2" fill="none" />

      {/* Lông mày bạc dài */}
      <g stroke="#F6F2E8" strokeWidth="5" strokeLinecap="round" fill="none">
        <path d={brows.l} />
        <path d={brows.r} />
        <path d={brows.lt} strokeWidth="3.5" />
        <path d={brows.rt} strokeWidth="3.5" />
      </g>

      {/* Mắt, mũi */}
      <g stroke="#3B2A1E" strokeWidth="2.6" strokeLinecap="round" fill="none">
        <path d={eyes[0]} />
        <path d={eyes[1]} />
        <path d="M150 113 Q145 125 152 127" strokeWidth="2" />
      </g>
      {mood === "vui" && (
        <g fill="#E79B86" opacity="0.6">
          <ellipse cx="124" cy="124" rx="7" ry="4" />
          <ellipse cx="176" cy="124" rx="7" ry="4" />
        </g>
      )}

      {/* Râu */}
      <path
        d="M127 138 C125 166 138 194 150 214 C162 194 175 166 173 138 C164 150 136 150 127 138 Z"
        fill="#F6F2E8"
        stroke="#D8D1C1"
        strokeWidth="1.5"
      />
      <path
        d="M150 132 C138 129 125 135 116 147 C131 140 141 140 150 138 C159 140 169 140 184 147 C175 135 162 129 150 132 Z"
        fill="#F6F2E8"
        stroke="#D8D1C1"
        strokeWidth="1"
      />
      <path d={mouth} stroke="#7A3B2A" strokeWidth="2.4" strokeLinecap="round" fill="none" />

      {/* Logo trước ngực */}
      <rect x="116" y="220" width="68" height="68" rx="4" fill="#EFE8D6" stroke="#D9AE4E" strokeWidth="2" />
      <image
        href="/logo-toi-yeu-hoa-hoc.jpg"
        x="121"
        y="225"
        width="58"
        height="58"
        preserveAspectRatio="xMidYMid slice"
        clipPath="url(#ongto-logo-clip)"
      />

      {/* Tay phải cầm bình tam giác */}
      <path d="M220 198 C238 230 246 262 240 296 L212 300 C214 270 210 240 204 220 Z" fill="#1B463A" />
      <g>
        <path d="M232 230 L232 250 L218 290 Q217 296 223 296 L257 296 Q263 296 262 290 L248 250 L248 230 Z" fill="#F3F7F5" fillOpacity="0.85" stroke="#2A1B12" strokeWidth="2" strokeLinejoin="round" />
        <path d="M224 278 L256 278 L261 290 Q262 294 257 294 L223 294 Q218 294 219 290 Z" fill="#5DAE84" />
        <circle cx="236" cy="270" r="3" fill="#5DAE84" className="ongto-bubble" />
        <circle cx="244" cy="262" r="2.2" fill="#5DAE84" className="ongto-bubble ongto-bubble-2" />
        <rect x="229" y="225" width="22" height="6" rx="2" fill="#2A1B12" />
      </g>
      <ellipse cx="226" cy="296" rx="12" ry="9" fill="#E9BE97" stroke="#5A3A26" strokeWidth="1.5" />
    </svg>
  );
}
