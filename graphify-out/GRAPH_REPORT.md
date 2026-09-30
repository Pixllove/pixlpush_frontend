# Graph Report - pixlpush_frontend  (2026-09-30)

## Corpus Check
- 161 files · ~165,888 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 828 nodes · 1638 edges · 50 communities (42 shown, 8 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `83d0c772`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- auth.schema.ts
- dashboard/page.tsx
- server.ts
- SiteShell.tsx
- useActiveProject
- dependencies
- compilerOptions
- AuditLogsPanel.tsx
- devDependencies
- campaigns/route.ts
- JourneyBuilder.tsx
- middleware.ts
- .eslintrc.json
- lib/api.ts
- next.config.mjs
- next-env.d.ts
- README.md
- DashboardSections.tsx
- EmailWorkspace.tsx
- BlockDesign.tsx
- SimpleEmailEditor.tsx
- PushComposer.tsx
- SendingDomainsPanel.tsx
- LoginForm.tsx
- AudienceGroupWorkspace.tsx
- UserImportDialog.tsx
- JourneyWorkspace.tsx
- UserDetailsWorkspace.tsx
- store.ts
- projects/api.ts
- LifecycleSegmentWorkspace.tsx
- create/page.tsx
- DashboardFrame.tsx
- TeamAccessPanel.tsx
- InvitationAccept.tsx
- AccountProfile.tsx
- auth/api.ts
- GoogleButton.tsx
- AuthShell.tsx
- VerifyEmailView.tsx
- ChangePasswordForm.tsx
- IntegrationDocumentation.tsx
- email/page.tsx

## God Nodes (most connected - your core abstractions)
1. `useActiveProject()` - 41 edges
2. `ApiError` - 24 edges
3. `callBackend()` - 21 edges
4. `DashboardFrame()` - 19 edges
5. `authRequest()` - 19 edges
6. `compilerOptions` - 17 edges
7. `callBackendWithRefresh()` - 16 edges
8. `SiteShell()` - 14 edges
9. `useCurrentUser()` - 14 edges
10. `PageHero()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `PushSection()` --calls--> `useActiveProject()`  [EXTRACTED]
  components/dashboard/DashboardSections.tsx → hooks/projects/use-active-project.ts
- `IntegrationsSection()` --calls--> `useActiveProject()`  [EXTRACTED]
  components/dashboard/DashboardSections.tsx → hooks/projects/use-active-project.ts
- `SettingsSection()` --calls--> `useActiveProject()`  [EXTRACTED]
  components/dashboard/DashboardSections.tsx → hooks/projects/use-active-project.ts
- `GET()` --calls--> `callBackendWithRefresh()`  [EXTRACTED]
  app/api/audit-logs/[[...path]]/route.ts → lib/auth/server.ts
- `POST()` --calls--> `setSessionCookies()`  [EXTRACTED]
  app/api/auth/change-password/route.ts → lib/auth/server.ts

## Import Cycles
- None detected.

## Communities (50 total, 8 thin omitted)

### Community 0 - "auth.schema.ts"
Cohesion: 0.15
Nodes (17): cardSx, RequestResetLink(), SetNewPassword(), useForgotPassword(), useResetPassword(), email, ForgotPasswordInput, forgotPasswordSchema (+9 more)

### Community 1 - "dashboard/page.tsx"
Cohesion: 0.17
Nodes (6): metadata, BillingSection(), EmailSection(), OverviewSection(), UsersSection(), projectContext

### Community 2 - "server.ts"
Cohesion: 0.07
Nodes (40): GET(), Params, ChangePasswordData, POST(), POST(), LoginData, POST(), LoginData (+32 more)

### Community 3 - "SiteShell.tsx"
Cohesion: 0.06
Nodes (20): posts, stories, topics, terms, items, HeroLightTrails(), HeroSection(), HomePage() (+12 more)

### Community 4 - "useActiveProject"
Cohesion: 0.10
Nodes (37): SubmitButton(), CreateProjectDialog(), DangerZonePanel(), CONFIG_ROLES, EmailPanel(), STATUS, CONFIG_ROLES, FirebasePanel() (+29 more)

### Community 5 - "dependencies"
Cohesion: 0.06
Nodes (31): @emotion/react, @emotion/styled, firebase, @hookform/resolvers, @mui/icons-material, @mui/material, dependencies, @emotion/react (+23 more)

### Community 6 - "compilerOptions"
Cohesion: 0.07
Nodes (27): dom, dom.iterable, esnext, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts, **/*.tsx (+19 more)

### Community 7 - "AuditLogsPanel.tsx"
Cohesion: 0.18
Nodes (13): actorName(), AuditLogsPanel(), CATEGORY_COLOR, CATEGORY_LABEL, DetailsDrawer(), errorText(), fullDate(), headCell (+5 more)

### Community 8 - "devDependencies"
Cohesion: 0.06
Nodes (32): eslint, eslint-config-next, jsdom, devDependencies, eslint, eslint-config-next, jsdom, @testing-library/jest-dom (+24 more)

### Community 9 - "campaigns/route.ts"
Cohesion: 0.52
Nodes (6): DELETE(), GET(), PATCH(), POST(), PUT(), response()

### Community 10 - "JourneyBuilder.tsx"
Cohesion: 0.09
Nodes (6): AddTarget, Block, blockOptions, BlockType, EntranceConfig, JourneyBuilder()

### Community 11 - "middleware.ts"
Cohesion: 0.40
Nodes (3): AUTH_ONLY, config, PROTECTED

### Community 22 - "DashboardSections.tsx"
Cohesion: 0.11
Nodes (12): AudienceGroupCreateDialog(), ChannelSection(), IntegrationsSection(), JourneysSection(), PushSection(), SettingsSection(), TeamSection(), EventOption (+4 more)

### Community 23 - "EmailWorkspace.tsx"
Cohesion: 0.09
Nodes (13): reorderByInsertionIndex(), Block, blockDefaults, BlockType, dragCategories, DragCategory, DragEditor(), dragLibrary (+5 more)

### Community 24 - "BlockDesign.tsx"
Cohesion: 0.19
Nodes (11): BlockDesign(), DashboardBlockDesign(), DesignImage, DesignItem, FaApple, FileText, inlineDesign(), palette (+3 more)

### Community 25 - "SimpleEmailEditor.tsx"
Cohesion: 0.17
Nodes (9): CloseEmailEditor(), EditorItem, EmailKind, FONT_OPTIONS, FONT_SIZE_OPTIONS, Props, SimpleEmailEditor(), TOKEN_OPTIONS (+1 more)

### Community 26 - "PushComposer.tsx"
Cohesion: 0.14
Nodes (11): countries, languageCodes, languages, Mode, PushComposer(), SaveTarget, audienceGroupsApi, pushApi (+3 more)

### Community 27 - "SendingDomainsPanel.tsx"
Cohesion: 0.07
Nodes (58): AddDomainDialog(), domainFromEmail(), email, Props, consumeCallbackParams(), PendingConnection, redirectToProvider(), rememberConnection() (+50 more)

### Community 28 - "LoginForm.tsx"
Cohesion: 0.27
Nodes (8): LoginForm(), PasswordField, SignupForm(), useClearOnRestore(), useLogin(), useSignup(), applyApiError(), SignupInput

### Community 29 - "AudienceGroupWorkspace.tsx"
Cohesion: 0.12
Nodes (16): allCountries, AudienceGroupWorkspace(), backendField, backendOperator, Block, filters, makeBlock(), makeRule() (+8 more)

### Community 30 - "UserImportDialog.tsx"
Cohesion: 0.18
Nodes (10): Field, fields, headerLanguages, sources, UserImportDialog(), userImportApi, CustomPropertyDef, ImportMappingInput (+2 more)

### Community 31 - "JourneyWorkspace.tsx"
Cohesion: 0.24
Nodes (8): guide, JourneyRow, journeyRows, JourneyStatus, JourneyWorkspace(), DataTableColumn, ReusableDataTable(), ReusableDataTableProps

### Community 32 - "UserDetailsWorkspace.tsx"
Cohesion: 0.17
Nodes (8): ActivityCard(), display(), formatDate(), metric(), UserDetailsWorkspace(), eventsApi, usersApi, UserActivity

### Community 33 - "store.ts"
Cohesion: 0.14
Nodes (11): metadata, AppProviders(), ProjectId, projects, AppDispatch, RootState, store, theme (+3 more)

### Community 34 - "projects/api.ts"
Cohesion: 0.07
Nodes (44): at(), emailApi, firebaseApi, projectApi, PushCampaignStats, PushDeepLink, pushList(), PushPaginated (+36 more)

### Community 35 - "LifecycleSegmentWorkspace.tsx"
Cohesion: 0.38
Nodes (3): LifecycleSegmentWorkspace(), metric(), lifecycleSegmentsApi

### Community 37 - "DashboardFrame.tsx"
Cohesion: 0.17
Nodes (8): DashboardFrame(), DashboardSidebar(), navigation, initialNotifications, NotificationMenu(), ProductNotification, ProjectSettingsCenter(), planLabel()

### Community 38 - "TeamAccessPanel.tsx"
Cohesion: 0.12
Nodes (17): Confirm, date(), InviteDialog(), MANAGE, MESSAGES, person(), ROLE_LABEL, ROLES (+9 more)

### Community 39 - "InvitationAccept.tsx"
Cohesion: 0.13
Nodes (13): accept(), ENDED, InvitationAccept(), loadPreview(), message(), MESSAGES, Preview, ROLE (+5 more)

### Community 40 - "AccountProfile.tsx"
Cohesion: 0.40
Nodes (4): AccountProfile(), display(), billingApi, teamApi

### Community 41 - "auth/api.ts"
Cohesion: 0.32
Nodes (8): AccountMenu(), useCurrentUser(), useLogout(), authApi, authKeys, LoginInput, Account, CurrentUser

### Community 42 - "GoogleButton.tsx"
Cohesion: 0.24
Nodes (9): GoogleButton(), useGoogleLogin(), config, firebaseApp(), getGoogleRedirectIdToken(), isGoogleSignInConfigured, startGoogleRedirect(), postLoginPath() (+1 more)

### Community 43 - "AuthShell.tsx"
Cohesion: 0.23
Nodes (3): ResetPasswordView(), AuthShell(), Logo()

### Community 46 - "VerifyEmailView.tsx"
Cohesion: 0.31
Nodes (7): FormError(), Toast(), cardSx, VerifyEmailView(), useResendVerification(), useVerifyEmail(), ResendVerificationInput

### Community 47 - "ChangePasswordForm.tsx"
Cohesion: 0.28
Nodes (6): ChangePasswordForm(), PasswordForm(), useChangePassword(), ChangePasswordInput, changePasswordSchema, setPasswordSchema

## Knowledge Gaps
- **218 isolated node(s):** `extends`, `next/core-web-vitals`, `metadata`, `posts`, `stories` (+213 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useActiveProject()` connect `useActiveProject` to `UserDetailsWorkspace.tsx`, `dashboard/page.tsx`, `LifecycleSegmentWorkspace.tsx`, `DashboardFrame.tsx`, `TeamAccessPanel.tsx`, `AccountProfile.tsx`, `IntegrationDocumentation.tsx`, `DashboardSections.tsx`, `PushComposer.tsx`, `SendingDomainsPanel.tsx`, `AudienceGroupWorkspace.tsx`, `UserImportDialog.tsx`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **Why does `ApiError` connect `useActiveProject` to `auth.schema.ts`, `TeamAccessPanel.tsx`, `AuditLogsPanel.tsx`, `InvitationAccept.tsx`, `auth/api.ts`, `GoogleButton.tsx`, `VerifyEmailView.tsx`, `SendingDomainsPanel.tsx`, `LoginForm.tsx`, `UserImportDialog.tsx`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Why does `DashboardFrame()` connect `DashboardFrame.tsx` to `UserDetailsWorkspace.tsx`, `dashboard/page.tsx`, `LifecycleSegmentWorkspace.tsx`, `create/page.tsx`, `useActiveProject`, `ChangePasswordForm.tsx`, `IntegrationDocumentation.tsx`, `email/page.tsx`, `DashboardSections.tsx`, `AudienceGroupWorkspace.tsx`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **What connects `extends`, `next/core-web-vitals`, `metadata` to the rest of the system?**
  _218 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `server.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07138535995160314 - nodes in this community are weakly interconnected._
- **Should `SiteShell.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.055130784708249496 - nodes in this community are weakly interconnected._
- **Should `useActiveProject` be split into smaller, more focused modules?**
  _Cohesion score 0.09869375907111756 - nodes in this community are weakly interconnected._