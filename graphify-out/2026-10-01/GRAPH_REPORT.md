# Graph Report - pixlpush_frontend  (2026-10-01)

## Corpus Check
- 163 files · ~168,934 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 845 nodes · 1683 edges · 48 communities (42 shown, 6 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f11b4c0c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- create/page.tsx
- invitation-accept.test.tsx
- server.ts
- SiteShell.tsx
- ProjectSettingsCenter.tsx
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
- auth.ts
- AudienceGroupWorkspace.tsx
- UserImportDialog.tsx
- JourneyWorkspace.tsx
- UserDetailsWorkspace.tsx
- useActiveProject
- projects/api.ts
- LifecycleSegmentWorkspace.tsx
- DashboardFrame.tsx
- LoginForm.tsx
- TeamAccessPanel.tsx
- ResetPasswordView.tsx
- AccountProfile.tsx
- auth.schema.ts
- InvitationAccept.tsx
- uiSlice.ts
- SignupForm.tsx
- firebase.ts

## God Nodes (most connected - your core abstractions)
1. `useActiveProject()` - 44 edges
2. `ApiError` - 24 edges
3. `authRequest()` - 21 edges
4. `callBackend()` - 21 edges
5. `DashboardFrame()` - 19 edges
6. `compilerOptions` - 17 edges
7. `callBackendWithRefresh()` - 16 edges
8. `SiteShell()` - 14 edges
9. `useCurrentUser()` - 14 edges
10. `PageHero()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `GET()` --calls--> `callBackendWithRefresh()`  [EXTRACTED]
  app/api/audit-logs/[[...path]]/route.ts → lib/auth/server.ts
- `POST()` --calls--> `setSessionCookies()`  [EXTRACTED]
  app/api/auth/change-password/route.ts → lib/auth/server.ts
- `POST()` --calls--> `callBackend()`  [EXTRACTED]
  app/api/auth/forgot-password/route.ts → lib/auth/server.ts
- `POST()` --calls--> `setSessionCookies()`  [EXTRACTED]
  app/api/auth/google/route.ts → lib/auth/server.ts
- `POST()` --calls--> `setSessionCookies()`  [EXTRACTED]
  app/api/auth/login/route.ts → lib/auth/server.ts

## Import Cycles
- None detected.

## Communities (48 total, 6 thin omitted)

### Community 1 - "invitation-accept.test.tsx"
Cohesion: 0.29
Nodes (3): assign, logout, pending

### Community 2 - "server.ts"
Cohesion: 0.07
Nodes (42): GET(), Params, ChangePasswordData, POST(), POST(), LoginData, POST(), LoginData (+34 more)

### Community 3 - "SiteShell.tsx"
Cohesion: 0.06
Nodes (20): posts, stories, topics, terms, items, HeroLightTrails(), HeroSection(), HomePage() (+12 more)

### Community 4 - "ProjectSettingsCenter.tsx"
Cohesion: 0.07
Nodes (36): metadata, AppProviders(), CreateProjectDialog(), DangerZonePanel(), CONFIG_ROLES, EmailPanel(), STATUS, CONFIG_ROLES (+28 more)

### Community 5 - "dependencies"
Cohesion: 0.06
Nodes (31): @emotion/react, @emotion/styled, firebase, @hookform/resolvers, @mui/icons-material, @mui/material, dependencies, @emotion/react (+23 more)

### Community 6 - "compilerOptions"
Cohesion: 0.07
Nodes (27): dom, dom.iterable, esnext, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts, **/*.tsx (+19 more)

### Community 7 - "AuditLogsPanel.tsx"
Cohesion: 0.15
Nodes (16): actorName(), AuditLogsPanel(), CATEGORY_COLOR, CATEGORY_LABEL, DetailsDrawer(), errorText(), fieldSx, fullDate() (+8 more)

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
Nodes (5): AUTH_ONLY, config, middleware(), PROTECTED, sameHost()

### Community 22 - "DashboardSections.tsx"
Cohesion: 0.13
Nodes (8): AudienceGroupCreateDialog(), ChannelSection(), JourneysSection(), TeamSection(), UsersSection(), PushCampaign, PushTemplate, userStatsApi

### Community 23 - "EmailWorkspace.tsx"
Cohesion: 0.09
Nodes (14): reorderByInsertionIndex(), Block, blockDefaults, BlockType, dragCategories, DragCategory, DragEditor(), dragLibrary (+6 more)

### Community 24 - "BlockDesign.tsx"
Cohesion: 0.19
Nodes (11): BlockDesign(), DashboardBlockDesign(), DesignImage, DesignItem, FaApple, FileText, inlineDesign(), palette (+3 more)

### Community 25 - "SimpleEmailEditor.tsx"
Cohesion: 0.17
Nodes (9): CloseEmailEditor(), EditorItem, EmailKind, FONT_OPTIONS, FONT_SIZE_OPTIONS, Props, SimpleEmailEditor(), TOKEN_OPTIONS (+1 more)

### Community 26 - "PushComposer.tsx"
Cohesion: 0.12
Nodes (13): DeleteConfirmDialog(), DeleteConfirmDialogProps, countries, languageCodes, languages, Mode, PushComposer(), SaveTarget (+5 more)

### Community 27 - "SendingDomainsPanel.tsx"
Cohesion: 0.06
Nodes (65): AddDomainDialog(), domainFromEmail(), email, Props, consumeCallbackParams(), PendingConnection, redirectToProvider(), rememberConnection() (+57 more)

### Community 28 - "auth.ts"
Cohesion: 0.19
Nodes (15): AccountMenu(), cardSx, VerifyEmailView(), useCurrentUser(), useResendVerification(), useVerifyEmail(), useLogout(), authApi (+7 more)

### Community 29 - "AudienceGroupWorkspace.tsx"
Cohesion: 0.13
Nodes (16): allCountries, AudienceGroupWorkspace(), backendField, backendOperator, Block, filters, makeBlock(), makeRule() (+8 more)

### Community 30 - "UserImportDialog.tsx"
Cohesion: 0.18
Nodes (10): Field, fields, headerLanguages, sources, UserImportDialog(), userImportApi, CustomPropertyDef, ImportMappingInput (+2 more)

### Community 31 - "JourneyWorkspace.tsx"
Cohesion: 0.24
Nodes (8): guide, JourneyRow, journeyRows, JourneyStatus, JourneyWorkspace(), DataTableColumn, ReusableDataTable(), ReusableDataTableProps

### Community 32 - "UserDetailsWorkspace.tsx"
Cohesion: 0.16
Nodes (10): ActivityCard(), display(), formatDate(), metric(), UserDetailsWorkspace(), eventsApi, usersApi, EndUser (+2 more)

### Community 33 - "useActiveProject"
Cohesion: 0.16
Nodes (11): IntegrationsSection(), PushSection(), SettingsSection(), DashboardSidebar(), navigation, IntegrationDocumentation(), planLabel(), useActiveProject() (+3 more)

### Community 34 - "projects/api.ts"
Cohesion: 0.07
Nodes (40): EventOption, LifecycleSegmentCreateDialog(), at(), EmailCampaignStats, PushCampaignStats, PushDeepLink, pushList(), PushPaginated (+32 more)

### Community 35 - "LifecycleSegmentWorkspace.tsx"
Cohesion: 0.38
Nodes (3): LifecycleSegmentWorkspace(), metric(), lifecycleSegmentsApi

### Community 36 - "DashboardFrame.tsx"
Cohesion: 0.12
Nodes (7): DashboardFrame(), BillingSection(), EmailWorkspace(), initialNotifications, NotificationMenu(), ProductNotification, ProjectSettingsCenter()

### Community 37 - "LoginForm.tsx"
Cohesion: 0.23
Nodes (10): GoogleButton(), LoginForm(), useClearOnRestore(), startSession(), useGoogleLogin(), useLogin(), postLoginPath(), safeRedirect() (+2 more)

### Community 38 - "TeamAccessPanel.tsx"
Cohesion: 0.14
Nodes (15): Confirm, InviteDialog(), MANAGE, MESSAGES, person(), ROLE_LABEL, ROLES, TeamAccessPanel() (+7 more)

### Community 39 - "ResetPasswordView.tsx"
Cohesion: 0.16
Nodes (12): FormError(), Toast(), cardSx, RequestResetLink(), ResetPasswordView(), SetNewPassword(), useForgotPassword(), useResetPassword() (+4 more)

### Community 40 - "AccountProfile.tsx"
Cohesion: 0.33
Nodes (5): AccountProfile(), display(), Preview, billingApi, ProjectRole

### Community 41 - "auth.schema.ts"
Cohesion: 0.15
Nodes (13): ChangePasswordForm(), PasswordForm(), useChangePassword(), ChangePasswordInput, changePasswordSchema, email, newPassword, resendVerificationSchema (+5 more)

### Community 42 - "InvitationAccept.tsx"
Cohesion: 0.16
Nodes (11): accept(), ENDED, InvitationAccept(), loadPreview(), message(), MESSAGES, ROLE, State (+3 more)

### Community 43 - "uiSlice.ts"
Cohesion: 0.14
Nodes (11): metadata, EmailDataSection(), EmailSection(), OverviewSection(), date(), projectContext, ProjectId, projects (+3 more)

### Community 46 - "SignupForm.tsx"
Cohesion: 0.31
Nodes (5): SignupForm(), SubmitButton(), useSignup(), applyApiError(), SignupInput

### Community 49 - "firebase.ts"
Cohesion: 0.47
Nodes (5): config, firebaseApp(), getGoogleRedirectIdToken(), isGoogleSignInConfigured, startGoogleRedirect()

## Knowledge Gaps
- **223 isolated node(s):** `extends`, `next/core-web-vitals`, `metadata`, `posts`, `stories` (+218 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useActiveProject()` connect `useActiveProject` to `UserDetailsWorkspace.tsx`, `LifecycleSegmentWorkspace.tsx`, `ProjectSettingsCenter.tsx`, `DashboardFrame.tsx`, `TeamAccessPanel.tsx`, `AccountProfile.tsx`, `uiSlice.ts`, `DashboardSections.tsx`, `EmailWorkspace.tsx`, `PushComposer.tsx`, `SendingDomainsPanel.tsx`, `AudienceGroupWorkspace.tsx`, `UserImportDialog.tsx`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **Why does `ApiError` connect `auth.ts` to `ProjectSettingsCenter.tsx`, `LoginForm.tsx`, `TeamAccessPanel.tsx`, `AuditLogsPanel.tsx`, `ResetPasswordView.tsx`, `InvitationAccept.tsx`, `SignupForm.tsx`, `SendingDomainsPanel.tsx`, `UserImportDialog.tsx`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Why does `authRequest()` connect `SendingDomainsPanel.tsx` to `projects/api.ts`, `auth.ts`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **What connects `extends`, `next/core-web-vitals`, `metadata` to the rest of the system?**
  _223 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `server.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0672316384180791 - nodes in this community are weakly interconnected._
- **Should `SiteShell.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.055130784708249496 - nodes in this community are weakly interconnected._
- **Should `ProjectSettingsCenter.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07315233785822021 - nodes in this community are weakly interconnected._