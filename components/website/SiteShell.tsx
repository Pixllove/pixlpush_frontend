"use client";

import { useState } from "react";
import NextLink from "next/link";
import {
  AppBar,
  Box,
  Button,
  Container,
  Drawer,
  IconButton,
  Link,
  Paper,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import MenuRounded from "@mui/icons-material/MenuRounded";
import KeyboardArrowDownRounded from "@mui/icons-material/KeyboardArrowDownRounded";
import AutoAwesomeRounded from "@mui/icons-material/AutoAwesomeRounded";
import CampaignRounded from "@mui/icons-material/CampaignRounded";
import InsightsRounded from "@mui/icons-material/InsightsRounded";
import AccountTreeRounded from "@mui/icons-material/AccountTreeRounded";
import TranslateRounded from "@mui/icons-material/TranslateRounded";
import EditNoteRounded from "@mui/icons-material/EditNoteRounded";
import NotificationsActiveRounded from "@mui/icons-material/NotificationsActiveRounded";
import LanguageRounded from "@mui/icons-material/LanguageRounded";
import EmailRounded from "@mui/icons-material/EmailRounded";
import MarkChatUnreadRounded from "@mui/icons-material/MarkChatUnreadRounded";
import GroupsRounded from "@mui/icons-material/GroupsRounded";
import ArticleRounded from "@mui/icons-material/ArticleRounded";
import AutoStoriesRounded from "@mui/icons-material/AutoStoriesRounded";
import MenuBookRounded from "@mui/icons-material/MenuBookRounded";
import CodeRounded from "@mui/icons-material/CodeRounded";
import LightbulbRounded from "@mui/icons-material/LightbulbRounded";
import CompareArrowsRounded from "@mui/icons-material/CompareArrowsRounded";
import SportsEsportsRounded from "@mui/icons-material/SportsEsportsRounded";
import NewspaperRounded from "@mui/icons-material/NewspaperRounded";
import ShoppingBagRounded from "@mui/icons-material/ShoppingBagRounded";
import PhoneIphoneRounded from "@mui/icons-material/PhoneIphoneRounded";
import AccountBalanceRounded from "@mui/icons-material/AccountBalanceRounded";
import { SiteAccount, SiteAccountDrawer } from "./SiteAccount";
import SupportChatWidget from "./SupportChatWidget";

const links = [
  ["Product", "/product"],
  ["How It Works", "/how-it-works"],
  ["Use Cases", "/use-cases"],
  ["Pricing", "/pricing"],
];
type MenuGroup = {
  title: string;
  items: [string, string, string, (typeof AutoAwesomeRounded)?][];
};

const productGroups: MenuGroup[] = [
  {
    title: "Platform",
    items: [
      ["Campaigns", "Personalized email and push campaigns.", "/product"],
      ["Audiences", "Build precise, reusable audience groups.", "/product"],
      [
        "Journey automations",
        "Respond to user behavior in real time.",
        "/product",
      ],
      ["Analytics", "Measure the moments that matter.", "/product"],
    ],
  },
  {
    title: "AI features",
    items: [
      [
        "Smart translations",
        "Reach users in their preferred language.",
        "/product",
      ],
      ["Customized journeys", "Adapt messaging to user response.", "/product"],
      ["Journey analysis", "See what to improve next.", "/product"],
    ],
  },
];
const resourceGroups: MenuGroup[] = [
  {
    title: "Learn",
    items: [
      ["Blog", "Ideas for activation, retention and growth.", "/blog", ArticleRounded],
      [
        "Customer case studies",
        "See how digital products grow with PixlPush.",
        "/customer-case-studies",
        AutoStoriesRounded,
      ],
      [
        "Use cases",
        "Explore journeys for every lifecycle moment.",
        "/use-cases",
        LightbulbRounded,
      ],
      [
        "Developer documentation",
        "Guides and API references to integrate PixlPush.",
        "/docs",
        CodeRounded,
      ],
    ],
  },
  {
    title: "Explore",
    items: [
      [
        "Why PixlPush",
        "The thinking behind a better retention loop.",
        "/why-pixlpush",
        AutoAwesomeRounded,
      ],
      [
        "ROI if switching",
        "Build the business case for making a change.",
        "/roi-if-switching",
        CompareArrowsRounded,
      ],
      ["Glossary", "Clear definitions for lifecycle marketing.", "/glossary", MenuBookRounded],
    ],
  },
];
export function Logo() {
  return (
    <NextLink
      href="/"
      prefetch
      aria-label="PixlPush home"
      style={{ display: "inline-flex", alignItems: "center" }}
    >
      <Box
        component="img"
        src="/assets/logo-header.png"
        alt="PixlPush"
        sx={{ display: "block", width: { xs: 135, sm: 155 }, height: "auto" }}
      />
    </NextLink>
  );
}
function MegaMenu({ kind }: { kind: "product" | "resources" | "usecases" }) {
  const groups = kind === "product" ? productGroups : resourceGroups;
  if (kind === "product") {
    const capabilities = [
      { title: "Max · Growth Concierge", description: "Coordinates your AI team and growth strategy.", image: "/assets/agent-avatar-max-v2.png", icon: AutoAwesomeRounded },
      { title: "Ben · Lifecycle Analyst", description: "Finds retention trends, churn signals and audience insights.", image: "/assets/agent-avatar-ben-v2.png", icon: InsightsRounded },
      { title: "Nova · Journey Creator", description: "Builds personalized email and push journeys.", image: "/assets/agent-avatar-nova-v2.png", icon: AccountTreeRounded },
      { title: "Anna · Campaign Expert", description: "Creates campaign concepts, copy and cross-sell ideas.", image: "/assets/agent-avatar-anna-v3.png", icon: CampaignRounded },
      { title: "AI Campaign Translator", description: "Adapt campaigns for every user’s language.", icon: TranslateRounded },
      { title: "AI Email Generator", description: "Create polished email copy for your campaigns.", icon: EditNoteRounded },
    ];
    const channels = [
      { title: "Mobile push notifications", icon: NotificationsActiveRounded },
      { title: "Web push notifications", icon: LanguageRounded },
      { title: "Email", icon: EmailRounded },
      { title: "In-app messaging", icon: MarkChatUnreadRounded },
    ];
    const platformFeatures = [
      { title: "Email campaigns", icon: EmailRounded },
      { title: "Push notification campaigns", icon: NotificationsActiveRounded },
      { title: "Journey automation", icon: AccountTreeRounded },
      { title: "User segmentation & audiences", icon: GroupsRounded },
      { title: "Analytics & reporting", icon: InsightsRounded },
    ];
    return (
      <Paper elevation={0} sx={{ position: "absolute", top: "calc(100% + 1px)", left: 0, right: 0, borderRadius: "0 0 24px 24px", border: "1px solid rgba(255,255,255,.12)", borderTop: 0, bgcolor: "#160d20", color: "#f8f3fc", px: { md: 4, lg: 7 }, py: 4, boxShadow: "0 30px 70px rgba(12,5,22,.55)" }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1.4fr) minmax(0, 1fr) minmax(185px, .75fr)" }, gap: { xs: 3, md: 3.5 }, maxWidth: 1320, mx: "auto" }}>
          <Box>
            <Typography sx={{ color: "#c4b6d0", fontWeight: 700, fontSize: "var(--fs-12)", letterSpacing: ".12em", textTransform: "uppercase", mb: 1.5 }}>AI marketing capabilities</Typography>
            <Link href="/product" underline="none" sx={{ display: "flex", gap: 2, alignItems: "center", p: 1.5, mb: 1.3, borderRadius: 3, color: "#f8f3fc", background: "linear-gradient(100deg,rgba(255,198,109,.13),rgba(255,145,79,.06))", border: "1px solid rgba(255,190,94,.2)", transition: "background .18s,border-color .18s", "&:hover": { background: "linear-gradient(100deg,rgba(255,198,109,.2),rgba(255,145,79,.1))", borderColor: "rgba(255,190,94,.42)" } }}>
              <Box><Typography fontWeight={750} fontSize="var(--fs-16)">Your AI marketing team</Typography><Typography sx={{ color: "#c4b6d0", mt: .35 }} fontSize="var(--fs-13)">Meet Max, Ben, Nova and Anna — AI marketers for smarter campaigns, journeys and growth.</Typography></Box>
            </Link>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: .7 }}>
              {capabilities.map(({ title, description, image, icon: Icon }) => (
                <Link key={title} href="/product" underline="none" sx={{ display: "flex", alignItems: "flex-start", gap: 1.3, p: 1.15, borderRadius: 2, color: "#f8f3fc", transition: "background .15s", "&:hover": { bgcolor: "rgba(255,255,255,.07)" } }}>
                  <Box sx={{ display: "grid", placeItems: "center", flex: "0 0 38px", width: 38, height: 38, borderRadius: "50%", overflow: "hidden", color: "#21152d", background: image ? "#38264b" : "linear-gradient(145deg,#ffd36e,#ff914f)", border: image ? "2px solid rgba(255,198,109,.72)" : "none", "& svg": { fontSize: 19 } }}>{image ? <Box component="img" src={image} alt="" sx={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }} /> : <Icon />}</Box>
                  <Box><Typography fontWeight={700} fontSize="var(--fs-13)">{title}</Typography><Typography sx={{ mt: .25, color: "#b9abc5", lineHeight: 1.4 }} fontSize="var(--fs-12)">{description}</Typography></Box>
                </Link>
              ))}
            </Box>
          </Box>
          <Box sx={{ pl: { md: 3 }, borderLeft: { md: "1px solid rgba(226,207,247,.14)" } }}>
            <Typography sx={{ color: "#c4b6d0", fontWeight: 700, fontSize: "var(--fs-12)", letterSpacing: ".12em", textTransform: "uppercase", mb: 1.5 }}>Platform capabilities</Typography>
            <Stack gap={.45}>
              {platformFeatures.map(({ title, icon: Icon }) => (
                <Link key={title} href="/product" underline="none" sx={{ display: "flex", alignItems: "center", gap: 1.2, p: 1, borderRadius: 2, color: "#f8f3fc", transition: "background .15s", "&:hover": { bgcolor: "rgba(255,255,255,.07)" } }}>
                  <Box sx={{ display: "grid", placeItems: "center", flex: "0 0 32px", width: 32, height: 32, borderRadius: 1.7, color: "#21152d", background: "linear-gradient(145deg,#ffd36e,#ff914f)", "& svg": { fontSize: 18 } }}><Icon /></Box>
                  <Typography fontWeight={700} fontSize="var(--fs-13)">{title}</Typography>
                </Link>
              ))}
            </Stack>
          </Box>
          <Box sx={{ pl: { md: 3 }, borderLeft: { md: "1px solid rgba(226,207,247,.14)" } }}>
            <Typography sx={{ color: "#c4b6d0", fontWeight: 700, fontSize: "var(--fs-12)", letterSpacing: ".12em", textTransform: "uppercase", mb: 1.5 }}>Channels</Typography>
            <Stack gap={.7}>
              {channels.map(({ title, icon: Icon }) => (
                <Link key={title} href="/product" underline="none" sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 1.25, borderRadius: 2.2, color: "#f8f3fc", transition: "background .15s,transform .15s", "&:hover": { bgcolor: "rgba(255,255,255,.07)", transform: "translateX(3px)" } }}>
                  <Box sx={{ display: "grid", placeItems: "center", width: 38, height: 38, borderRadius: 2, color: "#21152d", background: "linear-gradient(145deg,#ffd36e,#ff914f)", "& svg": { fontSize: 20 } }}><Icon /></Box>
                  <Typography fontWeight={700} fontSize="var(--fs-14)">{title}</Typography>
                </Link>
              ))}
            </Stack>
            <Link href="/product" underline="none" sx={{ display: "inline-flex", alignItems: "center", mt: 1.8, px: 1.25, py: .8, borderRadius: 2, color: "#ffc66d", fontWeight: 700, fontSize: "var(--fs-13)", "&:hover": { bgcolor: "rgba(255,198,109,.09)" } }}>Explore the platform →</Link>
          </Box>
        </Box>
      </Paper>
    );
  }
  if (kind === "usecases") {
    const useCases = [
      { title: "Complete onboarding", description: "Help new users reach their first success.", icon: AccountTreeRounded },
      { title: "Increase engagement", description: "Bring users back with timely, relevant messages.", icon: MarkChatUnreadRounded },
      { title: "Improve retention", description: "Build habits and reduce churn across the lifecycle.", icon: InsightsRounded },
      { title: "Reduce paywall drop-off", description: "Re-engage users who leave before subscribing.", icon: CampaignRounded },
      { title: "Grow revenue with upselling", description: "Promote relevant upgrades to the right users.", icon: CampaignRounded },
    ];
    return (
      <Paper elevation={0} sx={{ position: "absolute", top: "calc(100% + 1px)", left: 0, right: 0, borderRadius: "0 0 24px 24px", border: "1px solid rgba(255,255,255,.12)", borderTop: 0, bgcolor: "#160d20", color: "#f8f3fc", px: { md: 4, lg: 7 }, py: 3.5, boxShadow: "0 30px 70px rgba(12,5,22,.55)" }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1.5fr) minmax(190px, .62fr) minmax(250px, .8fr)" }, gap: { xs: 3, md: 4 }, maxWidth: 1220, mx: "auto" }}>
          <Box>
            <Typography sx={{ color: "#c4b6d0", fontWeight: 700, fontSize: "var(--fs-12)", letterSpacing: ".12em", textTransform: "uppercase", mb: 1.2 }}>What you can achieve with journey automations</Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: .6 }}>
              {useCases.map(({ title, description, icon: Icon }) => (
                <Link key={title} href="/use-cases" underline="none" sx={{ display: "flex", alignItems: "flex-start", gap: 1.3, p: 1.2, borderRadius: 2.2, color: "#f8f3fc", transition: "background .15s", "&:hover": { bgcolor: "rgba(255,255,255,.07)" } }}>
                  <Box sx={{ display: "grid", placeItems: "center", flex: "0 0 36px", width: 36, height: 36, borderRadius: 1.8, color: "#21152d", background: "linear-gradient(145deg,#ffd36e,#ff914f)", "& svg": { fontSize: 19 } }}><Icon /></Box>
                  <Box><Typography fontWeight={700} fontSize="var(--fs-14)">{title}</Typography><Typography sx={{ mt: .2, color: "#b9abc5", fontSize: "var(--fs-12)", lineHeight: 1.4 }}>{description}</Typography></Box>
                </Link>
              ))}
            </Box>
          </Box>
          <Box sx={{ pl: { md: 3 }, borderLeft: { md: "1px solid rgba(226,207,247,.14)" } }}>
            <Typography sx={{ color: "#c4b6d0", fontWeight: 700, fontSize: "var(--fs-12)", letterSpacing: ".12em", textTransform: "uppercase", mb: 1.2 }}>Industries</Typography>
            <Stack gap={.45}>
              {[
                ["Gaming", SportsEsportsRounded, "/industries/gaming"],
                ["News / Media", NewspaperRounded, "/industries/media"],
                ["eCommerce", ShoppingBagRounded, "/industries/ecommerce"],
                ["Mobile apps", PhoneIphoneRounded, "/industries/mobile"],
                ["Fintech / Financial", AccountBalanceRounded, "/industries/financial"],
              ].map(([industry, IndustryIcon, href]) => {
                const Icon = IndustryIcon as typeof SportsEsportsRounded;
                return <Link key={industry as string} href={href as string} underline="none" sx={{ display: "flex", alignItems: "center", gap: 1.1, px: .8, py: .55, mx: -.8, borderRadius: 1.5, color: "#f8f3fc", fontSize: "var(--fs-13)", fontWeight: 600, transition: "color .15s, background .15s", "&:hover": { color: "#ffc66d", bgcolor: "rgba(255,255,255,.06)" } }}>
                  <Box sx={{ display: "grid", placeItems: "center", flex: "0 0 30px", width: 30, height: 30, borderRadius: 1.6, color: "#21152d", background: "linear-gradient(145deg,#ffd36e,#ff914f)", "& svg": { fontSize: 17 } }}><Icon /></Box>
                  {industry as string}
                </Link>;
              })}
            </Stack>
            <Link href="/for-digital-products" underline="none" sx={{ display: "inline-flex", alignItems: "center", mt: 1.5, color: "#ffc66d", fontWeight: 700, fontSize: "var(--fs-13)", "&:hover": { color: "#ffe27a" } }}>Explore digital products →</Link>
          </Box>
          <Link href="/for-digital-products" underline="none" sx={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-start", p: 2.6, borderRadius: 3, color: "#f8f3fc", border: "1px solid rgba(255,190,94,.22)", background: "linear-gradient(120deg,rgba(255,198,109,.12),rgba(255,145,79,.045))", transition: "background .18s,border-color .18s", "&:hover": { background: "linear-gradient(120deg,rgba(255,198,109,.2),rgba(255,145,79,.08))", borderColor: "rgba(255,190,94,.42)" } }}>
            <Typography sx={{ color: "#ffc66d", fontWeight: 700, fontSize: "var(--fs-12)", letterSpacing: ".12em", textTransform: "uppercase" }}>For digital products</Typography>
            <Typography sx={{ mt: 1, color: "#f8f3fc", fontWeight: 750, fontSize: "var(--fs-20)" }}>Built for products with an active user base.</Typography>
            <Typography sx={{ mt: .7, color: "#c4b6d0", fontSize: "var(--fs-13)", lineHeight: 1.55 }}>Explore how PixlPush supports apps, SaaS and other user-based digital businesses.</Typography>
            <Typography sx={{ mt: 1.6, color: "#ffc66d", fontWeight: 700, fontSize: "var(--fs-13)" }}>Explore digital products →</Typography>
          </Link>
        </Box>
      </Paper>
    );
  }
  return (
    <Paper
      elevation={0}
      sx={{
        position: "absolute",
        top: "calc(100% + 1px)",
        left: 0,
        right: 0,
        borderRadius: "0 0 24px 24px",
        border: "1px solid rgba(255,255,255,.12)",
        borderTop: 0,
        bgcolor: "#160d20",
        color: "#f8f3fc",
        px: { md: 4, lg: 7 },
        py: 4,
        boxShadow: "0 30px 70px rgba(12,5,22,.55)",
      }}
    >
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: { xs: 3, md: 5 },
          maxWidth: 1100,
          mx: "auto",
        }}
      >
        {groups.map((group) => (
          <Box key={group.title}>
            <Typography
              sx={{
                color: "#c4b6d0",
                fontWeight: 700,
                fontSize: "var(--fs-12)",
                letterSpacing: ".12em",
                textTransform: "uppercase",
                mb: 1.5,
              }}
            >
              {group.title}
            </Typography>
            <Stack gap={0.7}>
              {group.items.map(([title, description, href, ItemIcon]) => {
                const Icon = ItemIcon ?? AutoAwesomeRounded;
                return (
                <Link
                  key={title}
                  href={href.replace("​​", "")}
                  underline="none"
                  sx={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 1.3,
                    p: 1.2,
                    mx: -1.2,
                    borderRadius: 2,
                    color: "#f8f3fc",
                    transition: "background-color .15s, transform .15s",
                    "&:hover": { bgcolor: "rgba(255,255,255,.07)", transform: "translateX(2px)" },
                  }}
                >
                  <Box sx={{ display: "grid", placeItems: "center", flex: "0 0 36px", width: 36, height: 36, borderRadius: 1.8, color: "#21152d", background: "linear-gradient(145deg,#ffd36e,#ff914f)", "& svg": { fontSize: 19 } }}><Icon /></Box>
                  <Box>
                    <Typography fontWeight={700} fontSize="var(--fs-14)">{title}</Typography>
                    <Typography sx={{ mt: .25, color: "#b9abc5", lineHeight: 1.4 }} fontSize="var(--fs-12)" component="div">{description}</Typography>
                  </Box>
                </Link>
                );
              })}
            </Stack>
          </Box>
        ))}
      </Box>
    </Paper>
  );
}
export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [mega, setMega] = useState<"product" | "resources" | "usecases" | null>(null);
  return (
    <>
    <AppBar
      position="sticky"
      className="site-header-seam"
      elevation={0}
      onMouseLeave={() => setMega(null)}
      sx={{
        isolation: "isolate",
        bgcolor: "#211331",
        backdropFilter: "blur(18px)",
        color: "#fff",
        borderBottom: "1px solid rgba(255,255,255,.12)",
        zIndex: 10,
        "& .MuiButton-root": {
          minHeight: 48,
          px: 2.8,
          borderRadius: 999,
          fontSize: "var(--fs-16)",
          fontWeight: 700,
        },
        "& .MuiButton-contained": { color: "#fff" },
      }}
    >
      <Toolbar
        sx={{
          maxWidth: 1360,
          width: "100%",
          mx: "auto",
          minHeight: { xs: 68, md: 82 },
          py: 1,
          px: { xs: 2, md: 4 },
          justifyContent: "space-between",
        }}
      >
        <Logo />
        <Stack
          direction="row"
          gap={{ lg: 4.5, xl: 6 }}
          sx={{ display: { xs: "none", lg: "flex" }, alignItems: "center", mx: { lg: 4, xl: 7 } }}
        >
          {[
            ["Product", "product"],
            ["How It Works", "/how-it-works"],
            ["Use Cases", "usecases"],
            ["Pricing", "/pricing"],
            ["Resources", "resources"],
          ].map(([label, value]) =>
            value === "product" || value === "resources" || value === "usecases" ? (
              <Box
                key={label}
                onMouseEnter={() => setMega(value as "product" | "resources" | "usecases")}
                sx={{ py: 2, cursor: "pointer" }}
              >
                <Link
                  href={value === "product" ? "/product" : value === "resources" ? "/resources" : "/use-cases"}
                  underline="none"
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 0.35,
                    fontSize: "var(--fs-16)",
                    fontWeight: 700,
                    color: mega === value ? "#ffab8e" : "rgba(255,255,255,.92)",
                    "&:hover": { color: "#ffab8e" },
                  }}
                >
                  {label}
                  <KeyboardArrowDownRounded
                    sx={{
                      fontSize: 19,
                      transition: "transform 160ms ease",
                      transform: mega === value ? "rotate(180deg)" : "none",
                    }}
                  />
                </Link>
              </Box>
            ) : (
              <Link
                key={label}
                href={value}
                underline="none"
                onMouseEnter={() => setMega(null)}
                sx={{
                  fontSize: "var(--fs-16)",
                  fontWeight: 700,
                  color: "rgba(255,255,255,.92)",
                  "&:hover": { color: "#ffab8e" },
                }}
              >
                {label}
              </Link>
            ),
          )}
        </Stack>
        <Stack
          direction="row"
          gap={2}
          alignItems="center"
          justifyContent="flex-end"
          sx={{ display: { xs: "none", sm: "flex" }, minWidth: 205 }}
        >
          <SiteAccount />
        </Stack>
        <IconButton
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          sx={{ display: { xs: "flex", lg: "none" }, color: "#fff" }}
        >
          <MenuRounded />
        </IconButton>
      </Toolbar>
      {mega && (
        <Box
          sx={{ display: { xs: "none", lg: "block" } }}
          onMouseEnter={() => setMega(mega)}
        >
          <MegaMenu kind={mega} />
        </Box>
      )}
      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        PaperProps={{ sx: { bgcolor: "#211331", color: "#fff" } }}
      >
        <Stack sx={{ p: 3, width: 290, color: "#fff" }} gap={2.2}>
          <Logo />
          {links.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              underline="none"
              fontWeight={500}
              sx={{ color: "rgba(255,255,255,.84)" }}
            >
              {label}
            </Link>
          ))}
          <Link href="/for-digital-products" onClick={() => setOpen(false)} underline="none" fontWeight={500} sx={{ pl: 2, color: "rgba(255,255,255,.68)" }}>
            For Digital Products
          </Link>
          <Link
            href="/resources"
            onClick={() => setOpen(false)}
            underline="none"
            fontWeight={500}
            sx={{ color: "rgba(255,255,255,.84)" }}
          >
            Resources
          </Link>
          <SiteAccountDrawer onNavigate={() => setOpen(false)} />
        </Stack>
      </Drawer>
    </AppBar>
    {mega && <Box aria-hidden="true" sx={{ position: "fixed", top: { xs: 68, md: 82 }, left: 0, right: 0, bottom: 0, zIndex: 9, bgcolor: "rgba(4,2,8,.88)", backdropFilter: "blur(4px)", pointerEvents: "none" }} />}
    </>
  );
}
export function SiteFooter() {
  const columns = [
    {
      title: "Product",
      links: [
        ["Platform", "/product"],
        ["How it works", "/how-it-works"],
        ["Use cases", "/use-cases"],
        ["For digital products", "/for-digital-products"],
        ["Pricing", "/pricing"],
      ],
    },
    {
      title: "Resources",
      links: [
        ["Developer docs", "/docs"],
        ["Blog", "/blog"],
        ["Customer case studies", "/customer-case-studies"],
        ["Glossary", "/glossary"],
        ["ROI if switching", "/roi-if-switching"],
        ["Resources hub", "/resources"],
      ],
    },
    {
      title: "Company",
      links: [
        ["Why PixlPush", "/why-pixlpush"],
        ["Contact sales", "/get-started"],
        ["Legal Notice", "/legal/impressum"],
        ["Log in", "/login"],
        ["Create account", "/get-started"],
      ],
    },
  ];
  return (
    <Box
      component="footer"
      className="site-footer-seam"
      sx={{
        bgcolor: "#211331",
        color: "#fff",
        position: "relative",
        overflow: "hidden",
        isolation: "isolate",
      }}
    >
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 8 } }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr 1fr", md: "1.6fr 1fr 1fr 1fr" },
            gap: { xs: 4, md: 6 },
          }}
        >
          <Box sx={{ gridColumn: { xs: "1 / -1", md: "auto" } }}>
            <Box
              component="img"
              src="/assets/logo-header.png"
              alt="PixlPush"
              sx={{ display: "block", width: 165, height: "auto" }}
            />
            <Typography
              color="rgba(255,255,255,.62)"
              fontSize="var(--fs-13)"
              sx={{ mt: 1.5, maxWidth: 220, lineHeight: 1.6 }}
            >
              Behavior-aware journeys for digital products that want retention
              to compound.
            </Typography>
            <Stack direction="row" gap={1} sx={{ mt: 2 }}>
              <Box
                component="a"
                href="#"
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  color: "#fff",
                  border: "1px solid rgba(255,255,255,.2)",
                  textDecoration: "none",
                  fontSize: "var(--fs-12)",
                  fontWeight: 500,
                }}
              >
                in
              </Box>
              <Box
                component="a"
                href="#"
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  color: "#fff",
                  border: "1px solid rgba(255,255,255,.2)",
                  textDecoration: "none",
                  fontSize: "var(--fs-14)",
                }}
              >
                𝕏
              </Box>
            </Stack>
          </Box>
          {columns.map((column) => (
            <Box key={column.title}>
              <Typography
                fontSize="var(--fs-12)"
                fontWeight={500}
                letterSpacing=".14em"
                sx={{ color: "#ffab8e", textTransform: "uppercase", mb: 2 }}
              >
                {column.title}
              </Typography>
              <Stack gap={1.3}>
                {column.links.map(([label, href]) => (
                  <Link
                    key={label}
                    href={href}
                    underline="none"
                    sx={{
                      color: "rgba(255,255,255,.68)",
                      fontSize: "var(--fs-13)",
                      "&:hover": { color: "#fff" },
                    }}
                  >
                    {label}
                  </Link>
                ))}
              </Stack>
            </Box>
          ))}
        </Box>
        <Box
          sx={{
            mt: 6,
            pt: 2.5,
            borderTop: "1px solid rgba(255,255,255,.14)",
            display: "flex",
            flexWrap: "wrap",
            gap: 2,
            justifyContent: "space-between",
            color: "rgba(255,255,255,.48)",
            fontSize: "var(--fs-12)",
          }}
        >
          <span>© 2026 PixlPush. All rights reserved.</span>
          <Stack direction="row" gap={2}>
            <Link href="/legal" underline="none" sx={{ color: "inherit" }}>
              Legal
            </Link>
            <Link href="/privacy" underline="none" sx={{ color: "inherit" }}>
              Privacy
            </Link>
            <Link
              href="/legal/terms"
              underline="none"
              sx={{ color: "inherit" }}
            >
              Terms
            </Link>
            <Link
              href="/legal/security"
              underline="none"
              sx={{ color: "inherit" }}
            >
              Security
            </Link>
          </Stack>
        </Box>
      </Container>
    </Box>
  );
}
export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <Box className="website-shell" sx={{ bgcolor: '#160d20', color: '#f8f3fc' }}>
      <SiteHeader />
      {children}
      <SiteFooter />
      <SupportChatWidget />
    </Box>
  );
}
export function PageHero({
  eyebrow,
  title,
  description,
  children,
  dark = false,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: React.ReactNode;
  dark?: boolean;
}) {
  return (
    <Box
      className="grain"
      sx={{
        background: "radial-gradient(ellipse at 80% 15%,rgba(139,92,246,.24),transparent 42%), #1b1126",
        color: "#f8f3fc",
        py: { xs: 9, md: 13 },
      }}
    >
      <Container maxWidth="lg">
        <Box sx={{ maxWidth: 780 }}>
          <Typography
            variant="overline"
            sx={{
              color: "#c4a7ff",
              fontWeight: 500,
              letterSpacing: ".14em",
            }}
          >
            {eyebrow}
          </Typography>
          <Typography
            variant="h1"
            sx={{ fontSize: { xs: "var(--fs-48)", md: "var(--fs-56)" }, lineHeight: 0.96, mt: 1 }}
          >
            {title}
          </Typography>
          <Typography
            sx={{
              fontSize: { xs: "var(--fs-16)", md: "var(--fs-20)" },
              lineHeight: 1.5,
              mt: 3,
              maxWidth: 620,
              color: "#c4b6d0",
            }}
          >
            {description}
          </Typography>
          {children && <Box sx={{ mt: 4 }}>{children}</Box>}
        </Box>
      </Container>
    </Box>
  );
}
export function SectionIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: React.ReactNode;
  description?: string;
}) {
  return (
    <Stack gap={2.5} sx={{ maxWidth: 820, mb: 6 }}>
      <Typography
        variant="overline"
        sx={{ display: "inline-block", width: "fit-content", color: "transparent", backgroundImage: "linear-gradient(90deg, #ffe27a 0%, #ffb347 45%, #ff8148 100%)", backgroundSize: "100% 100%", backgroundClip: "text", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontWeight: 700 }}
        letterSpacing=".14em"
      >
        {eyebrow}
      </Typography>
      <Typography
        variant="h2"
        sx={{ fontSize: { xs: "var(--fs-40)", md: "var(--fs-56)" }, lineHeight: 1.12, letterSpacing: "-.035em" }}
      >
        {title}
      </Typography>
      {description && (
        <Typography sx={{ color: "#eee8f4", fontSize: "var(--fs-16)", lineHeight: 1.6 }}>
          {description}
        </Typography>
      )}
    </Stack>
  );
}
