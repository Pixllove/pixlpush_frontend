import DashboardFrame from '@/components/dashboard/DashboardFrame';
import { UsersSection } from '@/components/dashboard/DashboardSections';
export default function UsersPage() { return <DashboardFrame requiresProject active="Users" title="Users" description="Understand every identified user, lifecycle state and activity history."><UsersSection /></DashboardFrame>; }
