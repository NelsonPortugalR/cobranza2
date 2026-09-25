import type { Metadata } from "next";
import { SITE } from "@/lib/site.ts";
import { Breadcrumbs } from "@/components/Breadcrumbs.tsx";

export const metadata: Metadata = { title: "Terms of Use", alternates: { canonical: "/terms" }, robots: { index: true, follow: true } };

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Terms", path: "/terms" }]} />
      <h1 className="font-serif text-4xl tracking-tight">Terms of Use</h1>
      <div className="mt-8 space-y-4 text-[15px] leading-relaxed text-carbon/85">
        <p>
          {SITE.name} is an information and comparison service. We don&rsquo;t sell products, take payments or ship orders. Every
          purchase happens on the store&rsquo;s own website and is governed by that store&rsquo;s terms, shipping and return
          policies.
        </p>
        <p>
          Product details, prices and stock come from each store&rsquo;s public catalog and may change after our last update.
          Currency conversions are estimates. Always confirm details on the store&rsquo;s page before buying.
        </p>
        <p>
          Brand names, product names and photos belong to their respective owners and are shown to identify and link to their
          products. Store owners can request corrections or removal at any time.
        </p>
        <p>This site is provided “as is”, without warranties of any kind, to the extent permitted by law.</p>
      </div>
    </article>
  );
}
