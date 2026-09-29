import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function RootLoading() {
  return (
    <div className="flex-1 min-h-[60vh] flex items-center justify-center">
      <LoadingSpinner label="Loading page..." size="lg" />
    </div>
  );
}
