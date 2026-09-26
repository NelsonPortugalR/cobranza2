import Link from "next/link";
import { Fragment } from "react";

/** Texto con **negritas**, [enlaces](/ruta) internos y [fuentes](https://…) externas. */
export function RichText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g);
  return (
    <>
      {parts.map((part, i) => {
        const bold = part.match(/^\*\*([^*]+)\*\*$/);
        if (bold) return <strong key={i} className="font-medium text-carbon">{bold[1]}</strong>;
        const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (link && /^https?:/.test(link[2]))
          return (
            <a key={i} href={link[2]} target="_blank" rel="noopener noreferrer" className="text-tierra underline decoration-tierra/30 underline-offset-2 hover:decoration-tierra">
              {link[1]}
            </a>
          );
        if (link)
          return (
            <Link key={i} href={link[2]} className="text-tierra underline decoration-tierra/30 underline-offset-2 hover:decoration-tierra">
              {link[1]}
            </Link>
          );
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}

/** Versión en texto plano (para JSON-LD y metadatos). */
export const plainText = (text: string) => text.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
