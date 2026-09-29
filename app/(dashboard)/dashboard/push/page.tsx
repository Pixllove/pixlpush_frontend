import DashboardFrame from "@/components/dashboard/DashboardFrame";
import { ChannelSection } from "@/components/dashboard/DashboardSections";
export default function PushPage() {
  return (
    <DashboardFrame
      active="Push Notifications"
      title="Push Notifications"
      description="Send timely messages to the right users across their devices."
    >
      <ChannelSection channel="push" />
    </DashboardFrame>
  );
}
