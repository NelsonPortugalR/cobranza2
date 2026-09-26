// Títulos en español → inglés para el público de EE. UU.
// No es traducción libre: reconoce la estructura habitual de las tiendas peruanas
// ("Suéter Clark De Baby Alpaca Color Celeste", "CASACA BOLSENA | VERDE") y traduce
// solo prenda, material y color. El nombre propio del modelo se conserva.

const GARMENTS: [RegExp, string][] = [
  [/^su[eé]ter(es)?$/i, "Sweater"],
  [/^chompas?$/i, "Sweater"],
  [/^troyer$/i, "Quarter-Zip Sweater"],
  [/^c[aá]rdigan(s)?$/i, "Cardigan"],
  [/^sacos?$/i, "Cardigan"],
  [/^sac[oó]n$/i, "Long Coat"],
  [/^casacas?$/i, "Jacket"],
  [/^chaquetas?$/i, "Jacket"],
  [/^abrigos?$/i, "Coat"],
  [/^chalecos?$/i, "Vest"],
  [/^chalinas?$/i, "Scarf"],
  [/^bufandas?$/i, "Scarf"],
  [/^cuelleras?$/i, "Neck Warmer"],
  [/^pa[nñ]uelos?$/i, "Scarf"],
  [/^chal(es)?$/i, "Shawl"],
  [/^estolas?$/i, "Wrap"],
  [/^ponchos?$/i, "Poncho"],
  [/^capas?$/i, "Cape"],
  [/^ruanas?$/i, "Ruana"],
  [/^gorros?$/i, "Beanie"],
  [/^chullos?$/i, "Chullo Hat"],
  [/^sombreros?$/i, "Hat"],
  [/^guantes$/i, "Gloves"],
  [/^mitones$/i, "Mittens"],
  [/^medias$/i, "Socks"],
  [/^calcetines$/i, "Socks"],
  [/^mantas?$/i, "Throw"],
  [/^frazadas?$/i, "Blanket"],
  [/^coj[ií]n(es)?$/i, "Pillow"],
  [/^faldas?$/i, "Skirt"],
  [/^vestidos?$/i, "Dress"],
  [/^carteras?$/i, "Handbag"],
  [/^bolsos?$/i, "Bag"],
  [/^ovillos?$/i, "Yarn"],
  [/^blusas?$/i, "Blouse"],
  [/^polos?$/i, "Top"],
];

const COLORS: Record<string, string> = {
  negro: "Black",
  negra: "Black",
  blanco: "White",
  blanca: "White",
  crudo: "Ecru",
  marfil: "Ivory",
  hueso: "Bone",
  beige: "Beige",
  arena: "Sand",
  avena: "Oatmeal",
  camel: "Camel",
  camello: "Camel",
  vicuna: "Vicuña",
  "vicuña": "Vicuña",
  marron: "Brown",
  "marrón": "Brown",
  cafe: "Brown",
  "café": "Brown",
  chocolate: "Chocolate",
  gris: "Gray",
  plomo: "Gray",
  perla: "Pearl",
  humo: "Smoke",
  acero: "Steel",
  carbon: "Charcoal",
  "carbón": "Charcoal",
  azul: "Blue",
  marino: "Navy",
  celeste: "Light Blue",
  turquesa: "Turquoise",
  verde: "Green",
  oliva: "Olive",
  musgo: "Moss",
  rojo: "Red",
  roja: "Red",
  guinda: "Burgundy",
  burdeo: "Burgundy",
  vino: "Wine",
  naranja: "Orange",
  terracota: "Terracotta",
  ladrillo: "Brick",
  coral: "Coral",
  rosado: "Pink",
  rosada: "Pink",
  rosa: "Pink",
  fucsia: "Fuchsia",
  lila: "Lilac",
  morado: "Purple",
  amarillo: "Yellow",
  mostaza: "Mustard",
  dorado: "Gold",
  claro: "Light",
  oscuro: "Dark",
  jaspeado: "Heather",
  multicolor: "Multicolor",
  natural: "Natural",
};

const MATERIALS: [RegExp, string][] = [
  [/\bbaby alpaca\b/i, "Baby Alpaca"],
  [/\broyal alpaca\b/i, "Royal Alpaca"],
  [/\bimperial alpaca\b/i, "Imperial Alpaca"],
  [/\bsuri\b/i, "Suri Alpaca"],
  [/\bvicu[nñ]a\b/i, "Vicuña"],
  [/\balpaca\b/i, "Alpaca"],
];

const titleCase = (s: string) =>
  s
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");

export function translateColor(raw: string): string {
  const words = raw.trim().toLowerCase().split(/\s+/);
  const out = words.map((w) => COLORS[w] ?? titleCase(w));
  // "Azul Marino" → "Navy"; "Gris Claro" → "Light Gray" (adjetivo delante en inglés).
  if (words[0] === "azul" && words[1] === "marino") return "Navy";
  if (out.length === 2 && ["Light", "Dark", "Heather"].includes(out[1])) return `${out[1]} ${out[0]}`;
  return out.join(" ");
}

/** Devuelve el título en inglés, o null si no parece un título en español con estructura reconocible. */
export function englishTitle(title: string): string | null {
  const [head, pipeColor] = title.split(/\s*\|\s*/);
  const words = head.trim().split(/\s+/);
  const garment = GARMENTS.find(([re]) => re.test(words[0]))?.[1];
  if (!garment) return null;

  const rest = words.slice(1).join(" ");
  const colorMatch = rest.match(/\bcolor\s+(.+)$/i);
  const colorRaw = pipeColor ?? colorMatch?.[1] ?? null;
  const beforeColor = colorMatch ? rest.slice(0, colorMatch.index).trim() : rest;
  let [namePart, materialPart] = beforeColor.split(/\s+de\s+/i);
  // Color al final sin "Color" ni "|": "Chompa Scarlet Azul Marino".
  let trailing: string | null = null;
  if (!colorRaw) {
    const nameWords = namePart.trim().split(/\s+/);
    let i = nameWords.length;
    while (i > 0 && COLORS[nameWords[i - 1].toLowerCase()]) i--;
    if (i < nameWords.length) {
      trailing = nameWords.slice(i).join(" ");
      namePart = nameWords.slice(0, i).join(" ");
    }
  }
  const material = materialPart ? MATERIALS.find(([re]) => re.test(materialPart))?.[1] : undefined;
  const name = titleCase(namePart.replace(/\bremate\b/i, "Outlet").trim());

  const parts = [name, material, garment].filter(Boolean).join(" ");
  const color = colorRaw ?? trailing;
  return color ? `${parts} — ${translateColor(color)}` : parts;
}
