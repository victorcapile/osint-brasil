"use client";

import { useEffect, useRef, useState } from "react";

interface ArticleReaderProps {
  articleId: string;
  contentHtml: string;
  contentPartial: boolean;
  description: string;
}

const STORAGE_PREFIX = "radar-osint:colado:";

function toParagraphs(text: string): string[] {
  return text
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

export default function ArticleReader({
  articleId,
  contentHtml,
  contentPartial,
  description,
}: ArticleReaderProps) {
  const storageKey = `${STORAGE_PREFIX}${articleId}`;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [pasted, setPasted] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored && stored.trim().length > 0) {
        setPasted(stored);
        setDraft(stored);
      }
    } catch {
      // localStorage indisponível: o recurso continua só na sessão.
    }
  }, [storageKey]);

  function persist(text: string) {
    setPasted(text);
    setDraft(text);
    setEditing(false);
    setMessage("");
    try {
      localStorage.setItem(storageKey, text);
    } catch {
      // Sem persistência: mantém o texto na sessão.
    }
  }

  function handleSave() {
    const clean = draft.trim();
    if (!clean) {
      setMessage("Cole o texto da matéria antes de continuar.");
      textareaRef.current?.focus();
      return;
    }
    persist(clean);
  }

  async function handleClipboard() {
    if (!navigator.clipboard?.readText) {
      setMessage("Seu navegador não permite ler a área de transferência. Use ⌘V / Ctrl+V.");
      textareaRef.current?.focus();
      return;
    }

    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (!text) {
        setMessage("A área de transferência está vazia. Copie o texto no veículo original.");
        textareaRef.current?.focus();
        return;
      }
      persist(text);
    } catch {
      setMessage("Não foi possível ler a área de transferência. Use ⌘V / Ctrl+V.");
      textareaRef.current?.focus();
    }
  }

  function handleRemove() {
    setPasted(null);
    setDraft("");
    setEditing(false);
    setMessage("");
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // Sem persistência: nada a limpar.
    }
  }

  function handleEdit() {
    setEditing(true);
    setMessage("");
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  if (pasted && !editing) {
    const paragraphs = toParagraphs(pasted);
    return (
      <div className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2">
          <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-accent">
            <span className="h-1 w-1 rounded-full bg-accent" aria-hidden />
            Texto colado por você
          </span>
          <div className="flex items-center gap-4 text-[10px] uppercase tracking-[0.14em]">
            <button
              type="button"
              onClick={handleEdit}
              className="text-faint transition hover:text-ink"
            >
              Editar
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="text-faint transition hover:text-ink"
            >
              Remover
            </button>
          </div>
        </div>
        <div className="reader-content mt-6">
          {paragraphs.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8">
      {contentHtml ? (
        <div
          className="reader-content"
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />
      ) : (
        <p className="text-[16px] leading-relaxed text-muted">
          {description || "Resumo não disponível."}
        </p>
      )}

      {contentPartial || !contentHtml ? (
        <p className="mt-8 border-l-2 border-line-strong pl-4 text-[12px] leading-relaxed text-faint">
          Não foi possível captar a notícia na íntegra.
        </p>
      ) : null}

      {contentPartial || !contentHtml || editing ? (
        <section className="mt-6 border border-line bg-paper-raised/60 p-4 sm:p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-serif text-[18px] text-ink">
              A matéria não abriu?
            </h2>
            <span className="text-[10px] uppercase tracking-[0.14em] text-faint">
              Fica só no seu navegador
            </span>
          </div>
          <p className="mt-2 text-[13px] leading-relaxed text-muted">
            Copie o texto no veículo original e cole aqui. O Radar mostra a
            matéria limpa, sem o layout do site.
          </p>

          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Cole aqui o texto da matéria…"
            spellCheck={false}
            className="mt-3 min-h-[160px] w-full resize-y border border-line bg-paper px-3 py-2 font-sans text-[14px] leading-relaxed text-ink placeholder:text-faint focus:border-ink focus:outline-none"
          />

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 border border-ink bg-ink px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-paper transition hover:border-accent hover:bg-accent"
            >
              Ler no app
            </button>
            <button
              type="button"
              onClick={handleClipboard}
              className="inline-flex items-center gap-1.5 border border-line-strong px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-ink transition hover:border-ink"
            >
              Colar da área de transferência
            </button>
          </div>

          {message ? (
            <p className="mt-2 text-[12px] leading-relaxed text-accent">
              {message}
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
