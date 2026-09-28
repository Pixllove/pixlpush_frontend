# Graph Report - pixlpush_frontend  (2026-09-25)

## Corpus Check
- 132 files · ~139,917 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 599 nodes · 1086 edges · 39 communities (29 shown, 10 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `adbc8e13`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- auth.ts
- DashboardSections.tsx
- server.ts
- SiteShell.tsx
- use-projects.ts
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
- DashboardFrame
- EmailWorkspace.tsx
- BlockDesign.tsx
- SimpleEmailEditor.tsx
- PushComposer.tsx
- AppProviders.tsx
- reorderByInsertionIndex
- AudienceGroupWorkspace.tsx
- DashboardFrame.tsx
- JourneyWorkspace.tsx
- UserDetailsWorkspace.tsx
- store.ts
- UserImportDialog.tsx
- segments/[id]/page.tsx
- create/page.tsx
- push/page.tsx
- team/page.tsx

## God Nodes (most connected - your core abstractions)
1. `useActiveProject()` - 22 edges
2. `ApiError` - 19 edges
3. `callBackend()` - 18 edges
4. `DashboardFrame()` - 17 edges
5. `compilerOptions` - 17 edges
6. `callBackendWithRefresh()` - 16 edges
7. `SiteShell()` - 14 edges
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

## Communities (39 total, 10 thin omitted)

### Community 0 - "auth.ts"
Cohesion: 0.05
Nodes (66): AccountMenu(), FormError(), Toast(), ChangePasswordForm(), GoogleButton(), LoginForm(), PasswordField, cardSx (+58 more)

### Community 1 - "DashboardSections.tsx"
Cohesion: 0.18
Nodes (8): metadata, AudienceGroupCreateDialog(), BillingSection(), EmailSection(), OverviewSection(), PushSection(), UsersSection(), projectContext

### Community 2 - "server.ts"
Cohesion: 0.08
Nodes (37): ChangePasswordData, POST(), POST(), LoginData, POST(), LoginData, POST(), POST() (+29 more)

### Community 3 - "SiteShell.tsx"
Cohesion: 0.09
Nodes (17): posts, stories, topics, terms, items, CTA(), FeatureGrid(), plans (+9 more)

### Community 4 - "use-projects.ts"
Cohesion: 0.08
Nodes (41): CreateProjectDialog(), DangerZonePanel(), CONFIG_ROLES, EmailPanel(), STATUS, CONFIG_ROLES, FirebasePanel(), ProjectDetailsPanel() (+33 more)

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

### Community 22 - "DashboardFrame"
Cohesion: 0.14
Nodes (3): DashboardFrame(), JourneysSection(), ProjectSettingsCenter()

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

### Community 27 - "AppProviders.tsx"
Cohesion: 0.32
Nodes (4): metadata, AppProviders(), store, theme

### Community 29 - "AudienceGroupWorkspace.tsx"
Cohesion: 0.21
Nodes (8): AudienceGroupWorkspace(), Block, filters, makeBlock(), makeRule(), operators, Rule, values

### Community 30 - "DashboardFrame.tsx"
Cohesion: 0.32
Nodes (8): IntegrationsSection(), SettingsSection(), DashboardSidebar(), navigation, planLabel(), useActiveProject(), useProjects(), RootState

### Community 31 - "JourneyWorkspace.tsx"
Cohesion: 0.24
Nodes (8): guide, JourneyRow, journeyRows, JourneyStatus, JourneyWorkspace(), DataTableColumn, ReusableDataTable(), ReusableDataTableProps

### Community 33 - "store.ts"
Cohesion: 0.28
Nodes (6): ProjectId, projects, AppDispatch, SelectedProject, uiReducer, uiSlice

### Community 34 - "UserImportDialog.tsx"
Cohesion: 0.25
Nodes (7): Field, fields, headerLanguages, ImportRecord, SourceId, sources, UserImportDialog()

### Community 35 - "segments/[id]/page.tsx"
Cohesion: 0.38
Nodes (3): LifecycleSegmentWorkspace(), metric(), segmentData

## Knowledge Gaps
- **164 isolated node(s):** `extends`, `next/core-web-vitals`, `metadata`, `posts`, `stories` (+159 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useActiveProject()` connect `DashboardFrame.tsx` to `DashboardSections.tsx`, `use-projects.ts`, `DashboardFrame`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Why does `ApiError` connect `auth.ts` to `use-projects.ts`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Why does `DashboardFrame()` connect `DashboardFrame` to `UserDetailsWorkspace.tsx`, `DashboardSections.tsx`, `segments/[id]/page.tsx`, `create/page.tsx`, `push/page.tsx`, `team/page.tsx`, `DashboardFrame.tsx`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **What connects `extends`, `next/core-web-vitals`, `metadata` to the rest of the system?**
  _164 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `auth.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05086390992040381 - nodes in this community are weakly interconnected._
- **Should `server.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07692307692307693 - nodes in this community are weakly interconnected._
- **Should `SiteShell.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09485815602836879 - nodes in this community are weakly interconnected._