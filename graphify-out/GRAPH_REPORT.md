# Graph Report - pixlpush_frontend  (2026-10-02)

## Corpus Check
- 173 files · ~279,509 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 934 nodes · 1858 edges · 63 communities (44 shown, 19 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 8 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `406284d9`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- DashboardSections.tsx
- LifecycleSegmentWorkspace.tsx
- server.ts
- SiteShell.tsx
- ProjectSettingsCenter.tsx
- dependencies
- compilerOptions
- emailExport.ts
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
- SendingDomainsPanel.tsx
- JourneyWorkspace.tsx
- AudienceGroupWorkspace.tsx
- LoginForm.tsx
- package.json
- UserDetailsWorkspace.tsx
- vercel.json
- projects/api.ts
- TeamAccessPanel.tsx
- auth.ts
- auth.schema.ts
- AuditLogsPanel.tsx
- GoogleCallback.tsx
- SignupForm.tsx
- DashboardFrame.tsx
- IntegrationDocumentation.tsx
- create/page.tsx
- InvitationAccept.tsx
- settings/page.tsx
- NotificationMenu.tsx
- EmailLanguageSettings.tsx
- AuthShell.tsx
- journeys/page.tsx
- AccountProfile.tsx
- store.ts
- push/page.tsx
- team/page.tsx
- @mui/material
- next
- react-hook-form
- @reduxjs/toolkit
- server-only
- zod
- @types/react-dom

## God Nodes (most connected - your core abstractions)
1. `useActiveProject()` - 44 edges
2. `ApiError` - 24 edges
3. `callBackend()` - 23 edges
4. `authRequest()` - 21 edges
5. `DashboardFrame()` - 19 edges
6. `useCurrentUser()` - 17 edges
7. `compilerOptions` - 17 edges
8. `callBackendWithRefresh()` - 16 edges
9. `SiteShell()` - 14 edges
10. `PageHero()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `DashboardLayout()` --calls--> `callBackend()`  [EXTRACTED]
  app/(dashboard)/layout.tsx → lib/auth/server.ts
- `GET()` --calls--> `callBackendWithRefresh()`  [EXTRACTED]
  app/api/audit-logs/[[...path]]/route.ts → lib/auth/server.ts
- `POST()` --calls--> `setSessionCookies()`  [EXTRACTED]
  app/api/auth/change-password/route.ts → lib/auth/server.ts
- `POST()` --calls--> `callBackend()`  [EXTRACTED]
  app/api/auth/forgot-password/route.ts → lib/auth/server.ts
- `POST()` --calls--> `setSessionCookies()`  [EXTRACTED]
  app/api/auth/google/route.ts → lib/auth/server.ts

## Import Cycles
- None detected.

## Communities (63 total, 19 thin omitted)

### Community 0 - "DashboardSections.tsx"
Cohesion: 0.09
Nodes (24): metadata, AudienceGroupCreateDialog(), BillingSection(), EmailDataSection(), EmailSection(), IntegrationsSection(), OverviewSection(), PushSection() (+16 more)

### Community 1 - "LifecycleSegmentWorkspace.tsx"
Cohesion: 0.38
Nodes (3): LifecycleSegmentWorkspace(), metric(), lifecycleSegmentsApi

### Community 2 - "server.ts"
Cohesion: 0.06
Nodes (44): GET(), Params, ChangePasswordData, POST(), POST(), LoginData, POST(), LoginData (+36 more)

### Community 3 - "SiteShell.tsx"
Cohesion: 0.06
Nodes (20): posts, stories, topics, terms, items, HeroLightTrails(), HeroSection(), HomePage() (+12 more)

### Community 4 - "ProjectSettingsCenter.tsx"
Cohesion: 0.07
Nodes (36): metadata, AppProviders(), CreateProjectDialog(), DangerZonePanel(), CONFIG_ROLES, EmailPanel(), STATUS, CONFIG_ROLES (+28 more)

### Community 5 - "dependencies"
Cohesion: 0.11
Nodes (19): @emotion/react, @emotion/styled, firebase, @hookform/resolvers, @mui/icons-material, dependencies, @emotion/react, @emotion/styled (+11 more)

### Community 6 - "compilerOptions"
Cohesion: 0.07
Nodes (27): dom, dom.iterable, esnext, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts, **/*.tsx (+19 more)

### Community 7 - "emailExport.ts"
Cohesion: 0.21
Nodes (16): backgroundBehind(), bakeFramedImage(), companionKey(), compileEmailHtml(), croppedCopyOf(), generated(), gridColumns(), inFlight (+8 more)

### Community 8 - "devDependencies"
Cohesion: 0.10
Nodes (21): eslint, eslint-config-next, jsdom, devDependencies, eslint, eslint-config-next, jsdom, @testing-library/jest-dom (+13 more)

### Community 9 - "campaigns/route.ts"
Cohesion: 0.52
Nodes (6): DELETE(), GET(), PATCH(), POST(), PUT(), response()

### Community 10 - "JourneyBuilder.tsx"
Cohesion: 0.09
Nodes (6): AddTarget, Block, blockOptions, BlockType, EntranceConfig, JourneyBuilder()

### Community 11 - "middleware.ts"
Cohesion: 0.36
Nodes (7): AUTH_ONLY, config, cookieOptions(), middleware(), PROTECTED, renewSession(), sameHost()

### Community 23 - "EmailWorkspace.tsx"
Cohesion: 0.08
Nodes (23): reorderByInsertionIndex(), Block, blockDefaults, BlockType, designOf(), dragCategories, DragCategory, dragCategoryIcons (+15 more)

### Community 24 - "BlockDesign.tsx"
Cohesion: 0.14
Nodes (17): BlockDesign(), DashboardBlockDesign(), DesignImage, DesignItem, FaApple, FileText, inlineDesign(), isDot() (+9 more)

### Community 25 - "SimpleEmailEditor.tsx"
Cohesion: 0.09
Nodes (23): CloseEmailEditor(), EMAIL_TRANSLATION_LANGUAGES, EmailTranslationPanel(), DEFAULT_FOOTER_CONFIG, EditorItem, EmailKind, escapeFooterHtml(), FONT_OPTIONS (+15 more)

### Community 26 - "PushComposer.tsx"
Cohesion: 0.12
Nodes (13): DeleteConfirmDialog(), DeleteConfirmDialogProps, countries, languageCodes, languages, Mode, PushComposer(), SaveTarget (+5 more)

### Community 27 - "SendingDomainsPanel.tsx"
Cohesion: 0.06
Nodes (65): AddDomainDialog(), domainFromEmail(), email, Props, consumeCallbackParams(), PendingConnection, redirectToProvider(), rememberConnection() (+57 more)

### Community 28 - "JourneyWorkspace.tsx"
Cohesion: 0.24
Nodes (8): guide, JourneyRow, journeyRows, JourneyStatus, JourneyWorkspace(), DataTableColumn, ReusableDataTable(), ReusableDataTableProps

### Community 29 - "AudienceGroupWorkspace.tsx"
Cohesion: 0.12
Nodes (17): allCountries, AudienceGroupWorkspace(), backendField, backendOperator, Block, filters, makeBlock(), makeRule() (+9 more)

### Community 30 - "LoginForm.tsx"
Cohesion: 0.33
Nodes (6): LoginForm(), startSession(), useGoogleLogin(), useLogin(), LoginInput, loginSchema

### Community 31 - "package.json"
Cohesion: 0.20
Nodes (9): name, private, scripts, build, dev, lint, start, test (+1 more)

### Community 32 - "UserDetailsWorkspace.tsx"
Cohesion: 0.19
Nodes (8): ActivityCard(), display(), formatDate(), metric(), UserDetailsWorkspace(), eventsApi, usersApi, UserActivity

### Community 33 - "vercel.json"
Cohesion: 0.20
Nodes (9): hnd1, maxDuration, buildCommand, framework, functions, app/api/**/route.ts, installCommand, regions (+1 more)

### Community 34 - "projects/api.ts"
Cohesion: 0.06
Nodes (48): Field, fields, headerLanguages, sources, at(), EmailCampaignStats, EmailLanguageOption, EmailLanguages (+40 more)

### Community 35 - "TeamAccessPanel.tsx"
Cohesion: 0.13
Nodes (16): Confirm, InviteDialog(), MANAGE, MESSAGES, person(), ROLE_LABEL, ROLES, TeamAccessPanel() (+8 more)

### Community 36 - "auth.ts"
Cohesion: 0.18
Nodes (16): AccountMenu(), cardSx, VerifyEmailView(), SiteAccount(), SiteAccountDrawer(), useCurrentUser(), useResendVerification(), useVerifyEmail() (+8 more)

### Community 37 - "auth.schema.ts"
Cohesion: 0.11
Nodes (25): PasswordForm(), PasswordField, cardSx, RequestResetLink(), SetNewPassword(), SubmitButton(), useChangePassword(), useForgotPassword() (+17 more)

### Community 38 - "AuditLogsPanel.tsx"
Cohesion: 0.17
Nodes (14): actorName(), AuditLogsPanel(), CATEGORY_COLOR, CATEGORY_LABEL, DetailsDrawer(), errorText(), fieldSx, fullDate() (+6 more)

### Community 39 - "GoogleCallback.tsx"
Cohesion: 0.13
Nodes (17): metadata, GoogleButton(), googleErrorMessage(), breathe, GoogleCallback(), pulse, rise, spin (+9 more)

### Community 40 - "SignupForm.tsx"
Cohesion: 0.39
Nodes (4): SignupForm(), useClearOnRestore(), useSignup(), SignupInput

### Community 41 - "DashboardFrame.tsx"
Cohesion: 0.46
Nodes (4): DashboardSidebar(), navigation, planLabel(), RootState

### Community 46 - "InvitationAccept.tsx"
Cohesion: 0.11
Nodes (15): FormError(), Toast(), accept(), ENDED, InvitationAccept(), loadPreview(), message(), MESSAGES (+7 more)

### Community 48 - "NotificationMenu.tsx"
Cohesion: 0.50
Nodes (3): initialNotifications, NotificationMenu(), ProductNotification

### Community 49 - "EmailLanguageSettings.tsx"
Cohesion: 0.40
Nodes (5): EMAIL_LANGUAGE_NAMES, EmailLanguageSettings(), languageName(), ChoiceScreen(), EditorToolbar()

### Community 50 - "AuthShell.tsx"
Cohesion: 0.32
Nodes (3): ResetPasswordView(), AuthShell(), Logo()

### Community 52 - "AccountProfile.tsx"
Cohesion: 0.40
Nodes (4): AccountProfile(), display(), billingApi, teamApi

### Community 53 - "store.ts"
Cohesion: 0.28
Nodes (6): ProjectId, projects, AppDispatch, SelectedProject, uiReducer, uiSlice

## Knowledge Gaps
- **256 isolated node(s):** `extends`, `next/core-web-vitals`, `metadata`, `posts`, `stories` (+251 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useActiveProject()` connect `DashboardSections.tsx` to `UserDetailsWorkspace.tsx`, `LifecycleSegmentWorkspace.tsx`, `projects/api.ts`, `TeamAccessPanel.tsx`, `ProjectSettingsCenter.tsx`, `DashboardFrame.tsx`, `IntegrationDocumentation.tsx`, `AccountProfile.tsx`, `DashboardFrame`, `EmailWorkspace.tsx`, `PushComposer.tsx`, `SendingDomainsPanel.tsx`, `AudienceGroupWorkspace.tsx`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **Why does `useCurrentUser()` connect `auth.ts` to `TeamAccessPanel.tsx`, `ProjectSettingsCenter.tsx`, `auth.schema.ts`, `InvitationAccept.tsx`, `AccountProfile.tsx`, `DashboardFrame`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Why does `ApiError` connect `auth.ts` to `projects/api.ts`, `TeamAccessPanel.tsx`, `ProjectSettingsCenter.tsx`, `auth.schema.ts`, `AuditLogsPanel.tsx`, `GoogleCallback.tsx`, `SignupForm.tsx`, `InvitationAccept.tsx`, `SendingDomainsPanel.tsx`, `LoginForm.tsx`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **What connects `extends`, `next/core-web-vitals`, `metadata` to the rest of the system?**
  _256 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `DashboardSections.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._
- **Should `server.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06349206349206349 - nodes in this community are weakly interconnected._
- **Should `SiteShell.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.055130784708249496 - nodes in this community are weakly interconnected._