# Graph Report - pixlpush_frontend  (2026-09-29)

## Corpus Check
- 134 files · ~146,369 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 644 nodes · 1200 edges · 39 communities (30 shown, 9 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7ab27835`
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
- HomePage.tsx
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
- use-projects.ts
- reorderByInsertionIndex
- AudienceGroupWorkspace.tsx
- useActiveProject
- JourneyWorkspace.tsx
- UserDetailsWorkspace.tsx
- store.ts
- projects/api.ts
- LifecycleSegmentWorkspace.tsx
- create/page.tsx
- DashboardFrame
- firebase.ts

## God Nodes (most connected - your core abstractions)
1. `useActiveProject()` - 30 edges
2. `ApiError` - 20 edges
3. `callBackend()` - 18 edges
4. `DashboardFrame()` - 17 edges
5. `compilerOptions` - 17 edges
6. `SiteShell()` - 14 edges
7. `callBackendWithRefresh()` - 14 edges
8. `PageHero()` - 13 edges
9. `CTA()` - 12 edges
10. `SectionIntro()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `POST()` --calls--> `setSessionCookies()`  [EXTRACTED]
  app/api/auth/change-password/route.ts → lib/auth/server.ts
- `POST()` --calls--> `callBackend()`  [EXTRACTED]
  app/api/auth/forgot-password/route.ts → lib/auth/server.ts
- `POST()` --calls--> `setSessionCookies()`  [EXTRACTED]
  app/api/auth/google/route.ts → lib/auth/server.ts
- `POST()` --calls--> `setSessionCookies()`  [EXTRACTED]
  app/api/auth/login/route.ts → lib/auth/server.ts
- `GET()` --calls--> `callBackendWithRefresh()`  [EXTRACTED]
  app/api/auth/me/route.ts → lib/auth/server.ts

## Import Cycles
- None detected.

## Communities (39 total, 9 thin omitted)

### Community 0 - "auth.ts"
Cohesion: 0.06
Nodes (57): AccountMenu(), FormError(), Toast(), PasswordForm(), GoogleButton(), LoginForm(), PasswordField, cardSx (+49 more)

### Community 2 - "server.ts"
Cohesion: 0.08
Nodes (35): ChangePasswordData, POST(), POST(), LoginData, POST(), LoginData, POST(), POST() (+27 more)

### Community 3 - "SiteShell.tsx"
Cohesion: 0.09
Nodes (17): posts, stories, topics, terms, items, CTA(), FeatureGrid(), plans (+9 more)

### Community 4 - "ProjectSettingsCenter.tsx"
Cohesion: 0.14
Nodes (21): CONFIG_ROLES, EmailPanel(), STATUS, CONFIG_ROLES, FirebasePanel(), panels, tabs, date() (+13 more)

### Community 5 - "dependencies"
Cohesion: 0.06
Nodes (31): @emotion/react, @emotion/styled, firebase, @hookform/resolvers, @mui/icons-material, @mui/material, dependencies, @emotion/react (+23 more)

### Community 6 - "compilerOptions"
Cohesion: 0.07
Nodes (27): dom, dom.iterable, esnext, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts, **/*.tsx (+19 more)

### Community 7 - "HomePage.tsx"
Cohesion: 0.10
Nodes (3): HeroLightTrails(), HeroSection(), HomePage()

### Community 8 - "devDependencies"
Cohesion: 0.09
Nodes (21): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, @types/node, @types/react, @types/react-dom (+13 more)

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
Cohesion: 0.13
Nodes (11): AudienceGroupCreateDialog(), BillingSection(), ChannelSection(), EmailSection(), PushSection(), TeamSection(), UsersSection(), usersApi (+3 more)

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

### Community 27 - "use-projects.ts"
Cohesion: 0.12
Nodes (19): metadata, AppProviders(), CreateProjectDialog(), DangerZonePanel(), ProjectDetailsPanel(), QueryProvider(), useCreateProject(), useProject() (+11 more)

### Community 29 - "AudienceGroupWorkspace.tsx"
Cohesion: 0.13
Nodes (15): AudienceGroupWorkspace(), backendField, backendOperator, Block, filters, makeBlock(), makeRule(), operators (+7 more)

### Community 30 - "useActiveProject"
Cohesion: 0.22
Nodes (11): IntegrationsSection(), SettingsSection(), DashboardSidebar(), navigation, initialNotifications, NotificationMenu(), ProductNotification, planLabel() (+3 more)

### Community 31 - "JourneyWorkspace.tsx"
Cohesion: 0.24
Nodes (8): guide, JourneyRow, journeyRows, JourneyStatus, JourneyWorkspace(), DataTableColumn, ReusableDataTable(), ReusableDataTableProps

### Community 33 - "store.ts"
Cohesion: 0.28
Nodes (6): ProjectId, projects, AppDispatch, SelectedProject, uiReducer, uiSlice

### Community 34 - "projects/api.ts"
Cohesion: 0.06
Nodes (47): AccountProfile(), display(), ChangePasswordForm(), EventOption, fallbackEvents, LifecycleSegmentCreateDialog(), Field, fields (+39 more)

### Community 35 - "LifecycleSegmentWorkspace.tsx"
Cohesion: 0.38
Nodes (3): LifecycleSegmentWorkspace(), metric(), lifecycleSegmentsApi

### Community 37 - "DashboardFrame"
Cohesion: 0.17
Nodes (3): DashboardFrame(), JourneysSection(), ProjectSettingsCenter()

### Community 38 - "firebase.ts"
Cohesion: 0.47
Nodes (5): config, firebaseApp(), getGoogleRedirectIdToken(), isGoogleSignInConfigured, startGoogleRedirect()

## Knowledge Gaps
- **174 isolated node(s):** `extends`, `next/core-web-vitals`, `metadata`, `posts`, `stories` (+169 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ApiError` connect `auth.ts` to `projects/api.ts`, `use-projects.ts`, `ProjectSettingsCenter.tsx`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Why does `useActiveProject()` connect `useActiveProject` to `auth.ts`, `dashboard/page.tsx`, `projects/api.ts`, `LifecycleSegmentWorkspace.tsx`, `ProjectSettingsCenter.tsx`, `DashboardFrame`, `DashboardSections.tsx`, `use-projects.ts`, `AudienceGroupWorkspace.tsx`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Why does `DashboardFrame()` connect `DashboardFrame` to `UserDetailsWorkspace.tsx`, `dashboard/page.tsx`, `projects/api.ts`, `LifecycleSegmentWorkspace.tsx`, `create/page.tsx`, `DashboardSections.tsx`, `useActiveProject`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **What connects `extends`, `next/core-web-vitals`, `metadata` to the rest of the system?**
  _174 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `auth.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05934065934065934 - nodes in this community are weakly interconnected._
- **Should `server.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08244897959183674 - nodes in this community are weakly interconnected._
- **Should `SiteShell.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09485815602836879 - nodes in this community are weakly interconnected._