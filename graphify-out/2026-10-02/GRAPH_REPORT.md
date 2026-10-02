# Graph Report - pixlpush_frontend  (2026-10-02)

## Corpus Check
- 169 files · ~276,875 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 902 nodes · 1801 edges · 50 communities (44 shown, 6 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 8 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b1dd4e47`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- auth.ts
- auth.schema.ts
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
- DashboardSections.tsx
- EmailWorkspace.tsx
- BlockDesign.tsx
- SimpleEmailEditor.tsx
- PushComposer.tsx
- SendingDomainsPanel.tsx
- VerifyEmailView.tsx
- AudienceGroupWorkspace.tsx
- UserImportDialog.tsx
- use-active-project.ts
- UserDetailsWorkspace.tsx
- useActiveProject
- projects/api.ts
- ResetPasswordView.tsx
- AuthShell.tsx
- LoginForm.tsx
- TeamAccessPanel.tsx
- isPermanentAuthError
- use-projects.ts
- JourneyWorkspace.tsx
- InvitationAccept.tsx
- create/page.tsx
- firebase.ts
- EmailLanguageSettings.tsx
- useCurrentUser
- DashboardFrame.tsx

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

### Community 0 - "auth.ts"
Cohesion: 0.29
Nodes (10): authApi, authKeys, ForgotPasswordInput, LoginInput, SignupInput, Account, AccountProject, ApiEnvelope (+2 more)

### Community 1 - "auth.schema.ts"
Cohesion: 0.16
Nodes (14): PasswordForm(), useChangePassword(), ChangePasswordInput, changePasswordSchema, email, loginSchema, newPassword, ResendVerificationInput (+6 more)

### Community 2 - "server.ts"
Cohesion: 0.06
Nodes (44): GET(), Params, ChangePasswordData, POST(), POST(), LoginData, POST(), LoginData (+36 more)

### Community 3 - "SiteShell.tsx"
Cohesion: 0.06
Nodes (20): posts, stories, topics, terms, items, HeroLightTrails(), HeroSection(), HomePage() (+12 more)

### Community 4 - "ProjectSettingsCenter.tsx"
Cohesion: 0.15
Nodes (19): CONFIG_ROLES, EmailPanel(), STATUS, CONFIG_ROLES, FirebasePanel(), panels, tabs, date() (+11 more)

### Community 5 - "dependencies"
Cohesion: 0.06
Nodes (31): @emotion/react, @emotion/styled, firebase, @hookform/resolvers, @mui/icons-material, @mui/material, dependencies, @emotion/react (+23 more)

### Community 6 - "compilerOptions"
Cohesion: 0.07
Nodes (27): dom, dom.iterable, esnext, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts, **/*.tsx (+19 more)

### Community 7 - "emailExport.ts"
Cohesion: 0.27
Nodes (12): bakeFramedImage(), compileEmailHtml(), generated(), gridColumns(), layoutAsTable(), loadImage(), remember(), remembered() (+4 more)

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

### Community 22 - "DashboardSections.tsx"
Cohesion: 0.09
Nodes (19): metadata, AudienceGroupCreateDialog(), EmailSection(), OverviewSection(), TeamSection(), UsersSection(), EventOption, LifecycleSegmentCreateDialog() (+11 more)

### Community 23 - "EmailWorkspace.tsx"
Cohesion: 0.08
Nodes (20): reorderByInsertionIndex(), Block, blockDefaults, BlockType, designOf(), dragCategories, DragCategory, dragCategoryIcons (+12 more)

### Community 24 - "BlockDesign.tsx"
Cohesion: 0.14
Nodes (17): BlockDesign(), DashboardBlockDesign(), DesignImage, DesignItem, FaApple, FileText, inlineDesign(), isDot() (+9 more)

### Community 25 - "SimpleEmailEditor.tsx"
Cohesion: 0.10
Nodes (20): CloseEmailEditor(), DEFAULT_FOOTER_CONFIG, EditorItem, EmailKind, escapeFooterHtml(), FONT_OPTIONS, FONT_SIZE_OPTIONS, FOOTER_OPTIONS (+12 more)

### Community 26 - "PushComposer.tsx"
Cohesion: 0.12
Nodes (13): DeleteConfirmDialog(), DeleteConfirmDialogProps, countries, languageCodes, languages, Mode, PushComposer(), SaveTarget (+5 more)

### Community 27 - "SendingDomainsPanel.tsx"
Cohesion: 0.06
Nodes (65): AddDomainDialog(), domainFromEmail(), email, Props, consumeCallbackParams(), PendingConnection, redirectToProvider(), rememberConnection() (+57 more)

### Community 28 - "VerifyEmailView.tsx"
Cohesion: 0.26
Nodes (7): SubmitButton(), cardSx, VerifyEmailView(), CreateProjectDialog(), useResendVerification(), useVerifyEmail(), useCreateProject()

### Community 29 - "AudienceGroupWorkspace.tsx"
Cohesion: 0.13
Nodes (16): allCountries, AudienceGroupWorkspace(), backendField, backendOperator, Block, filters, makeBlock(), makeRule() (+8 more)

### Community 30 - "UserImportDialog.tsx"
Cohesion: 0.18
Nodes (10): Field, fields, headerLanguages, sources, UserImportDialog(), userImportApi, CustomPropertyDef, ImportMappingInput (+2 more)

### Community 31 - "use-active-project.ts"
Cohesion: 0.36
Nodes (5): AppDispatch, RootState, SelectedProject, uiReducer, uiSlice

### Community 32 - "UserDetailsWorkspace.tsx"
Cohesion: 0.16
Nodes (10): ActivityCard(), display(), formatDate(), metric(), UserDetailsWorkspace(), eventsApi, usersApi, EndUser (+2 more)

### Community 33 - "useActiveProject"
Cohesion: 0.15
Nodes (8): IntegrationsSection(), PushSection(), SettingsSection(), IntegrationDocumentation(), LifecycleSegmentWorkspace(), metric(), useActiveProject(), lifecycleSegmentsApi

### Community 34 - "projects/api.ts"
Cohesion: 0.07
Nodes (42): at(), EmailCampaignStats, EmailLanguageOption, EmailLanguages, EmailSuggestion, EmailTranslation, PushCampaignStats, PushDeepLink (+34 more)

### Community 35 - "ResetPasswordView.tsx"
Cohesion: 0.19
Nodes (10): FormError(), Toast(), cardSx, RequestResetLink(), SetNewPassword(), useForgotPassword(), useResetPassword(), forgotPasswordSchema (+2 more)

### Community 36 - "AuthShell.tsx"
Cohesion: 0.23
Nodes (3): ResetPasswordView(), AuthShell(), Logo()

### Community 37 - "LoginForm.tsx"
Cohesion: 0.23
Nodes (12): GoogleButton(), LoginForm(), PasswordField, SignupForm(), useClearOnRestore(), startSession(), useGoogleLogin(), useLogin() (+4 more)

### Community 38 - "TeamAccessPanel.tsx"
Cohesion: 0.08
Nodes (29): actorName(), AuditLogsPanel(), CATEGORY_COLOR, CATEGORY_LABEL, DetailsDrawer(), errorText(), fieldSx, fullDate() (+21 more)

### Community 39 - "isPermanentAuthError"
Cohesion: 0.23
Nodes (7): metadata, AppProviders(), QueryProvider(), useProjects(), isPermanentAuthError(), store, theme

### Community 40 - "use-projects.ts"
Cohesion: 0.38
Nodes (7): DangerZonePanel(), ProjectDetailsPanel(), useProject(), useProjectStatus(), useUpdateProject(), projectApi, ProjectEnvironment

### Community 41 - "JourneyWorkspace.tsx"
Cohesion: 0.24
Nodes (8): guide, JourneyRow, journeyRows, JourneyStatus, JourneyWorkspace(), DataTableColumn, ReusableDataTable(), ReusableDataTableProps

### Community 42 - "InvitationAccept.tsx"
Cohesion: 0.13
Nodes (13): accept(), ENDED, InvitationAccept(), loadPreview(), message(), MESSAGES, Preview, ROLE (+5 more)

### Community 47 - "firebase.ts"
Cohesion: 0.47
Nodes (5): config, firebaseApp(), getGoogleRedirectIdToken(), isGoogleSignInConfigured, startGoogleRedirect()

### Community 49 - "EmailLanguageSettings.tsx"
Cohesion: 0.22
Nodes (8): EMAIL_LANGUAGE_NAMES, EmailLanguageSettings(), languageName(), EMAIL_TRANSLATION_LANGUAGES, EmailTranslationPanel(), ChoiceScreen(), EditorToolbar(), emailApi

### Community 52 - "useCurrentUser"
Cohesion: 0.23
Nodes (8): AccountMenu(), AccountProfile(), display(), ChangePasswordForm(), useCurrentUser(), useLogout(), billingApi, teamApi

### Community 53 - "DashboardFrame.tsx"
Cohesion: 0.09
Nodes (11): DashboardFrame(), BillingSection(), ChannelSection(), JourneysSection(), DashboardSidebar(), navigation, initialNotifications, NotificationMenu() (+3 more)

## Knowledge Gaps
- **241 isolated node(s):** `extends`, `next/core-web-vitals`, `metadata`, `posts`, `stories` (+236 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useActiveProject()` connect `useActiveProject` to `UserDetailsWorkspace.tsx`, `ProjectSettingsCenter.tsx`, `TeamAccessPanel.tsx`, `isPermanentAuthError`, `use-projects.ts`, `useCurrentUser`, `DashboardFrame.tsx`, `DashboardSections.tsx`, `EmailWorkspace.tsx`, `PushComposer.tsx`, `SendingDomainsPanel.tsx`, `AudienceGroupWorkspace.tsx`, `UserImportDialog.tsx`, `use-active-project.ts`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Why does `ApiError` connect `auth.ts` to `ProjectSettingsCenter.tsx`, `LoginForm.tsx`, `TeamAccessPanel.tsx`, `use-projects.ts`, `InvitationAccept.tsx`, `SendingDomainsPanel.tsx`, `VerifyEmailView.tsx`, `UserImportDialog.tsx`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Why does `authRequest()` connect `SendingDomainsPanel.tsx` to `auth.ts`, `projects/api.ts`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **What connects `extends`, `next/core-web-vitals`, `metadata` to the rest of the system?**
  _241 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `server.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06349206349206349 - nodes in this community are weakly interconnected._
- **Should `SiteShell.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.055130784708249496 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.06451612903225806 - nodes in this community are weakly interconnected._