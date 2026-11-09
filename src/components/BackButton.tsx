"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function BackButton() {
  const router = useRouter();

  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/");
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-ink underline decoration-line-strong underline-offset-4 transition hover:decoration-accent"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      Voltar
    </button>
  );
}
