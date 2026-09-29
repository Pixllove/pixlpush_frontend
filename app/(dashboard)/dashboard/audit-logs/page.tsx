import DashboardFrame from '@/components/dashboard/DashboardFrame';
import AuditLogsPanel from '@/components/dashboard/audit/AuditLogsPanel';

export default function AuditLogsPage() {
  return (
    <DashboardFrame active="Audit Logs" title="Audit Logs" description="Who did what, in which project, and when.">
      <AuditLogsPanel />
    </DashboardFrame>
  );
}
