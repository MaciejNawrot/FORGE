'use client';

import { Button, type ButtonProps } from '@acme/ui';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@acme/ui/web';
import { useState } from 'react';
import { useLocale } from '@/shared/i18n/context';

export function ConfirmButton({
  onConfirm,
  title,
  description,
  confirmLabel,
  pending,
  children,
  ...buttonProps
}: {
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  pending?: boolean;
} & Omit<ButtonProps, 'onClick'>) {
  const { dict } = useLocale();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button {...buttonProps} onClick={() => setOpen(true)}>
        {children}
      </Button>
      <DialogContent>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
        <div className="mt-4 flex justify-end gap-2">
          <DialogClose asChild>
            <Button type="button" variant="outline" size="sm">
              {dict.common.cancel}
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={pending}
            onClick={() => {
              setOpen(false);
              onConfirm();
            }}
          >
            {pending ? dict.common.deleting : (confirmLabel ?? dict.common.delete)}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
