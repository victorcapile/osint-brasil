interface ViewHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
}

export default function ViewHeader({
  eyebrow,
  title,
  description,
}: ViewHeaderProps) {
  return (
    <div className="border-b border-line pb-5 pt-8">
      <p className="text-[10px] uppercase tracking-[0.24em] text-accent">
        {eyebrow}
      </p>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="font-serif text-[34px] leading-none tracking-tight text-ink sm:text-[40px]">
          {title}
        </h1>
        <p className="max-w-md text-[12px] leading-relaxed text-muted">
          {description}
        </p>
      </div>
    </div>
  );
}
