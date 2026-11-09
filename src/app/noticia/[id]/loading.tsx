import Link from "next/link";
import BackButton from "@/components/BackButton";
import ThemeToggle from "@/components/ThemeToggle";

export default function Loading() {
  return (
    <div className="min-h-screen">
      <div className="h-[3px] bg-ink" />

      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-5 lg:px-8">
          <Link
            href="/"
            className="font-serif text-[20px] tracking-tight text-ink"
          >
            Radar OSINT
          </Link>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <BackButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[760px] px-5 py-10 lg:px-8">
        <div className="h-2 w-40 animate-pulse bg-line/60" />
        <div className="mt-6 h-9 w-full animate-pulse bg-line/50" />
        <div className="mt-3 h-9 w-2/3 animate-pulse bg-line/40" />
        <div className="mt-8 space-y-3">
          {Array.from({ length: 10 }).map((_, index) => (
            <div
              key={index}
              className={`h-3 animate-pulse bg-line/40 ${
                index % 3 === 2 ? "w-3/4" : "w-full"
              }`}
            />
          ))}
        </div>
        <p className="mt-8 text-[10px] uppercase tracking-[0.16em] text-faint">
          Abrindo a notícia e extraindo o texto…
        </p>
      </main>
    </div>
  );
}
