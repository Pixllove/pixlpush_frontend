import DashboardFrame from "@/components/dashboard/DashboardFrame";
import IntegrationDocumentation from "@/components/dashboard/IntegrationDocumentation";

export default function IntegrationsPage() {
  return (
    <DashboardFrame
      requiresProject
      active="SDK Integration Guide"
      title="SDK Integration Guide"
      description="Connect your product to PixlPush with the React SDK and start turning behavior into retention."
    >
      <IntegrationDocumentation />
    </DashboardFrame>
  );
}
