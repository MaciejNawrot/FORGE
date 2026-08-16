function formatKg(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k kg`;
  return `${Math.round(value)} kg`;
}

export function VolumeChart({ values, labels }: { values: number[]; labels: string[] }) {
  const max = Math.max(1, ...values);
  const lastIndex = values.length - 1;
  const labelStep = Math.max(1, Math.ceil(values.length / 5));

  return (
    <div className="flex flex-col gap-2">
      <div className="border-muted flex h-48 items-end justify-between gap-2 border-b pt-8 pb-2">
        {values.map((value, i) => {
          const isLast = i === lastIndex;
          return (
            <div
              key={i}
              className={`group relative w-full min-w-0 flex-1 rounded-t-sm transition-colors ${
                isLast ? 'bg-primary glow-primary' : 'bg-muted hover:bg-accent'
              }`}
              style={{ height: `${Math.max(4, (value / max) * 100)}%` }}
            >
              <div
                className={`font-data absolute -top-8 left-1/2 -translate-x-1/2 rounded px-2 py-1 text-xs whitespace-nowrap ${
                  isLast
                    ? 'bg-primary text-primary-foreground block'
                    : 'bg-muted text-foreground hidden group-hover:block'
                }`}
              >
                {formatKg(value)}
              </div>
            </div>
          );
        })}
      </div>
      <div className="font-data text-muted-foreground flex justify-between text-xs">
        {labels.map((label, i) => (
          <span
            key={i}
            className={i === lastIndex ? 'text-primary' : ''}
            aria-hidden={i !== lastIndex && i % labelStep !== 0}
          >
            {i === lastIndex || i % labelStep === 0 ? label : ''}
          </span>
        ))}
      </div>
    </div>
  );
}
