'use client';

import { Button, type ButtonProps, Text } from '@acme/ui';
import { Dialog, DialogContent, DialogTitle } from '@acme/ui/web';
import { useState } from 'react';

export function PairPicker({
  items,
  onSelect,
  title,
  emptyLabel,
  children,
  ...buttonProps
}: {
  items: { id: string; name: string }[];
  onSelect: (id: string) => void;
  title: string;
  emptyLabel: string;
} & Omit<ButtonProps, 'onClick'>) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button {...buttonProps} onClick={() => setOpen(true)}>
        {children}
      </Button>
      <DialogContent>
        <DialogTitle>{title}</DialogTitle>
        {items.length === 0 ? (
          <Text tone="muted">{emptyLabel}</Text>
        ) : (
          <div className="mt-2 flex max-h-64 flex-col gap-1 overflow-y-auto">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelect(item.id);
                  setOpen(false);
                }}
                className="hover:bg-accent rounded-md px-3 py-2 text-left transition-colors"
              >
                {item.name}
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
