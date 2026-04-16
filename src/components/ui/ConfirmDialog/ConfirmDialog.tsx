"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type ConfirmDialogProps = {
  open: boolean;
  onConfirm: ((reason?: string) => void);
  onCancel: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "destructive" | "default";
  /** Show a text input for a reason/note. Value is passed to onConfirm. */
  reasonInput?: { label: string; placeholder?: string };
};

export function ConfirmDialog({
  open,
  onConfirm,
  onCancel,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  reasonInput,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const dismiss = () => {
    setReason("");
    onCancel();
  };

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) {
      dismiss();
    }
  };

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      onCancel={dismiss}
      className={cn(
        "fixed inset-0 z-50 m-auto",
        "w-full max-w-md rounded-lg border border-border bg-card p-0 shadow-lg",
        "backdrop:bg-black/50 backdrop:backdrop-blur-sm",
        "open:animate-in open:fade-in-0 open:zoom-in-95"
      )}
    >
      <div className="p-6">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{description}</p>
        {reasonInput && (
          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium text-foreground">
              {reasonInput.label}
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={reasonInput.placeholder}
              rows={2}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" size="sm" onClick={dismiss}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === "destructive" ? "destructive" : "default"}
            size="sm"
            onClick={() => { const r = reason; setReason(""); onConfirm(reasonInput ? r : undefined); }}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
