"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import DashboardFrame from "@/components/dashboard/DashboardFrame";
import { useActiveProject } from "@/hooks/projects/use-active-project";
import DocsLayout from "./DocsLayout";
import { DocsProjectProvider } from "./DocsProject";

/** The docs inside the app: same guides as /docs, with code samples using the active project's slug. */
export default function DashboardDocsShell({ children }: { children: ReactNode }) {
  const { active } = useActiveProject();
  // The segment recipes were the "Developer documentation" pages; keep that sidebar item lit for them.
  const section = /-segment$/.test(usePathname()) ? "Developer documentation" : "SDK Integration Guide";
  return <DashboardFrame requiresProject hideHeader active={section} title="SDK Integration Guide" description="Integrate PixlPush in your app.">
    <DocsProjectProvider projectId={active?.slug} projectName={active?.name}>
      <DocsLayout base="/dashboard/integrations" variant="app">{children}</DocsLayout>
    </DocsProjectProvider>
  </DashboardFrame>;
}
