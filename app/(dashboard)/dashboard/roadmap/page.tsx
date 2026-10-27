import DashboardFrame from "@/components/dashboard/DashboardFrame";
import RoadmapWorkspace from "@/components/dashboard/RoadmapWorkspace";

export const metadata = { title: "Ideas & Roadmap — PixlPush" };

export default function RoadmapPage() {
  return <DashboardFrame requiresProject active="Ideas & Roadmap" title="Ideas & Roadmap" description="Share feedback and follow the product direction set by the PixlPush team."><RoadmapWorkspace /></DashboardFrame>;
}
