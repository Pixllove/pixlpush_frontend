import type { Metadata } from "next";
import ApiRounded from "@mui/icons-material/ApiRounded";
import AutoAwesomeRounded from "@mui/icons-material/AutoAwesomeRounded";
import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";
import BoltRounded from "@mui/icons-material/BoltRounded";
import BuildCircleOutlined from "@mui/icons-material/BuildCircleOutlined";
import MenuBookRounded from "@mui/icons-material/MenuBookRounded";
import KeyRounded from "@mui/icons-material/KeyRounded";
import NotificationsActiveOutlined from "@mui/icons-material/NotificationsActiveOutlined";
import PhoneAndroidRounded from "@mui/icons-material/PhoneAndroidRounded";
import ShieldOutlined from "@mui/icons-material/ShieldOutlined";
import { Box, Stack, Typography } from "@mui/material";
import { tokens } from "@/lib/theme";
import CodeBlock from "@/components/docs/CodeBlock";
import { LinkCard } from "@/components/docs/DocsPrimitives";
import { LinkBox, LinkButton } from "@/components/docs/links";
import { guideHref, platforms } from "@/components/docs/registry";

export const metadata: Metadata = {
  title: "Developer docs | PixlPush",
  description: "Integrate PixlPush in React Native, Expo and Flutter: identify users, track events and attribute push notification opens.",
};

const hero = `import PixlPush from "@pixlpush/react-native";

await PixlPush.configure({
  sdkKey: process.env.EXPO_PUBLIC_PIXLPUSH_KEY!,
  environment: __DEV__ ? "development" : "production",
});

await PixlPush.identify({ externalUserId: user.id });
await PixlPush.track("onboarding_completed");`;

const rn = (slug = "", hash?: string) => guideHref("/docs", "react-native", slug, hash);

const steps = [
  { title: "Install", text: "@pixlpush/react-native and AsyncStorage.", href: rn("quickstart", "install") },
  { title: "Create a key", text: "A public SDK key per environment.", href: rn("quickstart", "key") },
  { title: "Configure once", text: "One module, one promise.", href: rn("quickstart", "configure") },
  { title: "Verify", text: "Identify, track, flush, check.", href: rn("quickstart", "verify") },
];

const cards = [
  { href: rn("quickstart"), icon: <BoltRounded />, title: "Quickstart", description: "From an empty app to a verified event." },
  { href: rn("ai-setup"), icon: <AutoAwesomeRounded />, title: "AI agent setup", description: "One prompt for Cursor, Claude Code, Copilot and more." },
  { href: rn("all"), icon: <MenuBookRounded />, title: "All docs on one page", description: "Every guide in one scroll, for reading or printing." },
  { href: rn("firebase"), icon: <NotificationsActiveOutlined />, title: "Firebase & push setup", description: "Every file and key push needs, step by step." },
  { href: rn("sdk-keys"), icon: <KeyRounded />, title: "SDK keys", description: "Create, rotate, revoke, delete." },
  { href: rn("reference"), icon: <ApiRounded />, title: "API reference", description: "Every method and error code." },
  { href: guideHref("/docs", "flutter", "quickstart"), icon: <PhoneAndroidRounded />, title: "Flutter SDK", description: "Flutter setup, Firebase push and automatic open attribution." },
  { href: rn("security"), icon: <ShieldOutlined />, title: "Security", description: "What is public and what never ships." },
  { href: rn("troubleshooting"), icon: <BuildCircleOutlined />, title: "Troubleshooting", description: "Symptoms, causes and fixes." },
];

const h2 = { color: tokens.text, fontSize: { xs: "var(--fs-24)", md: "var(--fs-28)" }, fontWeight: 600, letterSpacing: "var(--ls-display)" } as const;

export default function DocsHome() {
  return <Box sx={{ px: { xs: 2, sm: 4, md: 5 }, pt: { xs: 3, md: 5 }, pb: { xs: 8, md: 10 }, maxWidth: 1080 }}>
    <Box component="header" sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", lg: "minmax(0,1fr) minmax(0,1.05fr)" }, gap: { xs: 4, lg: 5 }, alignItems: "center" }}>
      <Box>
        <Typography component="p" sx={{ color: tokens.accent, fontSize: "var(--fs-12)", fontWeight: 600, letterSpacing: "var(--ls-overline)", textTransform: "uppercase" }}>PixlPush developer docs</Typography>
        <Typography component="h1" sx={{ mt: 1.5, color: tokens.text, fontSize: { xs: "var(--fs-32)", md: "var(--fs-48)" }, fontWeight: 600, lineHeight: 1.08, letterSpacing: "-0.035em" }}>Integrate PixlPush in your app.</Typography>
        <Typography sx={{ mt: 2, maxWidth: 480, color: tokens.textSecondary, fontSize: { xs: "var(--fs-16)", md: "var(--fs-18)" }, lineHeight: 1.65 }}>Identify users, track product events, keep data flowing offline, and attribute every push notification — with the React Native, Expo and Flutter SDKs.</Typography>
        <Stack direction={{ xs: "column", sm: "row" }} gap={1.5} sx={{ mt: 4, "& .MuiButton-root": { whiteSpace: "nowrap" } }}>
          <LinkButton href={rn("quickstart")} variant="contained" size="large">Start the quickstart</LinkButton>
        </Stack>
      </Box>
      <Box sx={{ minWidth: 0 }}><CodeBlock code={hero} filename="App.tsx" /></Box>
    </Box>

    <Box component="section" aria-labelledby="journey-title" sx={{ mt: { xs: 7, md: 9 } }}>
      <Typography id="journey-title" component="h2" sx={h2}>Four steps to a working integration</Typography>
      <Box component="ol" sx={{ m: 0, mt: 3, p: 0, listStyle: "none", display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2,1fr)", lg: "repeat(4,1fr)" }, border: `1px solid ${tokens.border}`, borderRadius: 2, overflow: "hidden" }}>
        {steps.map((step, index) => <Box component="li" key={step.title} sx={{ borderRight: { lg: index < 3 ? `1px solid ${tokens.border}` : 0 }, borderBottom: { xs: index < 3 ? `1px solid ${tokens.border}` : 0, lg: 0 } }}>
          <LinkBox href={step.href} sx={{ display: "block", height: "100%", p: 2.5, color: "inherit", textDecoration: "none", transition: "background-color var(--pp-ease)", "&:hover": { bgcolor: tokens.subtle }, "&:focus-visible": { outline: `2px solid ${tokens.accent}`, outlineOffset: -2 } }}>
            <Typography fontFamily="var(--pp-mono)" fontSize="var(--fs-12)" color={tokens.accent}>0{index + 1}</Typography>
            <Typography component="h3" fontWeight={600} fontSize="var(--fs-16)" color={tokens.text} sx={{ mt: 1.5 }}>{step.title}</Typography>
            <Typography fontSize="var(--fs-14)" color={tokens.textSecondary} sx={{ mt: .5 }}>{step.text}</Typography>
          </LinkBox>
        </Box>)}
      </Box>
    </Box>

    <Box component="section" aria-labelledby="explore-title" sx={{ mt: { xs: 7, md: 9 } }}>
      <Typography id="explore-title" component="h2" sx={h2}>Explore</Typography>
      <Box sx={{ mt: 3, display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2,1fr)", lg: "repeat(3,1fr)" }, gap: 2 }}>
        {cards.map((card) => <LinkCard key={card.href} {...card} />)}
      </Box>
    </Box>

    <Box component="section" aria-labelledby="platforms-title" sx={{ mt: { xs: 7, md: 9 } }}>
      <Typography id="platforms-title" component="h2" sx={h2}>Platforms</Typography>
      <Stack component="ul" sx={{ m: 0, mt: 3, p: 0, listStyle: "none", border: `1px solid ${tokens.border}`, borderRadius: 2 }}>
        {platforms.map((platform, index) => <Stack component="li" key={platform.id} direction="row" alignItems="center" gap={2} sx={{ px: 2, minHeight: 56, borderTop: index ? `1px solid ${tokens.border}` : 0 }}>
          {platform.status === "available"
            ? <LinkBox href={rn()} sx={{ flex: 1, py: 1.5, color: tokens.text, fontWeight: 600, fontSize: "var(--fs-14)", textDecoration: "none", "&:hover": { color: tokens.accent } }}>{platform.label} <Box component="span" sx={{ color: tokens.textSecondary, fontWeight: 400 }}>— {platform.description}</Box></LinkBox>
            : <Typography sx={{ flex: 1, color: tokens.textSecondary, fontSize: "var(--fs-14)" }}>{platform.label}</Typography>}
          <Box component="span" sx={{ px: 1, py: .25, borderRadius: 999, fontSize: "var(--fs-12)", fontWeight: 500, bgcolor: platform.status === "available" ? tokens.successSoft : tokens.subtle, color: platform.status === "available" ? tokens.success : tokens.textSecondary, whiteSpace: "nowrap" }}>{platform.status === "available" ? `v${platform.version}` : "Coming soon"}</Box>
        </Stack>)}
      </Stack>
    </Box>
  </Box>;
}
