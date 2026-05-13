"use client";

import { useFormStatus } from "react-dom";
import { InlineSpinner, type InlineSpinnerTone } from "@/components/ui/inline-spinner";

type Props = {
  label: string;
  pendingLabel: string;
  className: string;
  spinnerTone?: InlineSpinnerTone;
};

/**
 * Submit button that shows a spinner while the parent `<form action={...}>` request is in flight.
 */
export function PendingSubmitButton({
  label,
  pendingLabel,
  className,
  spinnerTone = "indigo",
}: Props) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex items-center justify-center gap-2 disabled:pointer-events-none disabled:opacity-60 ${className}`}
    >
      {pending ? (
        <>
          <InlineSpinner tone={spinnerTone} />
          <span>{pendingLabel}</span>
        </>
      ) : (
        label
      )}
    </button>
  );
}
