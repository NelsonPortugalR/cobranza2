// Avisa a Bing (y a los buscadores que usan IndexNow: Yandex, Seznam, Naver…) de las URLs
// nuevas o cambiadas, para que las rastreen sin esperar. La clave se publica en
// public/<clave>.txt, que es como IndexNow comprueba que el sitio es nuestro.
//   node --experimental-strip-types scripts/indexnow.ts          → portada, colecciones, marcas y guías
//   node --experimental-strip-types scripts/indexnow.ts --all    → todas las URLs del sitemap
export {};

const KEY = "44b68c856ce2460b6111583d9988ba8d";
const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://alpacaatlas.com").replace(/\/$/, "");
const all = process.argv.includes("--all");

// IndexNow valida el sitio leyendo este archivo: si no responde exactamente la clave, rechaza el envío.
const keyUrl = `${SITE}/${KEY}.txt`;
const keyRes = await fetch(keyUrl, { redirect: "manual" });
const keyBody = (await keyRes.text()).trim();
console.log(`Key file ${keyUrl} → HTTP ${keyRes.status}${keyRes.headers.get("location") ? ` → ${keyRes.headers.get("location")}` : ""}, ${keyBody === KEY ? "matches" : `content: ${JSON.stringify(keyBody.slice(0, 80))}`}`);

const xml = await (await fetch(`${SITE}/sitemap.xml`)).text();
let urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (!all) urls = urls.filter((u) => !u.includes("/products/"));
if (!urls.length) throw new Error("El sitemap no tiene URLs");

for (let i = 0; i < urls.length; i += 10_000) {
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: new URL(SITE).host, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList: urls.slice(i, i + 10_000) }),
  });
  console.log(`IndexNow: ${urls.slice(i, i + 10_000).length} URLs → HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
  if (res.status >= 400) process.exit(1);
}
