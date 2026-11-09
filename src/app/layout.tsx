import type { Metadata, Viewport } from "next";
import { Inter, Newsreader } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  display: "swap",
  style: ["normal", "italic"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Radar OSINT — Inteligência de fontes abertas",
  description:
    "Agregador OSINT de notícias com classificação por região, continente e gênero, e radar de temas estratégicos para a inteligência brasileira.",
};

export const viewport: Viewport = {
  themeColor: "#f4f1ea",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${inter.variable} ${newsreader.variable} min-h-screen bg-paper font-sans text-ink antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
