"use client";

import { usePathname } from "next/navigation";

/**
 * /crm is a dedicated portal, not the public site — it skips the public
 * header/footer/announcement bar/overlays and renders full-bleed instead of
 * inside the max-w-7xl content column.
 */
export function ConditionalChrome({
  announcementBar,
  header,
  footer,
  overlays,
  children,
}: {
  announcementBar: React.ReactNode;
  header: React.ReactNode;
  footer: React.ReactNode;
  overlays: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isPortal = pathname?.startsWith("/crm") || pathname?.startsWith("/manage");

  if (isPortal) {
    return <>{children}</>;
  }

  return (
    <>
      {announcementBar}
      {header}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-20">
        {children}
      </main>
      {footer}
      {overlays}
    </>
  );
}
