import { ErrorScene } from "@/components/ui/ErrorScene";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <ErrorScene
      code="404"
      title="This page doesn't exist"
      description="The link's broken or the page moved. Head back to where you came from, or start fresh from the homepage."
      homeHref="/"
      homeLabel="Homepage"
    />
  );
}
