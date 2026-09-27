"use client";

import { useEffect } from "react";
import { ErrorScene } from "@/components/ui/ErrorScene";

export default function GlobalError({
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
      title="Something broke on our end"
      description="That page hit an unexpected error. It's been logged — try again, or head back to the homepage."
      onRetry={reset}
      homeHref="/"
      homeLabel="Homepage"
      digest={error.digest}
    />
  );
}
