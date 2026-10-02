import DashboardFrame from '@/components/dashboard/DashboardFrame';
import EmailWorkspace from '@/components/dashboard/EmailWorkspace';

export default function EmailPage() {
  return <>
    {/* Runs before the page paints: if an editor was open when the page was reloaded, a plain editor-coloured
        backdrop covers the list until the editor is back, so the list never flashes. */}
    <script dangerouslySetInnerHTML={{ __html: "try{if(sessionStorage.getItem('pixlpush:email-editor'))document.documentElement.setAttribute('data-email-editor','1')}catch(e){}" }} />
    <DashboardFrame active="Email" title="Email Template" description="Create, manage, and reuse email templates for future campaigns and Journey Automations."><EmailWorkspace /></DashboardFrame>
  </>;
}
