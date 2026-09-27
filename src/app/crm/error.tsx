"use client";

import { useEffect } from "react";
import { ErrorScene } from "@/components/ui/ErrorScene";

export default function CrmError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorScene
      code="500"
      title="Something broke in the CRM"
      description="That page hit an unexpected error. It's been logged — try again, or head back to the dashboard."
      onRetry={reset}
      homeHref="/crm"
      homeLabel="CRM dashboard"
      digest={error.digest}
    />
  );
}
