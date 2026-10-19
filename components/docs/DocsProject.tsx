"use client";

import { createContext, useContext, type ReactNode } from "react";

// Inside the dashboard, code samples show the active project's public slug in place of YOUR_PROJECT_ID.
// The substitution happens before rendering, so what is shown is exactly what is copied.
const DocsProjectContext = createContext<{ projectId?: string; projectName?: string }>({});

export function DocsProjectProvider({ projectId, projectName, children }: { projectId?: string; projectName?: string; children: ReactNode }) {
  return <DocsProjectContext.Provider value={{ projectId, projectName }}>{children}</DocsProjectContext.Provider>;
}

export const useDocsProject = () => useContext(DocsProjectContext);

export function personalize(code: string, projectId?: string) {
  return projectId ? code.replaceAll("YOUR_PROJECT_ID", projectId) : code;
}
