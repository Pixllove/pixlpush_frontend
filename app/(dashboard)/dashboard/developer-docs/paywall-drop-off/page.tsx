import { redirect } from "next/navigation";

export const metadata = { title: 'Paywall Drop-off Segment — PixlPush' };

export default function PaywallDropOffDocsPage() {
  redirect("/dashboard/integrations/react-native/paywall-segment");
}
