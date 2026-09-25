// Guías editoriales (en inglés). Contenido propio para Google y asistentes de IA:
// respuestas claras, tablas y preguntas frecuentes. Los enlaces usan la sintaxis
// [texto](/ruta) y se renderizan como enlaces internos.
// Regla: solo afirmaciones verificables o formuladas con prudencia ("typically", "often").

export interface GuideSection {
  heading: string;
  paragraphs: string[];
  table?: { head: string[]; rows: string[][]; caption?: string };
  bullets?: string[];
}

export interface Guide {
  slug: string;
  title: string;
  description: string;
  /** Respuesta corta al inicio: es lo que suelen citar Google (fragmento destacado) y las IA. */
  summary: string;
  updated: string;
  sections: GuideSection[];
  faq: { q: string; a: string }[];
  related: string[];
}

export const GUIDES: Guide[] = [
  {
    slug: "alpaca-fiber-grades-explained",
    title: "Alpaca Fiber Grades Explained: Royal, Baby and Superfine",
    description:
      "What “baby alpaca”, “royal alpaca” and “superfine” actually mean, how Peru grades alpaca fiber by micron, and which grade to choose for sweaters, scarves and accessories.",
    summary:
      "Alpaca is graded by fiber diameter, measured in microns (µm): the lower the number, the softer the fiber. “Baby alpaca” does not come from baby animals; under Peru's technical standard NTP 231.301 it is fiber of about 23 microns or finer. “Royal alpaca” is a commercial name brands use for their finest selection, typically around 19 microns or less.",
    updated: "2026-09-25",
    sections: [
      {
        heading: "Why microns matter",
        paragraphs: [
          "A micron is one thousandth of a millimeter. Finer fibers bend more easily against the skin, which is why they feel softer and less prickly. Coarser fibers, roughly above 30 microns, are the ones most people associate with an itchy sweater.",
          "Alpaca also contains no lanolin, the wax found in sheep's wool, which is one reason many people who find wool uncomfortable are happy wearing alpaca.",
        ],
      },
      {
        heading: "Peru's official alpaca fiber classes",
        paragraphs: [
          "Peru, home to most of the world's alpacas, classifies alpaca fiber by average diameter under its technical standard NTP 231.301. The classes below are the reference most Peruvian mills work with.",
        ],
        table: {
          caption: "Alpaca fiber classes by average diameter (NTP 231.301)",
          head: ["Class", "Average diameter", "Typical use"],
          rows: [
            ["Alpaca Baby", "≤ 23 µm", "Sweaters, scarves, anything worn next to the skin"],
            ["Alpaca Fleece", "23.1 – 26.5 µm", "Outer layers, blankets, heavier knits"],
            ["Alpaca Medium Fleece", "26.6 – 29 µm", "Throws, outerwear"],
            ["Alpaca Huarizo", "29.1 – 31.5 µm", "Rugs, sturdy textiles"],
            ["Alpaca Gruesa (coarse)", "> 31.5 µm", "Industrial and home textiles"],
          ],
        },
      },
      {
        heading: "Commercial names: royal, superfine, super baby",
        paragraphs: [
          "Brands also use their own names for their best lots. **Royal alpaca** is usually the finest, often described as around 19 microns or less; **super baby** or **superfine** typically sits around 20 microns. These are marketing grades, not official classes, so each brand defines them slightly differently.",
          "On this site we show the grade exactly as each store states it, and we never invent a micron count a store hasn't published. You can browse [royal alpaca](/royal-alpaca) or [baby alpaca](/baby-alpaca) pieces across brands.",
        ],
      },
      {
        heading: "Which grade should you buy?",
        paragraphs: [],
        bullets: [
          "**Next to the skin** (sweaters, scarves, turtlenecks): baby alpaca or finer. See [baby alpaca sweaters](/baby-alpaca-sweaters).",
          "**Maximum softness or a special gift**: royal alpaca, usually the priciest grade.",
          "**Outer layers and throws**: blends and fleece-grade alpaca are warm, durable and better value.",
          "**Blends**: silk adds sheen and drape, wool adds structure, nylon adds durability (common in socks).",
        ],
      },
    ],
    faq: [
      {
        q: "Is baby alpaca made from baby alpacas?",
        a: "No. “Baby alpaca” is a fiber grade, not the age of the animal. It refers to fiber of about 23 microns or finer, selected from adult alpacas.",
      },
      {
        q: "What is the difference between royal alpaca and baby alpaca?",
        a: "Both are fine grades, but royal alpaca is the finer, rarer selection (typically around 19 microns or less), while baby alpaca goes up to about 23 microns. Royal alpaca usually costs more.",
      },
      {
        q: "Is alpaca itchy?",
        a: "Fine alpaca grades such as baby and royal are generally not itchy for most people. Itchiness is mostly caused by coarse fibers (above roughly 30 microns), and alpaca contains no lanolin.",
      },
    ],
    related: ["baby-alpaca", "royal-alpaca", "baby-alpaca-sweaters", "alpaca-scarves"],
  },
  {
    slug: "alpaca-vs-cashmere-vs-merino",
    title: "Alpaca vs. Cashmere vs. Merino Wool: Which Is Best?",
    description:
      "An honest comparison of alpaca, cashmere and merino wool: softness, warmth, durability, itch and price, to help you choose your next sweater.",
    summary:
      "Fine alpaca is comparable in softness to cashmere and merino, tends to be warmer for its weight, contains no lanolin and often pills less than cashmere. Cashmere is usually the softest and most expensive; merino is the most versatile and easiest to care for. The best choice depends on how you'll wear it.",
    updated: "2026-09-25",
    sections: [
      {
        heading: "At a glance",
        paragraphs: [],
        table: {
          head: ["", "Alpaca (baby / royal)", "Cashmere", "Merino wool"],
          rows: [
            ["Typical fineness", "≈ 19–23 µm", "≤ 19 µm (US labeling rule)", "≈ 15–24 µm"],
            ["Lanolin", "None", "Very little", "Yes (removed in processing, traces may remain)"],
            ["Feel", "Soft, smooth, slightly silky", "Very soft, fuzzy halo", "Soft, springy"],
            ["Warmth for weight", "High", "High", "Medium–high"],
            ["Pilling", "Usually low to moderate", "Moderate to high", "Moderate"],
            ["Care", "Hand wash, dry flat", "Hand wash, dry flat", "Often machine washable"],
          ],
        },
      },
      {
        heading: "When to choose alpaca",
        paragraphs: [
          "Choose alpaca if you want a warm, light sweater with a smooth hand and a natural sheen, or if lanolin in wool bothers you. Peruvian brands offer a wide range, from everyday [alpaca sweaters](/alpaca-sweaters) to [royal alpaca](/royal-alpaca) pieces that rival cashmere.",
        ],
      },
      {
        heading: "When to choose cashmere or merino",
        paragraphs: [
          "Cashmere is hard to beat for pure softness and a fuzzy, cozy look, but it usually costs more and tends to pill. Merino is the practical choice for activewear and base layers, and many merino garments tolerate a gentle machine wash.",
        ],
      },
    ],
    faq: [
      {
        q: "Is alpaca warmer than cashmere?",
        a: "Alpaca is often described as warmer for its weight because many alpaca fibers are partly hollow, which traps air. In practice, knit thickness matters as much as the fiber.",
      },
      {
        q: "Is alpaca more durable than cashmere?",
        a: "Alpaca fibers are generally longer and stronger than cashmere, so alpaca knits often pill less and keep their shape well with proper care.",
      },
      {
        q: "Is alpaca good for people with wool allergies?",
        a: "Alpaca contains no lanolin, and many people who react to sheep's wool find alpaca comfortable. If you have a diagnosed allergy, check with your doctor.",
      },
    ],
    related: ["alpaca-sweaters", "royal-alpaca", "alpaca-cardigans", "alpaca-scarves"],
  },
  {
    slug: "how-to-care-for-alpaca",
    title: "How to Wash and Care for Alpaca Sweaters",
    description:
      "Step-by-step care for alpaca sweaters, scarves and throws: hand washing, drying flat, removing pills, storing and protecting from moths.",
    summary:
      "Hand wash alpaca in cool water with a gentle wool detergent, press out water without wringing, roll it in a towel and dry it flat away from heat. Store it folded, never on a hanger, with cedar or lavender to keep moths away. Always check the care label first.",
    updated: "2026-09-25",
    sections: [
      {
        heading: "Washing, step by step",
        paragraphs: [],
        bullets: [
          "Check the care label: some pieces, especially blends and structured coats, are dry clean only.",
          "Fill a basin with cool or lukewarm water and a small amount of wool or gentle detergent.",
          "Submerge the garment and swirl gently for a few minutes. Don't rub or twist.",
          "Rinse in water of the same temperature; sudden temperature changes can felt the fibers.",
          "Press the water out, then roll the piece in a dry towel to absorb more.",
          "Reshape and dry flat, away from direct sun and radiators.",
        ],
      },
      {
        heading: "Pilling, storage and moths",
        paragraphs: [
          "Light pilling in friction areas is normal; remove it with a sweater comb or fabric shaver. Store alpaca folded, since hanging can stretch shoulders, and keep it clean before storing, because moths are attracted to body oils and food traces. Cedar blocks or lavender sachets help.",
        ],
      },
    ],
    faq: [
      {
        q: "Can you put alpaca in the washing machine?",
        a: "Only if the label allows it, on a wool or hand-wash cycle with cold water and low spin. Hand washing is the safest option.",
      },
      {
        q: "How often should you wash an alpaca sweater?",
        a: "Not often. Alpaca resists odors, so airing it out between wears is usually enough; wash it a few times per season or when it's visibly soiled.",
      },
    ],
    related: ["alpaca-sweaters", "alpaca-throws-and-blankets", "alpaca-accessories"],
  },
  {
    slug: "how-to-buy-alpaca-online",
    title: "How to Buy Authentic Alpaca Online: Reading the Label",
    description:
      "What fiber content, “alpaca blend”, “baby alpaca” and “made in Peru” mean on a product page, and the details worth checking before you buy alpaca online.",
    summary:
      "Check three things: the fiber content (percent of alpaca and what it's blended with), the grade (baby or royal alpaca for next-to-skin pieces) and whether your size is actually in stock. “Alpaca blend” can mean anything from 20% to 90% alpaca, so the percentage matters more than the name.",
    updated: "2026-09-25",
    sections: [
      {
        heading: "Fiber content first",
        paragraphs: [
          "A piece labeled “alpaca” may be a blend. Look for the exact percentages, such as “70% baby alpaca, 30% silk”. We show the fiber content exactly as each store publishes it, and when a store doesn't give percentages we say so. Browse only [100% alpaca sweaters](/100-percent-alpaca-sweaters) if you want pure alpaca.",
        ],
      },
      {
        heading: "Common blends and why they're used",
        paragraphs: [],
        bullets: [
          "**Alpaca + silk**: more sheen and drape, common in wraps and scarves.",
          "**Alpaca + wool or merino**: more structure and bounce, common in coats and heavier knits.",
          "**Alpaca + nylon**: durability, common in socks and gloves.",
          "**Alpaca + cotton**: lighter, for transitional seasons.",
        ],
      },
      {
        heading: "Sizes, prices and shipping",
        paragraphs: [
          "Peruvian brands often sell in soles; we convert to US dollars at the official exchange rate of the day and keep the original price for reference. Your card issuer may use a slightly different rate. Shipping and import duties vary by store: some ship from the US, others from Peru with duties included. Each product page shows the store's published shipping policy.",
        ],
      },
    ],
    faq: [
      {
        q: "How can I tell if alpaca is real?",
        a: "Buy from established makers that publish the fiber content, and look for exact percentages. Very low prices for “100% baby alpaca” are a warning sign.",
      },
      {
        q: "What does “alpaca blend” mean?",
        a: "It means alpaca is mixed with another fiber. The alpaca share can vary widely, so always check the percentage on the label.",
      },
    ],
    related: ["100-percent-alpaca-sweaters", "baby-alpaca", "alpaca-on-sale"],
  },
];

export const getGuide = (slug: string) => GUIDES.find((g) => g.slug === slug);
