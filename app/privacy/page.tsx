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
        <p>
          Our hosting provider keeps standard technical logs (such as IP address and browser type) for security and reliability.
          When you click through to a store, that store&rsquo;s own privacy policy applies.
        </p>
      </div>
    </article>
  );
}
