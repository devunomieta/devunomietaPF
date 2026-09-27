import { ImportWizard } from "./ImportWizard";

export const metadata = { title: "Import · CRM" };
export const maxDuration = 60;

export default function CrmImportPage() {
  return (
    <div className="flex flex-col gap-5 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-foreground">Import clients or leads</h1>
        <p className="text-sm text-muted">Upload an Excel or CSV file, map its columns, then review before committing.</p>
      </div>
      <ImportWizard />
    </div>
  );
}
