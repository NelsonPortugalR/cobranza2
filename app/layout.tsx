import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vellón — catálogo de alpaca peruana",
  description:
    "Un agente lee las fichas de tiendas peruanas y marketplaces y las convierte en un catálogo filtrable por micronaje, raza, color natural y origen.",
};

export const viewport: Viewport = {
  themeColor: "#faf7f2",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600&display=swap"
        />
      </head>
      <body className="min-h-dvh font-sans antialiased">
        <div className="bg-carbon px-4 py-1.5 text-center text-[11px] tracking-wide text-arena">
          Demo con datos de ejemplo · los productos y precios no son listados reales
        </div>
        <header className="border-b border-arena-oscura/70">
          <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
            <Link href="/" className="font-serif text-xl tracking-tight">
              Vellón
            </Link>
            <nav className="flex items-center gap-5 text-sm text-piedra">
              <a href="#catalogo" className="hover:text-carbon">
                Catálogo
              </a>
              <a href="#como-funciona" className="hidden hover:text-carbon sm:inline">
                Cómo leemos las fichas
              </a>
            </nav>
          </div>
        </header>
        {children}
        <footer className="mt-24 border-t border-arena-oscura/70">
          <div className="mx-auto max-w-7xl px-4 py-10 text-xs leading-relaxed text-piedra sm:px-6">
            <p className="font-serif text-base text-carbon">Vellón</p>
            <p className="mt-2 max-w-2xl">
              No vendemos ni tenemos inventario: enlazamos a la tienda original. Los datos técnicos se extraen de
              lo que cada tienda publica; marcamos qué está declarado y qué fue inferido por el agente.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
