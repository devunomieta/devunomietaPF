import { redirect } from "next/navigation";
import { getCrmAuthUser } from "@/lib/crm/auth";
import { getThreads } from "./actions";
import { MailboxClient } from "./MailboxClient";

export const metadata = {
  title: "CRM Mailbox — System Inbound Threads & Replies",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function CrmMailboxPage({
  searchParams,
}: {
  searchParams: Promise<{
    folder?: string;
    starred?: string;
    threadId?: string;
    q?: string;
  }>;
}) {
  const authUser = await getCrmAuthUser();
  if (!authUser || !authUser.permissions.pages.mailbox) {
    redirect("/crm");
  }

  const { folder = "inbox", starred, threadId, q = "" } = await searchParams;
  const isStarred = starred === "1" || starred === "true";

  const initialThreads = await getThreads({
    folder: isStarred ? undefined : folder,
    starredOnly: isStarred,
    search: q,
  });

  return (
    <div className="space-y-4">
      <MailboxClient
        initialThreads={initialThreads}
        currentFolder={folder}
        initialThreadId={threadId || null}
        searchQuery={q}
        canSend={authUser.permissions.actions.mailbox_send}
        isSuperAdmin={authUser.isSuperAdmin}
        senderEmail={process.env.BREVO_SENDER_EMAIL || ""}
      />
    </div>
  );
}
