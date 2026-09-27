import { ErrorScene } from "@/components/ui/ErrorScene";

export const metadata = { title: "Not found · CRM" };

export default function CrmNotFound() {
  return (
    <ErrorScene
      code="404"
      title="Nothing here"
      description="That record or page doesn't exist — it may have been deleted, or the link's just wrong."
      homeHref="/crm"
      homeLabel="CRM dashboard"
    />
  );
}
