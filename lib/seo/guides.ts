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
      "Will it itch? What “baby alpaca”, “royal alpaca” and “superfine” mean, Peru's official fiber classes (NTP 231.301:2022) and which grade to choose.",
    summary:
      "Whether alpaca itches depends on how fine the fiber is, measured in microns (µm): the lower the number, the softer it feels. “Baby alpaca” is a fiber grade, not fiber from baby animals: it is Peru's 20.1–23 micron class, officially renamed “Extrafina” in 2022. “Royal alpaca” is a brand name for a store's finest lots, not an official class.",
    updated: "2026-09-26",
    sections: [
      {
        heading: "Will it itch? Microns explain it",
        paragraphs: [
          "A micron is one thousandth of a millimeter. Thin fibers bend when they touch your skin, so they feel soft. Thick fibers push back, and that is what feels prickly.",
          "Most people find fibers finer than about 23 microns comfortable next to the skin. Alpaca also has no lanolin, the wax in sheep's wool that some people react to.",
        ],
      },
      {
        heading: "Peru's official alpaca fiber classes",
        paragraphs: [
          "Peru grades sorted alpaca fiber by average diameter under the technical standard NTP 231.301. The 2022 version renamed the classes and added an ultrafine class. Stores still use the 2014 names, like “baby” and “super baby”.",
          "Source: [NTP 231.301:2022, INACAL technical committee CTN 055](https://reglamentostecnicos.mincetur.gob.pe/informacion_general/eventos/diciembre_2024/06_Requisitos_calidad_fibra_alpaca.pdf), checked September 26, 2026.",
        ],
        table: {
          caption: "Alpaca fiber classes by average diameter (NTP 231.301:2022, with the 2014 names)",
          head: ["Class (2022)", "Average diameter", "Name in 2014", "Typical use"],
          rows: [
            ["Ultrafina", "≤ 18 µm", "—", "The finest knits"],
            ["Superfina", "18.1 – 20 µm", "Super Baby", "Next-to-skin knits"],
            ["Extrafina", "20.1 – 23 µm", "Baby", "Sweaters, scarves, anything worn next to the skin"],
            ["Fina", "23.1 – 26.5 µm", "Fleece", "Outer layers, blankets, heavier knits"],
            ["Semifina", "26.6 – 29 µm", "Medium Fleece", "Throws, outerwear"],
            ["Semigruesa", "29.1 – 31.5 µm", "Huarizo", "Rugs, sturdy textiles"],
            ["Gruesa", "> 31.5 µm", "Gruesa", "Industrial and home textiles"],
          ],
        },
      },
      {
        heading: "Brand names: royal and imperial",
        paragraphs: [
          "**Royal alpaca** and **imperial alpaca** are names stores give to their finest lots. They are not official classes, so each store decides what they mean. Several stores describe royal alpaca as under 19 microns.",
          "**Super baby** and **baby** are the 2014 official names. Today they are called Superfina and Extrafina.",
          "We show the grade exactly as each store names it, and we never add a micron count a store hasn't published. Browse [royal alpaca](/royal-alpaca) or [baby alpaca](/baby-alpaca) across brands.",
        ],
      },
      {
        heading: "Which grade should you buy?",
        paragraphs: [],
        bullets: [
          "**Next to the skin** (sweaters, scarves, turtlenecks): baby alpaca or finer. See [baby alpaca sweaters](/baby-alpaca-sweaters).",
          "**Maximum softness or a special gift**: royal alpaca, usually the priciest grade.",
          "**Outer layers and throws**: blends and coarser grades are warm, durable and better value.",
          "**Check the percentage too**: a “baby alpaca” sweater with 37% alpaca is mostly other fibers. Cards on this site show the alpaca share next to the grade.",
        ],
      },
    ],
    faq: [
      {
        q: "Is baby alpaca made from baby alpacas?",
        a: "No. “Baby alpaca” is a fiber grade, not the age of the animal. It is fiber of 20.1 to 23 microns, sorted from adult alpacas. Since 2022, Peru's standard calls this class “Extrafina”.",
      },
      {
        q: "What is the difference between royal alpaca and baby alpaca?",
        a: "Baby alpaca is an official class (20.1–23 microns). Royal alpaca is a brand name for a store's finest lots; several stores describe it as under 19 microns. Royal alpaca usually costs more.",
      },
      {
        q: "Is alpaca itchy?",
        a: "Fine grades such as baby and royal are usually not itchy for most people. Itch comes mostly from coarse fibers, above roughly 30 microns. Alpaca also has no lanolin. Check the percentage as well: a blend can include coarser fibers.",
      },
      {
        q: "Is super baby alpaca an official grade?",
        a: "It was: NTP 231.301:2014 named the 18.1–20 micron class “Super Baby”. The 2022 version calls it “Superfina”.",
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
    updated: "2026-09-26",
    sections: [
      {
        heading: "Fiber content first",
        paragraphs: [
          "Is it really alpaca, or a blend? Look for exact percentages, such as “70% baby alpaca, 30% silk”. A piece called “baby alpaca” can still be mostly other fibers.",
          "We show the fiber content exactly as each store publishes it. When a store gives no percentages, or only part of them, we say so. Browse [100% alpaca sweaters](/100-percent-alpaca-sweaters), or use the **No synthetics** filter to skip acrylic and polyester.",
        ],
      },
      {
        heading: "Common blends and why they're used",
        paragraphs: [],
        bullets: [
          "**Alpaca + silk**: more sheen and drape, common in wraps and scarves.",
          "**Alpaca + wool or merino**: more structure and bounce, common in coats and heavier knits.",
          "**Alpaca + nylon (also called polyamide)**: durability. Normal in socks and gloves.",
          "**Alpaca + acrylic**: cheaper and lighter, but warms less and can pill. “Microfiber” and “dralon” on a label usually mean acrylic.",
          "**Alpaca + cotton**: lighter, for transitional seasons.",
        ],
      },
      {
        heading: "Will you pay anything on delivery?",
        paragraphs: [
          "A package shipped from Peru can be charged import duties or fees when it arrives, unless the store collects them at checkout. Some stores say so (“duties included”, or “DDP”); others say duties are the buyer's responsibility.",
          "Each product page shows where the package ships from and what the store says about duties, with a quote and the date we checked. Use the **No fees on delivery** filter to see only pieces that ship from the US or have duties paid at checkout.",
        ],
      },
      {
        heading: "Seals and certifications",
        paragraphs: [
          "Some Peruvian makers label pieces “AIA-certified”. The AIA (International Alpaca Association) is Peru's alpaca industry association. We show that label only when the store states it, with its words, and we can't verify what each certification covers.",
          "A store appearing in the AIA's member list does not mean every piece carries a seal.",
        ],
      },
      {
        heading: "Sizes, prices and shipping",
        paragraphs: [
          "Peruvian brands often sell in soles; we convert to US dollars at the official exchange rate of the day and keep the original price for reference. Your card issuer may use a slightly different rate. Check that your size is in stock: we show stock per size when the store publishes it.",
        ],
      },
    ],
    faq: [
      {
        q: "How can I tell if alpaca is real?",
        a: "Buy from makers that publish the fiber content with exact percentages. “100% alpaca” stated by the store is stronger than a description that only says “made of alpaca”. Very low prices for “100% baby alpaca” are worth a question to the store.",
      },
      {
        q: "What does “alpaca blend” mean?",
        a: "Alpaca is mixed with another fiber. The alpaca share can be anything from under 20% to over 90%, so check the percentage and whether the rest is acrylic or polyester.",
      },
      {
        q: "Will I pay customs on a package from Peru?",
        a: "It depends on the store. Some collect duties at checkout (“duties included” or “DDP”), so nothing is due on delivery. Others say import duties are the buyer's responsibility. Each product page quotes the store's policy; filter by “No fees on delivery” to avoid surprises.",
      },
    ],
    related: ["100-percent-alpaca-sweaters", "baby-alpaca", "alpaca-on-sale"],
  },
];

export const getGuide = (slug: string) => GUIDES.find((g) => g.slug === slug);
