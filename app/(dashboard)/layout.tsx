import { HydrationBoundary, QueryClient, dehydrate } from '@tanstack/react-query';
import SessionKeepAlive from '@/components/auth/SessionKeepAlive';
import BlockedScreen from '@/components/auth/BlockedScreen';
import { authKeys } from '@/lib/auth/api';
import { callBackend } from '@/lib/auth/server';
import { projectKeys } from '@/lib/projects/api';
import type { CurrentUser } from '@/types/auth';

/**
 * Loads the signed-in user and their Projects while the page is rendered, and
 * hands both to the browser inside the HTML. A reload therefore paints with
 * real data and the browser has nothing to ask for: no /me, no /projects, and
 * nothing kept in browser storage.
 *
 * A layout is not re-rendered on client navigation, so this costs two backend
 * calls per full page load and none while moving between dashboard pages.
 */
export default async function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const queryClient = new QueryClient();

  // callBackend, not callBackendWithRefresh: a render cannot set cookies, so an
  // expired access token is left for the browser, which refreshes and fetches
  // exactly as it did before.
  const [me, projects] = await Promise.all([
    callBackend<{ data: unknown }>('/auth/me', { auth: true }),
    callBackend<{ data: unknown }>('/projects', { auth: true }),
  ]);

  const currentUser = me.ok ? (me.body as { data: CurrentUser }).data : null;
  if (currentUser) queryClient.setQueryData(authKeys.currentUser(), currentUser);
  if (projects.ok) queryClient.setQueryData(projectKeys.list(), (projects.body as { data: unknown }).data);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SessionKeepAlive />
      {currentUser?.account.status === 'blocked'
        ? <BlockedScreen accountId={currentUser.account.id} email={currentUser.account.email} />
        : children}
    </HydrationBoundary>
  );
}
