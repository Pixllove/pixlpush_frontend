# Graph Report - pixlpush_frontend  (2026-09-29)

## Corpus Check
- 157 files · ~157,545 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 789 nodes · 1547 edges · 46 communities (37 shown, 9 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `de457050`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- auth.ts
- dashboard/page.tsx
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
- reorderByInsertionIndex
- AudienceGroupWorkspace.tsx
- useActiveProject
- JourneyWorkspace.tsx
- UserDetailsWorkspace.tsx
- use-active-project.ts
- projects/api.ts
- LifecycleSegmentWorkspace.tsx
- create/page.tsx
- DashboardFrame.tsx
- TeamAccessPanel.tsx
- InvitationAccept.tsx
- AccountProfile.tsx
- LifecycleSegmentCreateDialog.tsx
- NotificationMenu.tsx
- push/page.tsx

## God Nodes (most connected - your core abstractions)
1. `useActiveProject()` - 36 edges
2. `ApiError` - 24 edges
3. `DashboardFrame()` - 19 edges
4. `callBackend()` - 19 edges
5. `authRequest()` - 18 edges
6. `compilerOptions` - 17 edges
7. `callBackendWithRefresh()` - 16 edges
8. `SiteShell()` - 14 edges
9. `PageHero()` - 13 edges
10. `setSessionCookies()` - 13 edges

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

## Communities (46 total, 9 thin omitted)

### Community 0 - "auth.ts"
Cohesion: 0.05
Nodes (64): AccountMenu(), FormError(), Toast(), ChangePasswordForm(), PasswordForm(), GoogleButton(), LoginForm(), PasswordField (+56 more)

### Community 2 - "server.ts"
Cohesion: 0.07
Nodes (39): GET(), Params, ChangePasswordData, POST(), POST(), LoginData, POST(), LoginData (+31 more)

### Community 3 - "SiteShell.tsx"
Cohesion: 0.06
Nodes (20): posts, stories, topics, terms, items, HeroLightTrails(), HeroSection(), HomePage() (+12 more)

### Community 4 - "ProjectSettingsCenter.tsx"
Cohesion: 0.08
Nodes (35): metadata, AppProviders(), DangerZonePanel(), CONFIG_ROLES, EmailPanel(), STATUS, CONFIG_ROLES, FirebasePanel() (+27 more)

### Community 5 - "dependencies"
Cohesion: 0.06
Nodes (31): @emotion/react, @emotion/styled, firebase, @hookform/resolvers, @mui/icons-material, @mui/material, dependencies, @emotion/react (+23 more)

### Community 6 - "compilerOptions"
Cohesion: 0.07
Nodes (27): dom, dom.iterable, esnext, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts, **/*.tsx (+19 more)

### Community 7 - "AuditLogsPanel.tsx"
Cohesion: 0.15
Nodes (13): AuditLogsPanel(), AuditRow(), CATEGORY_LABEL, errorText(), when(), auditApi, audit, members (+5 more)

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
Cohesion: 0.15
Nodes (9): AudienceGroupCreateDialog(), BillingSection(), EmailSection(), JourneysSection(), OverviewSection(), PushSection(), TeamSection(), UsersSection() (+1 more)

### Community 23 - "EmailWorkspace.tsx"
Cohesion: 0.09
Nodes (13): Block, blockDefaults, BlockType, dragCategories, DragCategory, dragLibrary, Editor, EmailItem (+5 more)

### Community 24 - "BlockDesign.tsx"
Cohesion: 0.19
Nodes (11): BlockDesign(), DashboardBlockDesign(), DesignImage, DesignItem, FaApple, FileText, inlineDesign(), palette (+3 more)

### Community 25 - "SimpleEmailEditor.tsx"
Cohesion: 0.17
Nodes (9): CloseEmailEditor(), EditorItem, EmailKind, FONT_OPTIONS, FONT_SIZE_OPTIONS, Props, SimpleEmailEditor(), TOKEN_OPTIONS (+1 more)

### Community 26 - "PushComposer.tsx"
Cohesion: 0.20
Nodes (7): countries, deepLinks, groups, languages, Mode, PushComposer(), SaveTarget

### Community 27 - "SendingDomainsPanel.tsx"
Cohesion: 0.07
Nodes (62): AddDomainDialog(), domainFromEmail(), email, Props, consumeCallbackParams(), PendingConnection, redirectToProvider(), rememberConnection() (+54 more)

### Community 29 - "AudienceGroupWorkspace.tsx"
Cohesion: 0.11
Nodes (18): allCountries, AudienceGroupWorkspace(), backendField, backendOperator, Block, filters, makeBlock(), makeRule() (+10 more)

### Community 30 - "useActiveProject"
Cohesion: 0.22
Nodes (9): IntegrationsSection(), SettingsSection(), Field, fields, headerLanguages, sources, UserImportDialog(), useActiveProject() (+1 more)

### Community 31 - "JourneyWorkspace.tsx"
Cohesion: 0.24
Nodes (8): guide, JourneyRow, journeyRows, JourneyStatus, JourneyWorkspace(), DataTableColumn, ReusableDataTable(), ReusableDataTableProps

### Community 32 - "UserDetailsWorkspace.tsx"
Cohesion: 0.16
Nodes (10): ActivityCard(), display(), formatDate(), metric(), UserDetailsWorkspace(), eventsApi, usersApi, EndUser (+2 more)

### Community 33 - "use-active-project.ts"
Cohesion: 0.25
Nodes (7): ProjectId, projects, AppDispatch, RootState, SelectedProject, uiReducer, uiSlice

### Community 34 - "projects/api.ts"
Cohesion: 0.08
Nodes (35): userImportApi, userStatsApi, AudienceGroup, AudienceGroupMember, AudienceGroupSchemaCondition, AudienceGroupSchemaField, AudienceGroupSchemaOption, AuditLogFilters (+27 more)

### Community 35 - "LifecycleSegmentWorkspace.tsx"
Cohesion: 0.38
Nodes (3): LifecycleSegmentWorkspace(), metric(), lifecycleSegmentsApi

### Community 37 - "DashboardFrame.tsx"
Cohesion: 0.15
Nodes (5): DashboardFrame(), DashboardSidebar(), navigation, ProjectSettingsCenter(), planLabel()

### Community 38 - "TeamAccessPanel.tsx"
Cohesion: 0.23
Nodes (11): Confirm, date(), InviteDialog(), MANAGE, MESSAGES, person(), ROLE_LABEL, ROLES (+3 more)

### Community 39 - "InvitationAccept.tsx"
Cohesion: 0.38
Nodes (4): accept(), InvitationAccept(), MESSAGES, Phase

### Community 40 - "AccountProfile.tsx"
Cohesion: 0.33
Nodes (5): AccountProfile(), display(), billingApi, teamApi, ProjectRole

### Community 41 - "LifecycleSegmentCreateDialog.tsx"
Cohesion: 0.50
Nodes (3): EventOption, LifecycleSegmentCreateDialog(), LifecycleSegmentSchema

### Community 42 - "NotificationMenu.tsx"
Cohesion: 0.50
Nodes (3): initialNotifications, NotificationMenu(), ProductNotification

## Knowledge Gaps
- **208 isolated node(s):** `extends`, `next/core-web-vitals`, `metadata`, `posts`, `stories` (+203 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useActiveProject()` connect `useActiveProject` to `UserDetailsWorkspace.tsx`, `use-active-project.ts`, `LifecycleSegmentWorkspace.tsx`, `ProjectSettingsCenter.tsx`, `DashboardFrame.tsx`, `TeamAccessPanel.tsx`, `AccountProfile.tsx`, `DashboardSections.tsx`, `SendingDomainsPanel.tsx`, `AudienceGroupWorkspace.tsx`?**
  _High betweenness centrality (0.077) - this node is a cross-community bridge._
- **Why does `ApiError` connect `auth.ts` to `ProjectSettingsCenter.tsx`, `TeamAccessPanel.tsx`, `AuditLogsPanel.tsx`, `InvitationAccept.tsx`, `SendingDomainsPanel.tsx`, `useActiveProject`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Why does `DashboardFrame()` connect `DashboardFrame.tsx` to `auth.ts`, `dashboard/page.tsx`, `LifecycleSegmentWorkspace.tsx`, `create/page.tsx`, `push/page.tsx`, `DashboardSections.tsx`, `useActiveProject`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **What connects `extends`, `next/core-web-vitals`, `metadata` to the rest of the system?**
  _208 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `auth.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.051287128712871284 - nodes in this community are weakly interconnected._
- **Should `server.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07402597402597402 - nodes in this community are weakly interconnected._
- **Should `SiteShell.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.055130784708249496 - nodes in this community are weakly interconnected._