import DashboardDocsShell from "@/components/docs/DashboardDocsShell";

// Every SDK's in-app docs (React Native, Flutter, Web) share the dashboard frame and docs navigation.
export default function IntegrationsLayout({ children }: { children: React.ReactNode }) {
  return <DashboardDocsShell>{children}</DashboardDocsShell>;
}
