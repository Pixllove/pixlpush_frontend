# Graph Report - pixlpush_frontend  (2026-10-02)

## Corpus Check
- 171 files · ~277,600 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 913 nodes · 1826 edges · 50 communities (44 shown, 6 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 8 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4ce16cbb`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- create/page.tsx
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
- DashboardSections.tsx
- AudienceGroupWorkspace.tsx
- UserImportDialog.tsx
- DashboardFrame.tsx
- UserDetailsWorkspace.tsx
- projects/api.ts
- TeamAccessPanel.tsx
- auth.ts
- auth.schema.ts
- AuditLogsPanel.tsx
- GoogleButton.tsx
- LoginForm.tsx
- JourneyWorkspace.tsx
- invitation-accept.test.tsx
- AuthFeedback.tsx
- InvitationAccept.tsx
- EmailLanguageSettings.tsx
- AuthShell.tsx
- account/page.tsx
- useActiveProject

## God Nodes (most connected - your core abstractions)
1. `useActiveProject()` - 44 edges
2. `ApiError` - 24 edges
3. `callBackend()` - 23 edges
4. `authRequest()` - 21 edges
5. `DashboardFrame()` - 19 edges
6. `compilerOptions` - 17 edges
7. `callBackendWithRefresh()` - 16 edges
8. `SiteShell()` - 14 edges
9. `useCurrentUser()` - 14 edges
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

## Communities (50 total, 6 thin omitted)

### Community 1 - "LifecycleSegmentWorkspace.tsx"
Cohesion: 0.38
Nodes (3): LifecycleSegmentWorkspace(), metric(), lifecycleSegmentsApi

### Community 2 - "server.ts"
Cohesion: 0.07
Nodes (43): GET(), Params, ChangePasswordData, POST(), POST(), LoginData, POST(), LoginData (+35 more)

### Community 3 - "SiteShell.tsx"
Cohesion: 0.06
Nodes (20): posts, stories, topics, terms, items, HeroLightTrails(), HeroSection(), HomePage() (+12 more)

### Community 4 - "ProjectSettingsCenter.tsx"
Cohesion: 0.08
Nodes (31): metadata, AppProviders(), DangerZonePanel(), CONFIG_ROLES, EmailPanel(), STATUS, CONFIG_ROLES, FirebasePanel() (+23 more)

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

### Community 22 - "DashboardFrame"
Cohesion: 0.09
Nodes (5): DashboardFrame(), ChannelSection(), JourneysSection(), TeamSection(), ProjectSettingsCenter()

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
Nodes (16): metadata, AudienceGroupCreateDialog(), BillingSection(), EmailSection(), OverviewSection(), UsersSection(), EventOption, LifecycleSegmentCreateDialog() (+8 more)

### Community 29 - "AudienceGroupWorkspace.tsx"
Cohesion: 0.13
Nodes (16): allCountries, AudienceGroupWorkspace(), backendField, backendOperator, Block, filters, makeBlock(), makeRule() (+8 more)

### Community 30 - "UserImportDialog.tsx"
Cohesion: 0.18
Nodes (10): Field, fields, headerLanguages, sources, UserImportDialog(), userImportApi, CustomPropertyDef, ImportMappingInput (+2 more)

### Community 31 - "DashboardFrame.tsx"
Cohesion: 0.17
Nodes (13): CreateProjectDialog(), DashboardSidebar(), navigation, initialNotifications, NotificationMenu(), ProductNotification, planLabel(), useCreateProject() (+5 more)

### Community 32 - "UserDetailsWorkspace.tsx"
Cohesion: 0.19
Nodes (8): ActivityCard(), display(), formatDate(), metric(), UserDetailsWorkspace(), eventsApi, usersApi, UserActivity

### Community 34 - "projects/api.ts"
Cohesion: 0.07
Nodes (46): at(), EmailCampaignStats, EmailLanguageOption, EmailLanguages, EmailSuggestion, EmailTranslation, projectApi, projectKeys (+38 more)

### Community 35 - "TeamAccessPanel.tsx"
Cohesion: 0.13
Nodes (17): Preview, EmailDataSection(), Confirm, date(), InviteDialog(), MANAGE, MESSAGES, person() (+9 more)

### Community 36 - "auth.ts"
Cohesion: 0.23
Nodes (13): startSession(), useGoogleLogin(), useLogin(), authApi, authKeys, ForgotPasswordInput, LoginInput, SignupInput (+5 more)

### Community 37 - "auth.schema.ts"
Cohesion: 0.17
Nodes (13): PasswordForm(), useChangePassword(), ChangePasswordInput, changePasswordSchema, email, loginSchema, newPassword, resendVerificationSchema (+5 more)

### Community 38 - "AuditLogsPanel.tsx"
Cohesion: 0.11
Nodes (19): actorName(), AuditLogsPanel(), CATEGORY_COLOR, CATEGORY_LABEL, DetailsDrawer(), errorText(), fieldSx, fullDate() (+11 more)

### Community 39 - "GoogleButton.tsx"
Cohesion: 0.19
Nodes (12): metadata, GoogleButton(), googleErrorMessage(), GoogleCallback(), config, firebaseApp(), getGoogleRedirectIdToken(), GOOGLE_CALLBACK_PATH (+4 more)

### Community 40 - "LoginForm.tsx"
Cohesion: 0.17
Nodes (16): FormError(), LoginForm(), PasswordField, cardSx, RequestResetLink(), SetNewPassword(), SignupForm(), SubmitButton() (+8 more)

### Community 41 - "JourneyWorkspace.tsx"
Cohesion: 0.24
Nodes (8): guide, JourneyRow, journeyRows, JourneyStatus, JourneyWorkspace(), DataTableColumn, ReusableDataTable(), ReusableDataTableProps

### Community 42 - "invitation-accept.test.tsx"
Cohesion: 0.29
Nodes (3): assign, logout, pending

### Community 43 - "AuthFeedback.tsx"
Cohesion: 0.31
Nodes (6): Toast(), cardSx, VerifyEmailView(), useResendVerification(), useVerifyEmail(), ResendVerificationInput

### Community 46 - "InvitationAccept.tsx"
Cohesion: 0.21
Nodes (11): AccountMenu(), accept(), ENDED, InvitationAccept(), loadPreview(), message(), MESSAGES, ROLE (+3 more)

### Community 49 - "EmailLanguageSettings.tsx"
Cohesion: 0.40
Nodes (5): EMAIL_LANGUAGE_NAMES, EmailLanguageSettings(), languageName(), ChoiceScreen(), EditorToolbar()

### Community 50 - "AuthShell.tsx"
Cohesion: 0.23
Nodes (3): ResetPasswordView(), AuthShell(), Logo()

### Community 52 - "account/page.tsx"
Cohesion: 0.40
Nodes (3): AccountProfile(), display(), ChangePasswordForm()

### Community 53 - "useActiveProject"
Cohesion: 0.22
Nodes (6): IntegrationsSection(), PushSection(), SettingsSection(), IntegrationDocumentation(), useActiveProject(), useProjects()

## Knowledge Gaps
- **244 isolated node(s):** `extends`, `next/core-web-vitals`, `metadata`, `posts`, `stories` (+239 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useActiveProject()` connect `useActiveProject` to `UserDetailsWorkspace.tsx`, `LifecycleSegmentWorkspace.tsx`, `TeamAccessPanel.tsx`, `ProjectSettingsCenter.tsx`, `account/page.tsx`, `DashboardFrame`, `EmailWorkspace.tsx`, `PushComposer.tsx`, `SendingDomainsPanel.tsx`, `DashboardSections.tsx`, `AudienceGroupWorkspace.tsx`, `UserImportDialog.tsx`, `DashboardFrame.tsx`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Why does `ApiError` connect `auth.ts` to `projects/api.ts`, `TeamAccessPanel.tsx`, `ProjectSettingsCenter.tsx`, `AuditLogsPanel.tsx`, `GoogleButton.tsx`, `LoginForm.tsx`, `AuthFeedback.tsx`, `InvitationAccept.tsx`, `SendingDomainsPanel.tsx`, `UserImportDialog.tsx`, `DashboardFrame.tsx`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Why does `authRequest()` connect `SendingDomainsPanel.tsx` to `projects/api.ts`, `auth.ts`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **What connects `extends`, `next/core-web-vitals`, `metadata` to the rest of the system?**
  _244 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `server.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06504494976203067 - nodes in this community are weakly interconnected._
- **Should `SiteShell.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.055130784708249496 - nodes in this community are weakly interconnected._
- **Should `ProjectSettingsCenter.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08282828282828283 - nodes in this community are weakly interconnected._