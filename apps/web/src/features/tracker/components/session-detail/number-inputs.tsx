import { Text } from '@acme/ui';
import { useState } from 'react';

/** Tap-to-edit number: renders as a plain button until clicked, then an input that commits on blur/Enter. Empty commits `null` (bodyweight/unset); callers that don't accept `null` (e.g. reps) should ignore a `null` commit. */
export function EditableNumber({
  value,
  onCommit,
  suffix,
  className,
}: {
  value: number | null;
  onCommit: (value: number | null) => void;
  suffix?: string;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <input
        type="number"
        min={0}
        step="0.5"
        // biome-ignore lint/a11y/noAutofocus: opened by a direct user click, not on page load
        autoFocus
        defaultValue={value ?? ''}
        onFocus={(e) => e.currentTarget.select()}
        onBlur={(e) => {
          const raw = e.target.value.trim();
          if (raw === '') {
            onCommit(null);
          } else {
            const parsed = Number(raw);
            onCommit(Number.isFinite(parsed) ? Math.max(0, parsed) : value);
          }
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
        className={`w-14 bg-transparent outline-none ${className ?? ''}`}
      />
    );
  }

  return (
    <button type="button" onClick={() => setEditing(true)} className={className}>
      {value ?? '—'}
      {suffix}
    </button>
  );
}

export function CompactNumberInput({
  value,
  onChange,
  step,
  suffix,
}: {
  value: number | string;
  onChange: (value: string) => void;
  step?: string;
  suffix?: string;
}) {
  return (
    <div className="bg-muted border-border flex items-center gap-1 rounded-lg border px-2 py-1.5">
      <input
        type="number"
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="font-data text-primary w-12 bg-transparent text-sm outline-none"
      />
      {suffix && <span className="text-muted-foreground text-xs">{suffix}</span>}
    </div>
  );
}

export function BigNumberInput({
  label,
  value,
  onChange,
  step,
}: {
  label: string;
  value: number | string;
  onChange: (value: string) => void;
  step?: string;
}) {
  return (
    <div className="bg-muted focus-within:border-primary border-border rounded-lg border p-4 transition-colors">
      <Text tone="muted" variant="caption" className="font-data mb-2 block uppercase">
        {label}
      </Text>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="font-display text-primary w-full bg-transparent text-4xl outline-none"
      />
    </div>
  );
}
