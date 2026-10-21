import { redirect } from "next/navigation";

export const metadata = { title: 'Engagement Segment — PixlPush' };

export default function EngagementDocsPage() {
  redirect("/dashboard/integrations/react-native/engagement-segment");
}
