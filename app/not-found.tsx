import Link from "next/link";
import { CATEGORY_COLLECTIONS } from "@/lib/seo/collections.ts";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
      <h1 className="font-serif text-4xl">This page isn&rsquo;t here</h1>
      <p className="mt-4 text-piedra">The product may have sold out or moved. Try one of these instead:</p>
      <ul className="mt-8 flex flex-wrap justify-center gap-2">
        {CATEGORY_COLLECTIONS.slice(0, 8).map((c) => (
          <li key={c.slug}>
            <Link href={`/${c.slug}`} className="inline-block rounded-full border border-arena-oscura bg-white px-4 py-2 text-sm hover:border-tierra/50">
              {c.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
