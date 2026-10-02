# Graph Report - pixlpush_frontend  (2026-10-02)

## Corpus Check
- 173 files · ~278,808 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 931 nodes · 1853 edges · 51 communities (45 shown, 6 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 8 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0b26b9f0`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- projectContext
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
- DashboardFrame.tsx
- EmailWorkspace.tsx
- BlockDesign.tsx
- SimpleEmailEditor.tsx
- PushComposer.tsx
- SendingDomainsPanel.tsx
- DashboardSections.tsx
- AudienceGroupWorkspace.tsx
- UserImportDialog.tsx
- useActiveProject
- UserDetailsWorkspace.tsx
- vercel.json
- projects/api.ts
- TeamAccessPanel.tsx
- auth.ts
- auth.schema.ts
- AuditLogsPanel.tsx
- GoogleCallback.tsx
- LoginForm.tsx
- invitation-accept.test.tsx
- IntegrationDocumentation.tsx
- useCurrentUser
- InvitationAccept.tsx
- EmailLanguageSettings.tsx
- VerifyEmailView.tsx
- AccountProfile.tsx
- use-active-project.ts

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

## Communities (51 total, 6 thin omitted)

### Community 0 - "projectContext"
Cohesion: 0.14
Nodes (8): metadata, BillingSection(), EmailDataSection(), EmailSection(), OverviewSection(), UsersSection(), date(), projectContext

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
Cohesion: 0.10
Nodes (25): metadata, AppProviders(), CONFIG_ROLES, EmailPanel(), STATUS, CONFIG_ROLES, FirebasePanel(), panels (+17 more)

### Community 5 - "dependencies"
Cohesion: 0.06
Nodes (31): @emotion/react, @emotion/styled, firebase, @hookform/resolvers, @mui/icons-material, @mui/material, dependencies, @emotion/react (+23 more)

### Community 6 - "compilerOptions"
Cohesion: 0.07
Nodes (27): dom, dom.iterable, esnext, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts, **/*.tsx (+19 more)

### Community 7 - "emailExport.ts"
Cohesion: 0.21
Nodes (16): backgroundBehind(), bakeFramedImage(), companionKey(), compileEmailHtml(), croppedCopyOf(), generated(), gridColumns(), inFlight (+8 more)

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
Cohesion: 0.36
Nodes (7): AUTH_ONLY, config, cookieOptions(), middleware(), PROTECTED, renewSession(), sameHost()

### Community 22 - "DashboardFrame.tsx"
Cohesion: 0.11
Nodes (8): DashboardFrame(), JourneysSection(), JourneyCreateWorkspace(), templates, initialNotifications, NotificationMenu(), ProductNotification, ProjectSettingsCenter()

### Community 23 - "EmailWorkspace.tsx"
Cohesion: 0.08
Nodes (21): CloseEmailEditor(), reorderByInsertionIndex(), Block, blockDefaults, BlockType, designOf(), dragCategories, DragCategory (+13 more)

### Community 24 - "BlockDesign.tsx"
Cohesion: 0.14
Nodes (17): BlockDesign(), DashboardBlockDesign(), DesignImage, DesignItem, FaApple, FileText, inlineDesign(), isDot() (+9 more)

### Community 25 - "SimpleEmailEditor.tsx"
Cohesion: 0.09
Nodes (22): EMAIL_TRANSLATION_LANGUAGES, EmailTranslationPanel(), DEFAULT_FOOTER_CONFIG, EditorItem, EmailKind, escapeFooterHtml(), FONT_OPTIONS, FONT_SIZE_OPTIONS (+14 more)

### Community 26 - "PushComposer.tsx"
Cohesion: 0.12
Nodes (13): DeleteConfirmDialog(), DeleteConfirmDialogProps, countries, languageCodes, languages, Mode, PushComposer(), SaveTarget (+5 more)

### Community 27 - "SendingDomainsPanel.tsx"
Cohesion: 0.06
Nodes (65): AddDomainDialog(), domainFromEmail(), email, Props, consumeCallbackParams(), PendingConnection, redirectToProvider(), rememberConnection() (+57 more)

### Community 28 - "DashboardSections.tsx"
Cohesion: 0.10
Nodes (18): AudienceGroupCreateDialog(), ChannelSection(), TeamSection(), guide, JourneyRow, journeyRows, JourneyStatus, JourneyWorkspace() (+10 more)

### Community 29 - "AudienceGroupWorkspace.tsx"
Cohesion: 0.13
Nodes (16): allCountries, AudienceGroupWorkspace(), backendField, backendOperator, Block, filters, makeBlock(), makeRule() (+8 more)

### Community 30 - "UserImportDialog.tsx"
Cohesion: 0.18
Nodes (10): Field, fields, headerLanguages, sources, UserImportDialog(), userImportApi, CustomPropertyDef, ImportMappingInput (+2 more)

### Community 31 - "useActiveProject"
Cohesion: 0.21
Nodes (13): CreateProjectDialog(), DangerZonePanel(), IntegrationsSection(), PushSection(), SettingsSection(), ProjectDetailsPanel(), useActiveProject(), useCreateProject() (+5 more)

### Community 32 - "UserDetailsWorkspace.tsx"
Cohesion: 0.16
Nodes (10): ActivityCard(), display(), formatDate(), metric(), UserDetailsWorkspace(), eventsApi, usersApi, EndUser (+2 more)

### Community 33 - "vercel.json"
Cohesion: 0.20
Nodes (9): hnd1, maxDuration, buildCommand, framework, functions, app/api/**/route.ts, installCommand, regions (+1 more)

### Community 34 - "projects/api.ts"
Cohesion: 0.07
Nodes (42): at(), EmailCampaignStats, EmailLanguageOption, EmailLanguages, EmailSuggestion, EmailTranslation, PushCampaignStats, PushDeepLink (+34 more)

### Community 35 - "TeamAccessPanel.tsx"
Cohesion: 0.13
Nodes (16): Confirm, InviteDialog(), MANAGE, MESSAGES, person(), ROLE_LABEL, ROLES, TeamAccessPanel() (+8 more)

### Community 36 - "auth.ts"
Cohesion: 0.29
Nodes (10): authApi, authKeys, ForgotPasswordInput, LoginInput, SignupInput, Account, AccountProject, ApiEnvelope (+2 more)

### Community 37 - "auth.schema.ts"
Cohesion: 0.14
Nodes (16): cardSx, RequestResetLink(), SetNewPassword(), useForgotPassword(), useResetPassword(), email, forgotPasswordSchema, loginSchema (+8 more)

### Community 38 - "AuditLogsPanel.tsx"
Cohesion: 0.17
Nodes (14): actorName(), AuditLogsPanel(), CATEGORY_COLOR, CATEGORY_LABEL, DetailsDrawer(), errorText(), fieldSx, fullDate() (+6 more)

### Community 39 - "GoogleCallback.tsx"
Cohesion: 0.12
Nodes (19): metadata, GoogleButton(), googleErrorMessage(), breathe, GoogleCallback(), pulse, rise, spin (+11 more)

### Community 40 - "LoginForm.tsx"
Cohesion: 0.13
Nodes (17): FormError(), Toast(), PasswordForm(), LoginForm(), PasswordField, SignupForm(), SubmitButton(), useChangePassword() (+9 more)

### Community 41 - "invitation-accept.test.tsx"
Cohesion: 0.29
Nodes (3): assign, logout, pending

### Community 43 - "useCurrentUser"
Cohesion: 0.36
Nodes (6): AccountMenu(), ChangePasswordForm(), SiteAccount(), SiteAccountDrawer(), useCurrentUser(), useLogout()

### Community 46 - "InvitationAccept.tsx"
Cohesion: 0.27
Nodes (8): accept(), ENDED, InvitationAccept(), loadPreview(), message(), MESSAGES, ROLE, State

### Community 49 - "EmailLanguageSettings.tsx"
Cohesion: 0.40
Nodes (5): EMAIL_LANGUAGE_NAMES, EmailLanguageSettings(), languageName(), ChoiceScreen(), EditorToolbar()

### Community 50 - "VerifyEmailView.tsx"
Cohesion: 0.19
Nodes (7): ResetPasswordView(), cardSx, VerifyEmailView(), AuthShell(), Logo(), useResendVerification(), useVerifyEmail()

### Community 52 - "AccountProfile.tsx"
Cohesion: 0.29
Nodes (6): AccountProfile(), display(), Preview, billingApi, teamApi, ProjectRole

### Community 53 - "use-active-project.ts"
Cohesion: 0.19
Nodes (10): DashboardSidebar(), navigation, planLabel(), ProjectId, projects, AppDispatch, RootState, SelectedProject (+2 more)

## Knowledge Gaps
- **255 isolated node(s):** `extends`, `next/core-web-vitals`, `metadata`, `posts`, `stories` (+250 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useActiveProject()` connect `useActiveProject` to `projectContext`, `LifecycleSegmentWorkspace.tsx`, `UserDetailsWorkspace.tsx`, `TeamAccessPanel.tsx`, `ProjectSettingsCenter.tsx`, `LoginForm.tsx`, `IntegrationDocumentation.tsx`, `AccountProfile.tsx`, `use-active-project.ts`, `DashboardFrame.tsx`, `EmailWorkspace.tsx`, `PushComposer.tsx`, `SendingDomainsPanel.tsx`, `DashboardSections.tsx`, `AudienceGroupWorkspace.tsx`, `UserImportDialog.tsx`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **Why does `useCurrentUser()` connect `useCurrentUser` to `TeamAccessPanel.tsx`, `auth.ts`, `ProjectSettingsCenter.tsx`, `LoginForm.tsx`, `InvitationAccept.tsx`, `VerifyEmailView.tsx`, `AccountProfile.tsx`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Why does `ApiError` connect `auth.ts` to `TeamAccessPanel.tsx`, `ProjectSettingsCenter.tsx`, `AuditLogsPanel.tsx`, `GoogleCallback.tsx`, `LoginForm.tsx`, `InvitationAccept.tsx`, `VerifyEmailView.tsx`, `SendingDomainsPanel.tsx`, `UserImportDialog.tsx`, `useActiveProject`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **What connects `extends`, `next/core-web-vitals`, `metadata` to the rest of the system?**
  _255 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `projectContext` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._
- **Should `server.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06349206349206349 - nodes in this community are weakly interconnected._
- **Should `SiteShell.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.055130784708249496 - nodes in this community are weakly interconnected._