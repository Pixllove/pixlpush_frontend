# Graph Report - pixlpush_frontend  (2026-09-23)

## Corpus Check
- 114 files · ~131,346 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 499 nodes · 913 edges · 29 communities (23 shown, 6 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c23f8c70`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- auth.schema.ts
- DashboardSections.tsx
- server.ts
- SiteShell.tsx
- use-projects.ts
- dependencies
- compilerOptions
- HomePage.tsx
- devDependencies
- campaigns/route.ts
- firebase.ts
- middleware.ts
- .eslintrc.json
- lib/api.ts
- next.config.mjs
- next-env.d.ts
- README.md
- auth.ts
- EmailWorkspace.tsx
- BlockDesign.tsx
- SimpleEmailEditor.tsx
- PushComposer.tsx
- AppProviders.tsx
- reorderByInsertionIndex

## God Nodes (most connected - your core abstractions)
1. `callBackend()` - 18 edges
2. `compilerOptions` - 17 edges
3. `useActiveProject()` - 16 edges
4. `ApiError` - 15 edges
5. `SiteShell()` - 14 edges
6. `callBackendWithRefresh()` - 14 edges
7. `DashboardFrame()` - 13 edges
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

## Communities (29 total, 6 thin omitted)

### Community 0 - "auth.schema.ts"
Cohesion: 0.08
Nodes (35): FormError(), Toast(), ChangePasswordForm(), LoginForm(), PasswordField, cardSx, RequestResetLink(), ResetPasswordView() (+27 more)

### Community 1 - "DashboardSections.tsx"
Cohesion: 0.06
Nodes (34): metadata, DashboardFrame(), BillingSection(), ChannelSection(), EmailSection(), IntegrationsSection(), JourneysSection(), OverviewSection() (+26 more)

### Community 2 - "server.ts"
Cohesion: 0.09
Nodes (34): ChangePasswordData, POST(), POST(), LoginData, POST(), LoginData, POST(), POST() (+26 more)

### Community 3 - "SiteShell.tsx"
Cohesion: 0.09
Nodes (17): posts, stories, topics, terms, items, CTA(), FeatureGrid(), plans (+9 more)

### Community 4 - "use-projects.ts"
Cohesion: 0.14
Nodes (17): CreateProjectDialog(), DangerZonePanel(), ProjectDetailsPanel(), tabs, useCreateProject(), useProject(), useProjectStatus(), useUpdateProject() (+9 more)

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

### Community 10 - "firebase.ts"
Cohesion: 0.47
Nodes (5): config, firebaseApp(), getGoogleIdToken(), isGoogleSignInConfigured, popupClosed()

### Community 11 - "middleware.ts"
Cohesion: 0.40
Nodes (3): AUTH_ONLY, config, PROTECTED

### Community 22 - "auth.ts"
Cohesion: 0.11
Nodes (26): AccountMenu(), GoogleButton(), cardSx, VerifyEmailView(), QueryProvider(), useCurrentUser(), useResendVerification(), useVerifyEmail() (+18 more)

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

## Knowledge Gaps
- **136 isolated node(s):** `extends`, `next/core-web-vitals`, `metadata`, `posts`, `stories` (+131 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useActiveProject()` connect `DashboardSections.tsx` to `use-projects.ts`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Why does `SubmitButton()` connect `auth.schema.ts` to `use-projects.ts`, `auth.ts`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Why does `ApiError` connect `auth.ts` to `auth.schema.ts`, `use-projects.ts`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **What connects `extends`, `next/core-web-vitals`, `metadata` to the rest of the system?**
  _136 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `auth.schema.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08455625436757512 - nodes in this community are weakly interconnected._
- **Should `DashboardSections.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06057692307692308 - nodes in this community are weakly interconnected._
- **Should `server.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08503401360544217 - nodes in this community are weakly interconnected._