import { redirect } from "next/navigation";

// The guide moved to platform-scoped routes; keep old links (sidebar, developer docs, bookmarks) working.
export default function IntegrationsPage() {
  redirect("/dashboard/integrations/react-native/quickstart");
}
