"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type DiscardDialogProps = {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  variant: "destructive";
};

type UseUnsavedChangesGuardResult = {
  /** Wire to onClick of any "leave" button (Back, Cancel, etc.). Opens the
   *  destructive discard dialog when dirty; navigates straight through when
   *  not. */
  requestLeave: () => void;
  /** Spread into <ConfirmDialog>. Override individual props if a callsite
   *  needs different copy. */
  discardDialogProps: DiscardDialogProps;
};

/**
 * Guards in-progress edits against accidental navigation.
 *
 * - In-app navigation (Back / Cancel buttons): callers wire `requestLeave`
 *   to the button's onClick. When dirty, a destructive ConfirmDialog opens
 *   (spread `discardDialogProps`); otherwise navigation runs immediately.
 * - Browser-level navigation (tab close, refresh, history): a `beforeunload`
 *   listener attaches while dirty and triggers the browser's native unsaved-
 *   changes prompt. Modern browsers ignore custom messages, but `returnValue`
 *   is still required for legacy compatibility.
 */
export function useUnsavedChangesGuard({
  isDirty,
  redirectTo,
}: {
  isDirty: boolean;
  redirectTo: string;
}): UseUnsavedChangesGuardResult {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const leave = useCallback(() => {
    router.push(redirectTo);
  }, [router, redirectTo]);

  const requestLeave = useCallback(() => {
    if (isDirty) {
      setOpen(true);
    } else {
      leave();
    }
  }, [isDirty, leave]);

  const onConfirm = useCallback(() => {
    setOpen(false);
    leave();
  }, [leave]);

  const onCancel = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!isDirty) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  return {
    requestLeave,
    discardDialogProps: {
      open,
      onConfirm,
      onCancel,
      title: "Discard unsaved changes?",
      description: "Your unsaved changes will be lost.",
      confirmLabel: "Discard",
      cancelLabel: "Keep editing",
      variant: "destructive",
    },
  };
}
