import type { ProductType } from "@/lib/types.ts";

// Placeholder visual mientras no tengamos fotos: textura de punto jersey en el
// color real del producto + silueta de la prenda. En producción se reemplaza por
// la foto original de la tienda (con enlace y crédito).

const SILHOUETTES: Record<ProductType, string> = {
  chompa: "M34 22 L44 17 Q50 23 56 17 L66 22 L84 42 L77 49 L68 41 L68 84 L32 84 L32 41 L23 49 L16 42 Z",
  cardigan: "M34 22 L44 17 L50 30 L56 17 L66 22 L84 42 L77 49 L68 41 L68 84 L32 84 L32 41 L23 49 L16 42 Z M50 30 L50 84",
  chal: "M14 34 L86 34 L86 64 L14 64 Z M18 64 L18 74 M26 64 L26 74 M34 64 L34 74 M42 64 L42 74 M50 64 L50 74 M58 64 L58 74 M66 64 L66 74 M74 64 L74 74 M82 64 L82 74",
  poncho: "M50 20 L88 54 L70 82 L30 82 L12 54 Z M44 25 Q50 32 56 25",
  gorro: "M28 68 Q28 28 50 28 Q72 28 72 68 Z M26 62 L74 62 L74 72 L26 72 Z M50 28 m-6 -6 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0 M30 72 L30 84 M70 72 L70 84",
  bufanda: "M40 12 L58 12 L58 82 L40 82 Z M42 82 L42 90 M47 82 L47 90 M52 82 L52 90 M56 82 L56 90",
  guantes: "M36 84 L36 40 Q36 26 50 26 Q64 26 64 40 L64 84 Z M36 52 Q24 48 26 38 Q30 32 36 40",
  fibra: "M50 50 m-26 0 a26 26 0 1 0 52 0 a26 26 0 1 0 -52 0 M28 38 Q50 56 72 38 M26 52 Q50 70 74 52 M32 68 Q50 78 68 68 M34 30 Q50 44 66 30",
  abrigo: "M34 20 L44 16 L50 26 L56 16 L66 20 L82 40 L76 90 L68 90 L68 44 L64 90 L36 90 L32 44 L32 90 L24 90 L18 40 Z M50 26 L50 90",
  chaleco: "M36 18 L44 18 Q50 34 56 18 L64 18 Q66 34 72 40 L72 84 L28 84 L28 40 Q34 34 36 18 Z",
  medias: "M40 14 L56 14 L56 62 Q56 70 64 74 L72 78 Q78 84 70 88 L48 88 Q40 88 40 78 Z",
  otro: "M30 20 L70 20 L78 84 L22 84 Z",
  home: "M18 30 L82 30 L82 74 L18 74 Z M18 44 L82 44 M18 58 L82 58 M30 74 L30 80 M70 74 L70 80",
};

function isDark(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b < 140;
}

export function Swatch({
  hex,
  type,
  className = "",
  id,
}: {
  hex: string;
  type: ProductType;
  className?: string;
  id: string;
}) {
  const ink = isDark(hex) ? "rgba(255,255,255," : "rgba(42,38,34,";
  const pid = `knit-${id}`;
  return (
    <svg viewBox="0 0 400 500" className={className} role="img" aria-label={`Muestra de color ${type}`}>
      <defs>
        <pattern id={pid} width="14" height="12" patternUnits="userSpaceOnUse">
          <path d="M0 0 L7 10 M14 0 L7 10" stroke={`${ink}0.10)`} strokeWidth="3" fill="none" strokeLinecap="round" />
        </pattern>
        <radialGradient id={`${pid}-light`} cx="30%" cy="20%" r="90%">
          <stop offset="0" stopColor="#fff" stopOpacity="0.22" />
          <stop offset="1" stopColor="#000" stopOpacity="0.12" />
        </radialGradient>
      </defs>
      <rect width="400" height="500" fill={hex} />
      <rect width="400" height="500" fill={`url(#${pid})`} />
      <rect width="400" height="500" fill={`url(#${pid}-light)`} />
      <g transform="translate(90 140) scale(2.2)">
        <path d={SILHOUETTES[type]} fill="none" stroke={`${ink}0.35)`} strokeWidth="0.9" strokeLinejoin="round" />
      </g>
    </svg>
  );
}
