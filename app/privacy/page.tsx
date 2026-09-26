import type { Metadata } from "next";
import { SITE } from "@/lib/site.ts";
import { Breadcrumbs } from "@/components/Breadcrumbs.tsx";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `What ${SITE.name} collects when you browse and search Peruvian alpaca, and what happens when you click through to a store.`,
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Privacy", path: "/privacy" }]} />
      <h1 className="font-serif text-4xl tracking-tight">Privacy Policy</h1>
      <div className="mt-8 space-y-4 text-[15px] leading-relaxed text-carbon/85">
        <p>
          {SITE.name} doesn&rsquo;t require an account and doesn&rsquo;t collect personal information such as your name, email or
          payment details.
        </p>
        <p>
          The searches you type are processed to show matching products. If our AI-assisted search is enabled, your search text
          (never personal data) may be sent to our AI provider solely to interpret it.
        </p>
        <h2 className="pt-4 font-serif text-2xl text-carbon">Search statistics</h2>
        <p>To improve search, we keep anonymous records of how it&rsquo;s used:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>what you searched for and how we interpreted it (the filters we applied);</li>
          <li>how many results it returned and which ones came first;</li>
          <li>which results you opened, their position, and whether you went on to a store;</li>
          <li>whether you rephrased your search right after.</li>
        </ul>
        <p>
          These records are linked only to a random ID that lives in your browser tab and disappears when you close it. We
          don&rsquo;t store your IP address or email, and we don&rsquo;t use cookies for this. If you type an email address or a
          phone number into the search box, we remove it before saving. Records are deleted after 12 months and are used only to
          improve search on this site.
        </p>
        <p>
          Our hosting provider keeps standard technical logs (such as IP address and browser type) for security and reliability.
          When you click through to a store, that store&rsquo;s own privacy policy applies.
        </p>
      </div>
    </article>
  );
}
