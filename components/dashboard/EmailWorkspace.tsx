"use client";

import CloseEmailEditor from "./CloseEmailEditor";
import Image from "next/image";
import EmailTranslationPanel from "./EmailTranslationPanel";
import EmailLanguageSettings from "./EmailLanguageSettings";
import { languageName } from "./EmailLanguageSettings";
import aiIcon from "../../assets/ai.png";
import dragDropPreview from "../../assets/email-drag-drop-editor-preview.png";
import simpleEditorPreview from "../../assets/email-simple-editor-preview.png";
import KeyboardArrowDownRounded from "@mui/icons-material/KeyboardArrowDownRounded";
import ZoomInRounded from "@mui/icons-material/ZoomInRounded";
import ZoomOutRounded from "@mui/icons-material/ZoomOutRounded";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AddRounded,
  FormatAlignCenterRounded,
  FormatAlignLeftRounded,
  FormatAlignRightRounded,
  ArrowBackRounded,
  ArrowDownwardRounded,
  ArrowForwardRounded,
  ArrowUpwardRounded,
  AttachFileRounded,
  AutoAwesomeRounded,
  ContentCopyRounded,
  DeleteOutlineRounded,
  EditRounded,
  EmailRounded,
  FormatBoldRounded,
  FormatItalicRounded,
  FormatUnderlinedRounded,
  GridViewRounded,
  ImageRounded,
  InsertEmoticonRounded,
  LinkRounded,
  RedoRounded,
  SearchRounded,
  SendRounded,
  SettingsRounded,
  StrikethroughSRounded,
  TextFieldsRounded,
  UndoRounded,
  CloseRounded,
  DragIndicatorRounded,
  AddPhotoAlternateRounded,
  RestartAltRounded,
  MenuRounded,
  ViewAgendaRounded,
  WidgetsRounded,
  ArticleRounded,
  ShoppingBagRounded,
  CollectionsRounded,
  RssFeedRounded,
  ShareRounded,
  VerticalAlignBottomRounded,
} from "@mui/icons-material";
import {
  Box,
  Button,
  Card,
  Chip,
  Divider,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material";
import { renderToStaticMarkup } from "react-dom/server";
import { BlockDesign, SocialLink, sectionTextFeatures, socialNetworks } from "./BlockDesign";
import { reorderByInsertionIndex } from "./dragEmailOrdering";
import SimpleEmailEditor from "@/components/dashboard/SimpleEmailEditor";
import DeleteConfirmDialog from "@/components/dashboard/DeleteConfirmDialog";
import { Toast } from "@/components/auth/AuthFeedback";
import { useActiveProject } from "@/hooks/projects/use-active-project";
import { emailApi } from "@/lib/projects/api";
import type { EmailCampaign, EmailTemplate } from "@/lib/projects/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";

type TabId = "send" | "drafts" | "templates";
type Editor = "simple" | "drag";
type BlockType =
  | "navigation"
  | "hero"
  | "image"
  | "heading"
  | "text"
  | "button"
  | "divider"
  | "footer";
type Block = { id: number; type: BlockType; title: string; body: string; variant?: string; designHtml?: string; url?: string; imageSrc?: string; logoWidth?: number; logoAlt?: string; image?: Partial<typeof imageDefaults> & { height?: number; alt?: string }; sectionStyle?: { primary: string; background: string; heading: string; text: string; padding: number; font: string; headingSize: number; textSize: number; lineHeight: number; imageWidth: number } };
type EmailItem = {
  id: string;
  name: string;
  subject: string;
  description: string;
  editor: Editor;
  kind: TabId;
  updated: string;
  content?: string;
  translations?: Record<string, { subject: string; html: string }>;
  blocks?: Block[];
  style?: { primary: string; background: string; width: number };
};

const blockDefaults: Record<BlockType, Omit<Block, "id">> = {
  navigation: { type: "navigation", title: "About Products Contact", body: "" },
  hero: {
    type: "hero",
    title: "A fresh update for your audience",
    body: "Share your latest news, offer, or announcement with a clear message.",
  },
  image: { type: "image", title: "Upload image", body: "" },
  heading: { type: "heading", title: "Make every message count", body: "" },
  text: {
    type: "text",
    title: "Text block",
    body: "Write a helpful message for your audience.",
  },
  button: { type: "button", title: "Explore now", body: "" },
  divider: { type: "divider", title: "Divider", body: "" },
  footer: {
    type: "footer",
    title: "Thanks for being with us",
    body: "Unsubscribe · Privacy · Contact",
  },
};
type LibraryItem = { type: BlockType; label: string; description: string };
const dragCategories = [
  "Navigation", "Hero", "Sections", "Elements", "Content", "Special",
  "Products", "Gallery", "Blog and RSS", "Social and sharing", "Footer",
] as const;
type DragCategory = (typeof dragCategories)[number];
/** The saved builder state of a drag & drop email, as the editor's own types. */
const designOf = (design?: Record<string, unknown> | null) => ({
  ...(Array.isArray(design?.blocks) ? { blocks: design.blocks as Block[] } : {}),
  ...(design?.style && typeof design.style === "object" ? { style: design.style as EmailItem["style"] } : {}),
});
const logoSizes = { sm: 80, md: 120, lg: 160, xl: 220 };
// Editor-only controls drawn on top of a framed image (never part of the exported email).
const imageTools = [
  ["replace", "Replace image", AddPhotoAlternateRounded],
  ["zoom-out", "Zoom out", ZoomOutRounded],
  ["zoom-in", "Zoom in", ZoomInRounded],
  ["reset", "Centre and reset zoom", RestartAltRounded],
  ["remove", "Delete image", DeleteOutlineRounded],
] as const;
let imageToolsHtml = "";
const imageOverlayHtml = (size: string) => {
  imageToolsHtml ||= imageTools.map(([action, title, Icon]) => `<span role="button" data-image-action="${action}" title="${title}" aria-label="${title}">${renderToStaticMarkup(<Icon style={{ width: 16, height: 16, fill: "currentColor" }} />)}</span>`).join("");
  return `<span data-image-tools="" contenteditable="false">${imageToolsHtml}</span><span data-image-size="" contenteditable="false">${size}</span>${["w","e","s","sw","se"].map(side=>`<span data-image-handle="${side}" contenteditable="false"></span>`).join("")}`;
};
const imageDefaults = { fit: "cover" as "cover" | "contain", x: 50, y: 50, zoom: 1, radius: 8 };
const dragCategoryIcons: Record<DragCategory, typeof GridViewRounded> = {
  Navigation: MenuRounded, Hero: ImageRounded, Sections: ViewAgendaRounded, Elements: WidgetsRounded,
  Content: ArticleRounded, Special: AutoAwesomeRounded, Products: ShoppingBagRounded, Gallery: CollectionsRounded,
  "Blog and RSS": RssFeedRounded, "Social and sharing": ShareRounded, Footer: VerticalAlignBottomRounded,
};
const dragLibrary: Record<DragCategory, LibraryItem[]> = {
  Navigation: [
      {
        type: 'navigation',
        label: 'Logo',
        description: 'Centered image logo only',
    },
    {
      type: 'navigation',
      label: 'Navigation',
      description: 'Simple centered menu links',
    },
    {
      type: 'navigation',
      label: 'Logo + Navigation',
      description: 'Logo with balanced menu links',
    },
    {
      type: 'navigation',
      label: 'Split logo navigation',
      description: 'Logo in center with links on both sides',
    },
    {
      type: 'navigation',
      label: 'Logo + Button',
      description: 'Brand mark with a compact CTA',
    },
    {
      type: 'navigation',
      label: 'Logo + Social links',
      description: 'Brand mark with social icons',
    },
    {
      type: 'navigation',
      label: 'Newsletter header',
      description: 'Logo and newsletter title',
    },
  ],
  Hero: [
    {
      type: 'hero',
      label: 'Standard hero',
      description: 'Image, title, text, and CTA',
    },
    {
      type: 'hero',
      label: 'Extended hero',
      description: 'Large product-style feature hero',
    },
    {
      type: 'hero',
      label: 'Title + image',
      description: 'Headline with a focused visual',
    },
    {
      type: 'hero',
      label: 'Side-by-side image + text',
      description: 'Two-column feature layout',
    },
    {
      type: 'hero',
      label: 'Image below text',
      description: 'Short message with image support',
    },
    {
      type: 'hero',
      label: 'Offer hero',
      description: 'Promotion block with strong CTA',
    },
  ],
  Sections: [
    {
      type: 'hero',
      label: 'Two column feature',
      description: 'Balanced text and visual section',
    },
    {
      type: 'hero',
      label: 'Three benefit cards',
      description: 'Highlight benefits in a compact row',
    },
    {
      type: 'text',
      label: 'Story section',
      description: 'Long-form campaign copy section',
    },
    {
      type: 'hero',
      label: 'Announcement section',
      description: 'Feature update with CTA',
    },
    {
      type: 'divider',
      label: 'Section divider',
      description: 'Separate content areas cleanly',
    },
  ],
  Elements: [
    {
      type: 'divider',
      label: 'Spacer',
      description: 'Add breathing room between blocks',
    },
    { type: 'divider', label: 'Divider', description: 'Horizontal separator' },
    { type: 'heading', label: 'Title', description: 'Large editable headline' },
    {
      type: 'heading',
      label: 'Title with button',
      description: 'Headline paired with a CTA',
    },
    { type: 'text', label: 'Text', description: 'Paragraph content block' },
    {
      type: 'text',
      label: 'Quote',
      description: 'Short testimonial or highlighted quote',
    },
    { type: 'button', label: 'Button', description: 'Single call-to-action' },
    {
      type: 'button',
      label: 'Two buttons',
      description: 'Primary and secondary CTAs',
    },
    {
      type: 'button',
      label: 'Three buttons',
      description: 'Compact multi-action row',
    },
  ],
  Content: [
    { type: 'image', label: 'Image', description: 'Large image placeholder' },
    {
      type: 'image',
      label: 'Full width image',
      description: 'Edge-to-edge content image',
    },
    { type: 'hero', label: 'Image + text', description: 'Visual story block' },
    {
      type: 'text',
      label: 'Text card',
      description: 'Readable text inside a clean card',
    },
    {
      type: 'hero',
      label: 'Feature spotlight',
      description: 'Image, headline, copy, and CTA',
    },
  ],
  Special: [
    {
      type: 'hero',
      label: 'Countdown offer',
      description: 'Urgency-driven promotion section',
    },
    {
      type: 'text',
      label: 'Coupon code',
      description: 'Promocode style content block',
    },
    {
      type: 'hero',
      label: 'Survey invitation',
      description: 'Invite subscribers to answer',
    },
    {
      type: 'button',
      label: 'Download CTA',
      description: 'Action button for files or links',
    },
  ],
  Products: [
    {
      type: 'hero',
      label: 'Single product',
      description: 'Product image, price, and CTA',
    },
    {
      type: 'hero',
      label: 'Product spotlight',
      description: 'Premium offer layout',
    },
    {
      type: 'hero',
      label: 'Two product row',
      description: 'Compact product comparison',
    },
    {
      type: 'button',
      label: 'Shop now button',
      description: 'Commerce call-to-action',
    },
  ],
  Gallery: [
    {
      type: 'image',
      label: 'Single image',
      description: 'One clean visual block',
    },
    {
      type: 'hero',
      label: 'Image grid',
      description: 'Gallery-style visual collection',
    },
    {
      type: 'image',
      label: 'Tall image',
      description: 'Portrait image placeholder',
    },
    {
      type: 'hero',
      label: 'Image with caption',
      description: 'Visual plus supporting text',
    },
  ],
  'Blog and RSS': [
    {
      type: 'hero',
      label: 'Latest post',
      description: 'Feature one article with CTA',
    },
    {
      type: 'text',
      label: 'Post summary',
      description: 'Compact article preview copy',
    },
    {
      type: 'hero',
      label: 'RSS digest',
      description: 'Multiple update style block',
    },
  ],
  'Social and sharing': [
    { type: 'footer', label: 'Social links', description: 'Social icon row' },
    {
      type: 'text',
      label: 'Share prompt',
      description: 'Ask readers to share the email',
    },
    {
      type: 'hero',
      label: 'Community invite',
      description: 'Invite people to follow your brand',
    },
  ],
  Footer: [
    {
      type: 'footer',
      label: 'Centered footer',
      description: 'Centered legal and brand details',
    },
    {
      type: 'footer',
      label: 'Footer',
      description: 'Address and unsubscribe area',
    },
    {
      type: 'footer',
      label: 'Aligned footer',
      description: 'Logo, text, and social row',
    },
    {
      type: 'footer',
      label: 'Footer + navigation',
      description: 'Footer with menu links',
    },
    {
      type: 'footer',
      label: 'Footer + app download',
      description: 'App store buttons and socials',
    },
    {
      type: 'footer',
      label: 'Social footer',
      description: 'Footer with social link row',
    },
    {
      type: 'footer',
      label: 'Compact footer',
      description: 'Small required footer content',
    },
  ],
};
export default function EmailWorkspace() {
  const { active: activeProject } = useActiveProject();
  const queryClient = useQueryClient();
  const [items, setItems] = useState<EmailItem[]>([]);
  const [tab, setTab] = useState<TabId>("templates");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"list" | "choice" | "editor">("list");
  const [kind, setKind] = useState<"drafts" | "templates">("drafts");
  const [editor, setEditor] = useState<Editor>("simple");
  const [creationLanguage, setCreationLanguage] = useState("en");
  const [active, setActive] = useState<EmailItem | null>(null);
  const [notice, setNotice] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<EmailItem | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    severity: "success" | "error";
  } | null>(null);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 2600);
    return () => window.clearTimeout(timer);
  }, [notice]);
  const templatesQuery = useQuery({
    queryKey: ["email", "templates", activeProject?.id, query],
    queryFn: () => emailApi.templates.list(activeProject!.id, {
      page: 1,
      limit: 25,
      search: query,
      category: "template",
    }),
    enabled: Boolean(activeProject?.id),
  });
  const draftsQuery = useQuery({
    queryKey: ["email", "campaigns", activeProject?.id, "draft", query],
    queryFn: () => emailApi.campaigns.list(activeProject!.id, {
      tab: "draft",
      page: 1,
      limit: 25,
      search: query,
    }),
    enabled: Boolean(activeProject?.id),
  });
  const sentQuery = useQuery({
    queryKey: ["email", "campaigns", activeProject?.id, "sent", query],
    queryFn: () => emailApi.campaigns.list(activeProject!.id, {
      tab: "sent",
      page: 1,
      limit: 25,
      search: query,
    }),
    enabled: Boolean(activeProject?.id),
  });
  const formatUpdated = (value?: string) => value
    ? `Updated ${new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`
    : "—";
  const apiItems = useMemo<EmailItem[]>(() => [
    ...(sentQuery.data?.items ?? []).map((item: EmailCampaign) => ({
      id: item.id,
      name: item.name,
      subject: item.template?.subject ?? "",
      description: item.template?.previewText ?? "",
      editor: item.template?.editor === "drag_drop" ? "drag" as const : "simple" as const,
      kind: "send" as const,
      updated: formatUpdated(item.updatedAt),
    })),
    ...(draftsQuery.data?.items ?? []).map((item: EmailCampaign) => ({
      id: item.id,
      name: item.name,
      subject: item.template?.subject ?? "",
      description: item.template?.previewText ?? "",
      editor: item.template?.editor === "drag_drop" ? "drag" as const : "simple" as const,
      kind: "drafts" as const,
      updated: formatUpdated(item.updatedAt),
    })),
    ...(templatesQuery.data?.items ?? []).map((item: EmailTemplate) => ({
      id: item.id,
      name: item.name,
      subject: item.subject,
      description: item.previewText ?? "",
      editor: item.editor === "drag_drop" ? "drag" as const : "simple" as const,
      kind: "templates" as const,
      updated: formatUpdated(item.updatedAt),
    })),
  ], [draftsQuery.data, sentQuery.data, templatesQuery.data]);
  useEffect(() => {
    if (activeProject?.id && !templatesQuery.isFetching && !draftsQuery.isFetching && !sentQuery.isFetching) {
      setItems(apiItems);
    }
  }, [activeProject?.id, apiItems, draftsQuery.isFetching, sentQuery.isFetching, templatesQuery.isFetching]);
  const visible = useMemo(
    () =>
      items.filter(
        (item) =>
          item.kind === tab &&
          `${item.name} ${item.subject} ${item.description}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [items, tab, query],
  );
  const activeListQuery = tab === "templates" ? templatesQuery : tab === "drafts" ? draftsQuery : sentQuery;
  const isListLoading = activeListQuery.isLoading || (activeListQuery.isFetching && !activeListQuery.data);
  const tabCounts = sentQuery.data?.tabCounts;
  const start = (nextKind: "drafts" | "templates") => {
    setKind(nextKind);
    setActive(null);
    setView("choice");
  };
  const open = async (item: EmailItem) => {
    setKind(item.kind === "templates" ? "templates" : "drafts");
    setEditor(item.editor);
    setActive(item);
    setView("editor");
    if (!activeProject?.id) return;
    try {
      if (item.kind === "templates") {
        const detail = await emailApi.templates.get(activeProject.id, item.id);
        setActive((current) => current && {
          ...current,
          id: detail.id,
          name: detail.name || current.name,
          subject: detail.subject || current.subject,
          description: detail.previewText ?? current.description,
          content: detail.html ?? detail.text ?? current.content,
          translations: detail.translations ?? current.translations,
          ...designOf(detail.design),
        });
      } else {
        const detail = await emailApi.campaigns.get(activeProject.id, item.id);
        setActive((current) => current && {
          ...current,
          id: detail.id,
          name: detail.name || current.name,
          subject: detail.template?.subject ?? current.subject,
          description: detail.template?.previewText ?? current.description,
          content: detail.template?.html ?? detail.template?.text ?? current.content,
          translations: detail.template?.translations ?? current.translations,
          ...designOf(detail.template?.design),
        });
      }
    } catch (cause) {
      setToast({
        message: cause instanceof Error ? cause.message : "Could not load the email for editing.",
        severity: "error",
      });
    }
  };
  const save = (item: EmailItem, message: string) => {
    setItems((current) => [
      item,
      ...current.filter((entry) => entry.id !== item.id),
    ]);
    setTab(item.kind);
    setView("list");
    setNotice(message);
    queryClient.invalidateQueries({ queryKey: ["email"] });
  };
  const duplicate = async (item: EmailItem) => {
    if (!activeProject?.id) {
      setToast({ message: "The project is not ready.", severity: "error" });
      return;
    }
    setActionLoading(true);
    try {
      let copy: EmailItem;
      if (item.kind === "templates") {
        const template = await emailApi.templates.duplicate(activeProject.id, item.id);
        copy = {
          ...item,
          id: template.id,
          name: template.name || `${item.name} copy`,
          subject: template.subject || item.subject,
          updated: "Updated just now",
        };
      } else if (item.kind === "drafts") {
        const draft = await emailApi.campaigns.get(activeProject.id, item.id);
        const campaign = await emailApi.campaigns.create(activeProject.id, {
          name: `${draft.name} copy`,
          content: {
            subject: draft.template?.subject || item.subject,
            html: draft.template?.html || draft.template?.text || item.content || "",
            translations: Object.fromEntries(
              Object.entries(draft.template?.translations || {}).map(([code, value]) => [code, {
                subject: value.subject,
                html: value.html,
              }]),
            ),
          },
        });
        copy = {
          ...item,
          id: campaign.id,
          name: campaign.name,
          subject: campaign.template?.subject || item.subject,
          updated: "Updated just now",
        };
      } else {
        setToast({ message: "Sent campaigns cannot be duplicated.", severity: "error" });
        return;
      }
      setItems((current) => [
        copy,
        ...current,
      ]);
      setToast({ message: "Email duplicated successfully.", severity: "success" });
      queryClient.invalidateQueries({ queryKey: ["email"] });
    } catch (cause) {
      setToast({ message: cause instanceof Error ? cause.message : "Could not duplicate the email.", severity: "error" });
    } finally {
      setActionLoading(false);
    }
  };
  const discardEditor = () => {
    if (active?.id.startsWith("email-")) {
      setItems((current) => current.filter((entry) => entry.id !== active.id));
    }
    setActive(null);
    setView("list");
  };
  const remove = (item: EmailItem) => setDeleteTarget(item);
  const confirmRemove = async () => {
    if (!deleteTarget || !activeProject?.id) return;
    setActionLoading(true);
    try {
      if (deleteTarget.kind === "templates") {
        await emailApi.templates.delete(activeProject.id, deleteTarget.id);
      } else {
        await emailApi.campaigns.delete(activeProject.id, deleteTarget.id);
      }
      setItems((current) => current.filter((entry) => entry.id !== deleteTarget.id));
      setDeleteTarget(null);
      setToast({ message: "Email deleted successfully.", severity: "success" });
      queryClient.invalidateQueries({ queryKey: ["email"] });
    } catch (cause) {
      setToast({ message: cause instanceof Error ? cause.message : "Could not delete the email.", severity: "error" });
    } finally {
      setActionLoading(false);
    }
  };
  if (view === "choice")
    return (
      <ChoiceScreen
        kind={kind}
        items={items}
        projectId={activeProject?.id || ""}
        onBack={() => setView("list")}
        onChoose={(next, language) => {
          setCreationLanguage(language);
          setEditor(next);
          setView("editor");
        }}
        onTemplate={open}
      />
    );
  if (view === "editor")
    return (
      <>
        {notice && (
          <Paper className="email-toast" elevation={4}>
            {notice}
          </Paper>
        )}
        {editor === "simple" ? (
          <SimpleEmailEditor
            item={active as (EmailItem & { editor: "simple" }) | null}
            kind={kind}
            projectId={activeProject?.id || ""}
            language={creationLanguage}
            onClose={discardEditor}
            onSave={save}
            onNotice={setNotice}
          />
        ) : (
          <DragEditor
            // remount once the saved design has loaded: the editor reads it only on mount
            key={`${active?.id ?? "new"}:${active?.blocks ? "loaded" : "blank"}`}
            item={active}
            kind={kind}
            projectId={activeProject?.id || ""}
            language={creationLanguage}
            onClose={discardEditor}
            onSave={save}
            onNotice={setNotice}
          />
        )}
      </>
    );
  return (
    <Stack gap={2.5} className="email-workspace">
      {notice && (
        <Paper className="email-toast" elevation={4}>
          {notice}
        </Paper>
      )}
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="flex-end" alignItems={{ md: "center" }} gap={2}>
        <Stack direction="row" gap={1}>
          <Button
            variant="contained"
            startIcon={<AddRounded />}
            onClick={() => start("drafts")}
          >
            Create email campaign
          </Button>
          <Button
            variant="outlined"
            startIcon={<GridViewRounded />}
            onClick={() => start("templates")}
          >
            Create email template
          </Button>
        </Stack>
      </Stack>
      <Box className="workspace-tabs">
        <WorkspaceTab
          active={tab === "send"}
          label="Send"
          count={tabCounts?.send ?? sentQuery.data?.total ?? 0}
          icon={<SendRounded />}
          onClick={() => setTab("send")}
          color="send-tab"
        />
        <WorkspaceTab
          active={tab === "drafts"}
          label="Drafts"
          count={tabCounts?.drafts ?? draftsQuery.data?.total ?? 0}
          icon={<EditRounded />}
          onClick={() => setTab("drafts")}
          color="drafts-tab"
        />
        <WorkspaceTab
          active={tab === "templates"}
          label="My Templates"
          count={templatesQuery.data?.total ?? 0}
          icon={<GridViewRounded />}
          onClick={() => setTab("templates")}
          color="templates-tab"
        />
      </Box>
      <Card className="saas-card data-panel email-data-panel email-table-panel">
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ sm: "center" }}
          gap={2}
        >
          <Box>
            <Typography variant="h3">
              {tab === "templates"
                ? "My Templates"
                : tab === "drafts"
                  ? "Draft emails"
                  : "Sent campaigns"}
            </Typography>
            <Typography color="text.secondary" fontSize={12}>
              {tab === "templates"
                ? "Reusable email content ready for your next campaign."
                : tab === "drafts"
                  ? "Continue editing saved email drafts."
                  : "Track delivery and engagement for sent email campaigns."}
            </Typography>
          </Box>
          <Stack direction="row" gap={1} className="data-toolbar email-toolbar">
            <TextField
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              size="small"
              placeholder="Search by name, subject, or message"
              className="table-search"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRounded fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <Select
              size="small"
              defaultValue="recent"
              className="filter-select"
            >
              <MenuItem value="recent">Recently updated</MenuItem>
              <MenuItem value="name">Name</MenuItem>
            </Select>
          </Stack>
        </Stack>
        <Box className="reusable-table-wrap">
          <Table size="small" className="users-table email-shared-table">
            <TableHead>
              <TableRow>
                <TableCell>Email name</TableCell>
                <TableCell>Subject</TableCell>
                <TableCell>Message</TableCell>
                <TableCell>Editor</TableCell>
                <TableCell>Updated</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Sends</TableCell>
                <TableCell align="right">Opens</TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {isListLoading
                ? Array.from({ length: 4 }, (_, index) => (
                    <TableRow key={`email-skeleton-${index}`}>
                      {Array.from({ length: 9 }, (_, cell) => (
                        <TableCell key={cell}>
                          <Skeleton variant="rounded" height={cell === 0 ? 34 : 22} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : visible.map((item) => (
                    <EmailTableRow
                      key={item.id}
                      item={item}
                      onEdit={() => open(item)}
                      onDuplicate={() => duplicate(item)}
                      onDelete={() => remove(item)}
                    />
                  ))}
            </TableBody>
          </Table>
          {!isListLoading && !visible.length && (
            <Typography className="table-empty" color="text.secondary">
              No emails match your search.
            </Typography>
          )}
        </Box>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          className="table-footer"
        >
          <Typography color="text.secondary" fontSize={11}>
            {isListLoading ? "Loading emails…" : `Showing ${visible.length} result${visible.length === 1 ? "" : "s"}`}
            {tab === "templates" ? " · templates" : ""}
          </Typography>
          <Stack direction="row" alignItems="center" gap={1}>
            <Typography color="text.secondary" fontSize={11}>
              Rows
            </Typography>
            <Select size="small" defaultValue={25} className="rows-select">
              <MenuItem value={25}>25</MenuItem>
            </Select>
            <Button size="small" disabled>
              Previous
            </Button>
            <Button size="small" variant="contained">
              Next
            </Button>
          </Stack>
        </Stack>
      </Card>
      <DeleteConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        loading={actionLoading}
        onConfirm={confirmRemove}
        title="Are you sure you want to delete this email?"
        description="This email and its saved content will be permanently removed."
      />
      <Toast
        message={toast?.message ?? null}
        severity={toast?.severity}
        onClose={() => setToast(null)}
      />
    </Stack>
  );
}
function WorkspaceTab({
  active,
  label,
  count,
  icon,
  onClick,
  color,
}: {
  active: boolean;
  label: string;
  count: number;
  icon: React.ReactNode;
  onClick: () => void;
  color: string;
}) {
  return (
    <Button
      onClick={onClick}
      className={`workspace-tab ${color} ${active ? "active" : ""}`}
      startIcon={icon}
    >
      <span>{label}</span>
      <Chip label={count} size="small" />
    </Button>
  );
}
function EmailTableRow({
  item,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  item: EmailItem;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  return (
    <TableRow hover>
      <TableCell>
        <Typography fontSize={12} fontWeight={900}>
          {item.name}
        </Typography>
        <Typography color="text.secondary" fontSize={10}>
          {item.kind === "templates"
            ? "Email template"
            : item.kind === "drafts"
              ? "Email draft"
              : "Email campaign"}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography fontSize={11} noWrap>
          {item.subject || "—"}
        </Typography>
      </TableCell>
      <TableCell sx={{ maxWidth: 260 }}>
        <Typography fontSize={11} noWrap>
          {item.description}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography color="text.secondary" fontSize={11}>
          {item.editor === "drag" ? "Drag & drop" : "Simple"}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography color="text.secondary" fontSize={11}>
          {item.updated.replace("Edited ", "")}
        </Typography>
      </TableCell>
      <TableCell>
        <Chip
          label={
            item.kind === "templates"
              ? "Template"
              : item.kind === "drafts"
                ? "Draft"
                : "Sent"
          }
          size="small"
          className={
            item.kind === "send"
              ? "active-chip"
              : item.kind === "drafts"
                ? "warning-chip"
                : "neutral-chip"
          }
        />
      </TableCell>
      <TableCell align="right">
        <Typography color="text.secondary" fontSize={11}>
          {item.kind === "send" ? "125.4K" : "—"}
        </Typography>
      </TableCell>
      <TableCell align="right">
        <Typography color="text.secondary" fontSize={11}>
          {item.kind === "send" ? "42.8%" : "—"}
        </Typography>
      </TableCell>
      <TableCell align="right">
        <Stack direction="row" justifyContent="flex-end" className="table-row-actions email-table-row-actions">
          <IconButton
            size="small"
            className="edit-action"
            onClick={onEdit}
            aria-label={`Edit ${item.name}`}
          >
            <EditRounded fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            className="duplicate-action"
            onClick={onDuplicate}
            aria-label={`Duplicate ${item.name}`}
          >
            <ContentCopyRounded fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            className="delete-action"
            onClick={onDelete}
            aria-label={`Delete ${item.name}`}
          >
            <DeleteOutlineRounded fontSize="small" />
          </IconButton>
        </Stack>
      </TableCell>
    </TableRow>
  );
}

function ChoiceScreen({
  kind,
  items,
  projectId,
  onBack,
  onChoose,
  onTemplate,
}: {
  kind: "drafts" | "templates";
  items: EmailItem[];
  projectId: string;
  onBack: () => void;
  onChoose: (editor: Editor, language: string) => void;
  onTemplate: (item: EmailItem) => void;
}) {
  const [tab, setTab] = useState(0);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [pendingEditor, setPendingEditor] = useState<Editor | null>(null);
  const [language, setLanguage] = useState("en");
  const [rememberLanguage, setRememberLanguage] = useState(false);
  const languagesQuery = useQuery({
    queryKey: ["email", "languages", projectId],
    queryFn: () => emailApi.languages.get(projectId),
    enabled: Boolean(projectId),
  });
  const languageOptions = languagesQuery.data?.languages?.length
    ? languagesQuery.data.languages
    : Object.entries({
        en: "English", ar: "Arabic", fr: "French", de: "German", es: "Spanish",
        id: "Indonesian", ru: "Russian", tr: "Turkish", pt: "Portuguese", ko: "Korean",
        ja: "Japanese", fa: "Persian", th: "Thai", vi: "Vietnamese", it: "Italian",
      }).map(([code, name]) => ({ code, name }));
  const chooseEditor = (next: Editor) => {
    if (languagesQuery.isLoading) {
      setPendingEditor(next);
      return;
    }
    if (languagesQuery.data?.defaultLanguageEnabled && languagesQuery.data.defaultLanguage) {
      onChoose(next, languagesQuery.data.defaultLanguage);
      return;
    }
    setPendingEditor(next);
    setLanguage("en");
    setRememberLanguage(false);
    setLanguageOpen(true);
  };
  useEffect(() => {
    if (!pendingEditor || languagesQuery.isLoading || !languagesQuery.data) return;
    if (languagesQuery.data.defaultLanguageEnabled && languagesQuery.data.defaultLanguage) {
      const next = pendingEditor;
      setPendingEditor(null);
      onChoose(next, languagesQuery.data.defaultLanguage);
    }
  }, [languagesQuery.data, languagesQuery.isLoading, onChoose, pendingEditor]);
  const continueWithLanguage = async () => {
    if (!pendingEditor) return;
    if (rememberLanguage && projectId) {
      try {
        await emailApi.languages.setDefault(projectId, { enabled: true, language });
      } catch {
        onChoose(pendingEditor, language);
        setLanguageOpen(false);
        setPendingEditor(null);
        return;
      }
    }
    const next = pendingEditor;
    setLanguageOpen(false);
    setPendingEditor(null);
    onChoose(next, language);
  };
  return (
    <Box className="email-flow">
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 2 }}
      >
        <Button
          startIcon={<ArrowBackRounded />}
          onClick={onBack}
          className="group-back-button"
        >
          Back to email templates
        </Button>
        <Typography color="text.secondary" fontSize={12}>
          <b>Design email</b> &nbsp;/&nbsp; Details &nbsp;/&nbsp; Schedule
        </Typography>
      </Stack>
      <Card className="email-choice-intro">
        <Chip label="New campaign setup" icon={<AutoAwesomeRounded />} />
        <Typography variant="h2" sx={{ mt: 1.5 }}>
          Choose your email editor
        </Typography>
        <Typography color="text.secondary">
          Start with a focused writing editor, build a visual layout with
          blocks, or reuse a saved template.
        </Typography>
        <Box className="campaign-progress">
          <span className="active">Design</span>
          <i />
          <span>Details</span>
          <i />
          <span>Schedule</span>
        </Box>
      </Card>
      <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mt: 2 }}>
        <Tab label="Start from scratch" />
        <Tab label="Templates" />
      </Tabs>
      {tab === 0 ? (
        <Stack direction={{ xs: "column", md: "row" }} gap={2} sx={{ mt: 2 }}>
          <EditorChoice editor="drag" onChoose={chooseEditor} />
          <EditorChoice editor="simple" onChoose={chooseEditor} />
        </Stack>
      ) : (
        <Stack gap={1.5} sx={{ mt: 2 }}>
          {items
            .filter((item) => item.kind === "templates")
            .map((item) => (
              <Button
                className="saved-template"
                key={item.id}
                onClick={() => onTemplate(item)}
              >
                <Box className="email-thumb">
                  <Box />
                  <Box />
                  <Box />
                </Box>
                <Box sx={{ flex: 1, textAlign: "left" }}>
                  <Typography fontWeight={900}>{item.name}</Typography>
                  <Typography color="text.secondary" fontSize={12}>
                    {item.description}
                  </Typography>
                </Box>
                <ArrowForwardRounded />
              </Button>
            ))}
        </Stack>
      )}
      <Dialog
        open={languageOpen}
        onClose={() => setLanguageOpen(false)}
        maxWidth="xs"
        fullWidth
        className="email-language-dialog"
      >
        <DialogTitle>
          <Typography
            color="primary"
            fontSize={11}
            fontWeight={900}
            letterSpacing=".16em"
          >
            EMAIL LANGUAGE
          </Typography>
          <Typography variant="h2" fontSize={22} sx={{ mt: 1 }}>
            Choose language to start
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography color="text.secondary" fontSize={12}>
            The editor will open in this language first, and AI translation will
            use it as an available editor version.
          </Typography>
          <Typography fontSize={12} fontWeight={900} sx={{ mt: 2, mb: 0.75 }}>
            Create email in
          </Typography>
          <Select
            fullWidth
            size="small"
            value={language}
            onChange={(event) => setLanguage(String(event.target.value))}
          >
            {languageOptions.map((option) => (
              <MenuItem key={option.code} value={option.code}>
                {option.name}
              </MenuItem>
            ))}
          </Select>
          <Box
            className="email-language-default"
            onClick={() => setRememberLanguage((value) => !value)}
          >
            <input
              type="checkbox"
              checked={rememberLanguage}
              onChange={(event) => setRememberLanguage(event.target.checked)}
              onClick={(event) => event.stopPropagation()}
            />
            <Box>
              <Typography fontSize={12} fontWeight={900}>
                Set as default for next time
              </Typography>
              <Typography color="text.secondary" fontSize={11}>
                Selected language: {languageName(language)}
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLanguageOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={continueWithLanguage}>
            Continue
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
function EditorChoice({
  editor,
  onChoose,
}: {
  editor: Editor;
  onChoose: (editor: Editor) => void;
}) {
  const drag = editor === "drag";
  return (
    <Card
      tabIndex={0}
      className="editor-choice-card"
      onClick={() => onChoose(editor)}
    >
      <Box className={`editor-art ${drag ? "drag-art" : "simple-art"}`}>
        <Image
          src={drag ? dragDropPreview : simpleEditorPreview}
          alt={drag ? "Drag and drop email editor preview" : "Simple email editor preview"}
          fill
          sizes="(max-width: 900px) 90vw, 560px"
          className="editor-preview-image"
        />
      </Box>
      <Box sx={{ p: 2.5 }}>
        <Chip
          label={drag ? "Design and engage" : "Fast and focused"}
          size="small"
        />
        <Typography variant="h3" sx={{ mt: 1 }}>
          {drag ? "Drag & drop editor" : "Simple editor"}
        </Typography>
        <Typography color="text.secondary" fontSize={12} sx={{ mt: 0.7 }}>
          {drag
            ? "Create polished, visual emails with images, sections, buttons, dividers, and branded layouts. Ideal for newsletters, promotions, product announcements, and high-impact campaigns."
            : "Create clear, personal emails in seconds. Ideal for welcome messages, reminders, follow-ups, re-engagement emails, and simple Journey Automation steps."}
        </Typography>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mt: 2 }}
        >
          <Chip
            label={
              drag ? "Best for visual campaigns" : "Best for announcements"
            }
            size="small"
            variant="outlined"
          />
          <IconButton className="choice-arrow">
            <ArrowForwardRounded />
          </IconButton>
        </Stack>
      </Box>
    </Card>
  );
}

function EditorToolbar({
  name,
  setName,
  language = "en",
  onClose,
  onSave,
  onSaveDraft,
  onSaveTemplate,
  onPreview,
  onPrepare,
  onNotice,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: {
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  name: string;
  setName: (value: string) => void;
  language?: string;
  onClose: () => void;
  onSave: () => void;
  onSaveDraft?: () => void;
  onSaveTemplate?: () => void;
  onPreview: () => void;
  onPrepare: () => void;
  onNotice: (message: string) => void;
}) {
  const [previewAnchor, setPreviewAnchor] = useState<null | HTMLElement>(null);
  const [saveAnchor, setSaveAnchor] = useState<null | HTMLElement>(null);
  return (
    <Box className="email-editor-toolbar compact-email-header">
      <Stack direction="row" alignItems="center" gap={2}>
        <TextField
          value={name}
          onChange={(e) => setName(e.target.value)}
          size="small"
          aria-label="Campaign name"
        />
        <Select
          size="small"
          value={language}
          sx={{
            color: "#fff",
            ".MuiOutlinedInput-notchedOutline": {
              borderColor: "rgba(255,255,255,.15)",
            },
          }}
        >
          <MenuItem value={language}>{languageName(language)}</MenuItem>
        </Select>
      </Stack>
      <Stack direction="row" alignItems="center" gap={1} sx={{ ml: "auto" }}>
      <IconButton
        sx={{ color: "#aaa" }}
        aria-label="Undo"
        title="Undo (Ctrl/Cmd+Z)"
        disabled={canUndo === false}
        onClick={onUndo ?? (() => onNotice("Nothing to undo yet"))}
      >
        <UndoRounded />
      </IconButton>
      <IconButton
        sx={{ color: "#aaa" }}
        aria-label="Redo"
        title="Redo (Ctrl/Cmd+Shift+Z)"
        disabled={canRedo === false}
        onClick={onRedo ?? (() => onNotice("Nothing to redo yet"))}
      >
        <RedoRounded />
      </IconButton>
      <Button
        color="inherit"
        endIcon={<KeyboardArrowDownRounded />}
        onClick={(event) => setPreviewAnchor(event.currentTarget)}
      >
        Preview and test
      </Button>
      <Button
        variant="contained"
        color="success"
        endIcon={<KeyboardArrowDownRounded />}
        onClick={(event) => setSaveAnchor(event.currentTarget)}
      >
        Save
      </Button>
      <Menu
        anchorEl={previewAnchor}
        open={Boolean(previewAnchor)}
        onClose={() => setPreviewAnchor(null)}
      >
        <MenuItem onClick={() => { onPreview(); setPreviewAnchor(null); }}>Preview mode</MenuItem>
        <MenuItem onClick={() => { onPreview(); setPreviewAnchor(null); }}>Send a test email</MenuItem>
      </Menu>
      <Menu
        anchorEl={saveAnchor}
        open={Boolean(saveAnchor)}
        onClose={() => setSaveAnchor(null)}
      >
        <MenuItem onClick={() => { (onSaveDraft || onSave)(); setSaveAnchor(null); }}>Save as draft</MenuItem>
        <MenuItem onClick={() => { (onSaveTemplate ?? (() => onNotice("Template saved locally")))(); setSaveAnchor(null); }}>Save as template</MenuItem>
        <MenuItem onClick={() => { onPrepare(); setSaveAnchor(null); }}>Prepare to send campaign</MenuItem>
      </Menu>
      <CloseEmailEditor onDiscard={onClose} onSaveDraft={onSaveDraft || onSave} />
      </Stack>
    </Box>
  );
}

function SimpleEditor({
  item,
  kind,
  onClose,
  onSave,
  onNotice,
}: {
  item: EmailItem | null;
  kind: "drafts" | "templates";
  onClose: () => void;
  onSave: (item: EmailItem, message: string) => void;
  onNotice: (message: string) => void;
}) {
  const [name, setName] = useState(
    item?.name ||
      (kind === "templates" ? "New email template" : "New email campaign"),
  );
  const [subject, setSubject] = useState(item?.subject || "");
  const [content, setContent] = useState(item?.content || "");
  const [preview, setPreview] = useState(false);
  const [review, setReview] = useState(false);
  const [panel, setPanel] = useState<"ai" | "settings">("ai");
  const [history, setHistory] = useState<string[]>([item?.content || ""]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const id = item?.id || `email-${Date.now()}`;
  const updateContent = (value: string) => {
    setContent(value);
    setHistory((current) => [...current.slice(0, historyIndex + 1), value]);
    setHistoryIndex((current) => current + 1);
  };
  const undo = () => {
    if (historyIndex <= 0) return;
    const next = historyIndex - 1;
    setHistoryIndex(next);
    setContent(history[next]);
  };
  const redo = () => {
    if (historyIndex >= history.length - 1) return;
    const next = historyIndex + 1;
    setHistoryIndex(next);
    setContent(history[next]);
  };
  const save = () =>
    onSave(
      {
        id,
        name,
        subject,
        description: subject || "Saved email content.",
        editor: "simple",
        kind,
        updated: "Updated just now",
        content,
      },
      kind === "templates" ? "Template saved" : "Draft saved",
    );
  if (review)
    return (
      <CampaignReview
        name={name}
        subject={subject}
        html={content || "<p>Your email content will appear here.</p>"}
        editor="Simple editor"
        onBack={() => setReview(false)}
        onSaveLater={save}
        onNotice={onNotice}
      />
    );
  return (
    <Box className="email-fullscreen">
      <EditorToolbar
        name={name}
        setName={setName}
        onClose={onClose}
        onSave={save}
        onPreview={() => setPreview(true)}
        onPrepare={() => setReview(true)}
        onNotice={onNotice}
      />
      <Stack direction="row" className="simple-editor-body">
        <Box className="editor-rail">
          <IconButton
            className={panel === "ai" ? "active" : ""}
            onClick={() => setPanel("ai")}
            aria-label="AI translation"
          >
            <Image src={aiIcon} alt="AI translation" width={28} height={28} />
          </IconButton>
          <IconButton
            className={panel === "settings" ? "active" : ""}
            onClick={() => setPanel("settings")}
            aria-label="Settings"
          >
            <SettingsRounded />
          </IconButton>
        </Box>
        <Box className="translation-panel">
          {panel === "ai" ? (
            <>
              <Typography variant="h3">AI translation</Typography>
              <Typography color="text.secondary" fontSize={12} sx={{ mt: 0.5 }}>
                Translate this simple email into selected languages, then switch
                between each version and edit it in the editor.
              </Typography>
              <Select
                fullWidth
                size="small"
                defaultValue="English"
                sx={{ mt: 2 }}
              >
                <MenuItem value="English">English</MenuItem>
                <MenuItem value="Spanish">Spanish</MenuItem>
                <MenuItem value="French">French</MenuItem>
              </Select>
              <Chip
                label="English"
                size="small"
                color="success"
                sx={{ mt: 1 }}
              />
              <Typography fontWeight={900} sx={{ mt: 3 }}>
                Translate into
              </Typography>
              {[
                "Arabic",
                "French",
                "German",
                "Spanish",
                "Indonesian",
                "Russian",
                "Turkish",
                "Portuguese",
              ].map((language) => (
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  key={language}
                  className="language-row"
                >
                  <Typography fontSize={12}>{language}</Typography>
                  <input type="checkbox" aria-label={language} />
                </Stack>
              ))}
              <Button
                fullWidth
                variant="contained"
                color="success"
                sx={{ mt: 2 }}
                onClick={() => onNotice("Translation copied locally")}
              >
                Translate selected languages
              </Button>
            </>
          ) : (
            <>
              <Typography variant="h3">Settings</Typography>
              <Typography color="text.secondary" fontSize={12} sx={{ mt: 0.5 }}>
                Simple email settings and footer content.
              </Typography>
              <TextField
                fullWidth
                label="Sender name"
                defaultValue="PixlPush"
                sx={{ mt: 2 }}
              />
              <TextField
                fullWidth
                label="Footer text"
                defaultValue="Unsubscribe · Privacy · Contact"
                multiline
                rows={3}
                sx={{ mt: 2 }}
              />
              <Button
                fullWidth
                variant="outlined"
                sx={{ mt: 2 }}
                onClick={() => onNotice("Settings saved locally")}
              >
                Save settings
              </Button>
            </>
          )}
        </Box>
        <Box className="simple-canvas">
          <Paper className="simple-mail-card">
            <Stack
              direction="row"
              gap={1}
              alignItems="center"
              sx={{ p: 2, borderBottom: "1px solid #eeeaf4" }}
            >
              <EmailRounded color="primary" />
              <Typography fontWeight={900}>Subject</Typography>
              <TextField
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Add a subject"
                size="small"
                fullWidth
              />
            </Stack>
            <Box sx={{ p: 2 }}>
              <Typography fontWeight={900} sx={{ mb: 1 }}>
                Email content
              </Typography>
              <Box
                contentEditable
                suppressContentEditableWarning
                onInput={(e) => updateContent(e.currentTarget.innerHTML)}
                dangerouslySetInnerHTML={{ __html: content }}
                className="simple-content"
                data-placeholder="Write your email content here..."
              />
            </Box>
            <Stack
              direction="row"
              gap={0.5}
              flexWrap="wrap"
              className="format-toolbar"
            >
              <Tooltip title="Undo">
                <IconButton onClick={undo}>
                  <UndoRounded />
                </IconButton>
              </Tooltip>
              <Tooltip title="Redo">
                <IconButton onClick={redo}>
                  <RedoRounded />
                </IconButton>
              </Tooltip>
              <Divider orientation="vertical" flexItem />
              <Tooltip title="Bold">
                <IconButton onClick={() => document.execCommand("bold")}>
                  <FormatBoldRounded />
                </IconButton>
              </Tooltip>
              <Tooltip title="Italic">
                <IconButton onClick={() => document.execCommand("italic")}>
                  <FormatItalicRounded />
                </IconButton>
              </Tooltip>
              <Tooltip title="Underline">
                <IconButton onClick={() => document.execCommand("underline")}>
                  <FormatUnderlinedRounded />
                </IconButton>
              </Tooltip>
              <Tooltip title="Strikethrough">
                <IconButton
                  onClick={() => document.execCommand("strikeThrough")}
                >
                  <StrikethroughSRounded />
                </IconButton>
              </Tooltip>
              <IconButton
                onClick={() => document.execCommand("insertOrderedList")}
              >
                <TextFieldsRounded />
              </IconButton>
              <IconButton
                onClick={() => document.execCommand("insertUnorderedList")}
              >
                <TextFieldsRounded />
              </IconButton>
              <IconButton onClick={() => document.execCommand("justifyLeft")}>
                <FormatAlignLeftRounded />
              </IconButton>
              <IconButton onClick={() => document.execCommand("justifyCenter")}>
                <FormatAlignCenterRounded />
              </IconButton>
              <IconButton onClick={() => document.execCommand("justifyRight")}>
                <FormatAlignRightRounded />
              </IconButton>
              <IconButton
                onClick={() => updateContent(`${content}<p>{{first_name}}</p>`)}
              >
                <InsertEmoticonRounded />
              </IconButton>
              <IconButton>
                <LinkRounded />
              </IconButton>
              <IconButton>
                <AttachFileRounded />
              </IconButton>
              <IconButton>
                <ImageRounded />
              </IconButton>
              <Button
                startIcon={<AutoAwesomeRounded />}
                variant="outlined"
                onClick={() => {
                  updateContent(
                    `${content}<p>Here is a clearer, more engaging message for your audience.</p>`,
                  );
                  onNotice("AI suggestion applied");
                }}
              >
                AI Suggestion
              </Button>
            </Stack>
            <Stack direction="row" gap={1} className="simple-format-row">
              <Select size="small" defaultValue="Inter">
                <MenuItem value="Inter">Inter</MenuItem>
                <MenuItem value="Arial">Arial</MenuItem>
                <MenuItem value="Georgia">Georgia</MenuItem>
              </Select>
              <Select size="small" defaultValue={16}>
                <MenuItem value={14}>14</MenuItem>
                <MenuItem value={16}>16</MenuItem>
                <MenuItem value={18}>18</MenuItem>
                <MenuItem value={24}>24</MenuItem>
              </Select>
              <Button
                startIcon={<InsertEmoticonRounded />}
                onClick={() =>
                  updateContent(`${content}<span>{{first_name}}</span>`)
                }
              >
                Insert personalization
              </Button>
            </Stack>
          </Paper>
        </Box>
      </Stack>
      {preview && (
        <PreviewModal
          title={subject || name}
          html={content || "<p>Your email content will appear here.</p>"}
          onClose={() => setPreview(false)}
          onNotice={onNotice}
        />
      )}
    </Box>
  );
}

function DragEditor({
  item,
  kind,
  projectId,
  language,
  onClose,
  onSave,
  onNotice,
}: {
  item: EmailItem | null;
  kind: "drafts" | "templates";
  projectId: string;
  language: string;
  onClose: () => void;
  onSave: (item: EmailItem, message: string) => void;
  onNotice: (message: string) => void;
}) {
  const [name, setName] = useState(
    item?.name ||
      (kind === "templates" ? "New email template" : "New email campaign"),
  );
  const [blocks, setBlocks] = useState<Block[]>(
    item?.blocks || [
      { id: 1, ...blockDefaults.navigation },
      { id: 2, ...blockDefaults.hero },
      { id: 3, ...blockDefaults.text },
      { id: 4, ...blockDefaults.footer },
    ],
  );
  const [subject, setSubject] = useState(item?.subject || "");
  const [translations, setTranslations] = useState<Record<string, { subject: string; html: string }>>(item?.translations || {});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [canvasZoom, setCanvasZoom] = useState(100);
  const [panel, setPanel] = useState<"blocks" | "ai" | "settings">("blocks");
  const [preview, setPreview] = useState(false);
  const [review, setReview] = useState(false);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [style, setStyle] = useState(
    item?.style || { primary: "#7132d3", background: "#eef2f8", width: 640 },
  );
  // Undo/redo: every change to the blocks or the template style is a snapshot. Changes that arrive within
  // half a second of each other (a slider or mouse drag) collapse into one step.
  const history = useRef({ past: [] as { blocks: Block[]; style: typeof style }[], future: [] as { blocks: Block[]; style: typeof style }[], last: { blocks, style }, restoring: false, changedAt: 0 });
  const [, refreshHistory] = useState(0);
  useEffect(() => {
    const h = history.current;
    if (h.last.blocks === blocks && h.last.style === style) return;
    if (h.restoring) { h.restoring = false; h.last = { blocks, style }; return; }
    const now = Date.now();
    if (now - h.changedAt > 500) { h.past.push(h.last); if (h.past.length > 100) h.past.shift(); }
    h.changedAt = now;
    h.future = [];
    h.last = { blocks, style };
    refreshHistory(count => count + 1);
  }, [blocks, style]);
  const travel = (from: "past" | "future") => {
    const h = history.current;
    const snapshot = h[from].pop();
    if (!snapshot) return;
    h[from === "past" ? "future" : "past"].push(h.last);
    h.restoring = true;
    h.changedAt = 0;
    setBlocks(snapshot.blocks);
    setStyle(snapshot.style);
    setSelected(current => current !== null && current < snapshot.blocks.length ? current : null);
    refreshHistory(count => count + 1);
  };
  const undo = () => travel("past");
  const redo = () => travel("future");
  const shortcuts = useRef({ undo, redo });
  shortcuts.current = { undo, redo };
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      // leave typing fields and the editable email text to the browser's own undo
      if (!(event.metaKey || event.ctrlKey) || target?.closest("input, textarea, [contenteditable='true']")) return;
      const key = event.key.toLowerCase();
      if (key === "z" && !event.shiftKey) { event.preventDefault(); shortcuts.current.undo(); }
      else if (key === "y" || (key === "z" && event.shiftKey)) { event.preventDefault(); shortcuts.current.redo(); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [inspectorTab, setInspectorTab] = useState(1);
  const [dragging, setDragging] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<DragCategory>("Navigation");
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [blockSearch, setBlockSearch] = useState("");
  const [draggingLibrary, setDraggingLibrary] = useState<LibraryItem | null>(null);
  const libraryCloseTimer = useRef<number | null>(null);
  const dragActive = useRef(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const resizeStart = useRef<{ x: number; width: number } | null>(null);
  const logoDragged = useRef(false);
  useEffect(() => () => { if (libraryCloseTimer.current) window.clearTimeout(libraryCloseTimer.current); }, []);
  const openLibrary = (category: DragCategory) => {
    if (libraryCloseTimer.current) window.clearTimeout(libraryCloseTimer.current);
    setActiveCategory(category);
    setLibraryOpen(true);
  };
  const scheduleLibraryClose = () => {
    if (dragActive.current) return;
    if (libraryCloseTimer.current) window.clearTimeout(libraryCloseTimer.current);
    libraryCloseTimer.current = window.setTimeout(() => {if(!dragActive.current)setLibraryOpen(false);}, 140);
  };
  const id = item?.id || `email-${Date.now()}`;
  const defaultSectionStyle = {primary: style.primary, background: "#ffffff", heading: "#1c2434", text: "#64748b", padding: 0, font: "Arial, sans-serif", headingSize: 32, textSize: 16, lineHeight: 1.6, imageWidth: 100};
  // `handles` adds the editor-only resize handles to a framed image; exported HTML never asks for them.
  const blockHtml = (block: Block, handles = false) => {
    const applyImageToSlot = (html: string) => {
      if (!block.imageSrc) return html;
      const safeSrc = block.imageSrc.replace(/['"<>]/g, "");
      // Logo blocks: the uploaded image takes the placeholder's place at a fixed pixel width (email clients need an explicit width).
      if (html.includes("data-logo") && typeof window !== "undefined") {
        const root = new DOMParser().parseFromString(html, "text/html").body;
        const logo = document.createElement("img");
        const width = block.logoWidth ?? logoSizes.md;
        logo.setAttribute("data-logo", "");
        logo.setAttribute("src", safeSrc);
        logo.setAttribute("alt", block.logoAlt ?? "Logo");
        logo.setAttribute("width", String(width));
        logo.setAttribute("draggable", "false");
        logo.setAttribute("style", `--logo-width:${width}px;display:inline-block;width:${width}px;max-width:100%;height:auto;border:0;vertical-align:middle;align-self:center;`);
        root.querySelector("[data-logo]")?.replaceWith(logo);
        return root.innerHTML;
      }
      // Image slots: the picture is framed inside the placeholder box; fit, height, zoom and position crop it without touching the file.
      // ponytail: CSS framing (object-fit/transform) — Outlook ignores it; bake the crop to a real image with a canvas when images are uploaded to the server.
      if (typeof window === "undefined") return html;
      const root = new DOMParser().parseFromString(html, "text/html").body;
      const slot = (root.querySelector("[data-image-slot]") || Array.from(root.querySelectorAll('div[style*="#f7f8fb"]')).find((el) => el.querySelector('[data-testid="ImageOutlinedIcon"], img'))) as HTMLElement | undefined;
      const safeAlt = (block.image?.alt ?? "").replace(/["<>]/g, "");
      if (!slot) return `<img src="${safeSrc}" alt="${safeAlt}" style="display:block;width:100%;max-height:260px;object-fit:cover;margin-bottom:16px;border-radius:8px;" />${html}`;
      const base = slot.getAttribute("data-base-style") ?? slot.getAttribute("style") ?? "";
      const frame = { ...imageDefaults, ...block.image };
      const width = block.sectionStyle?.imageWidth ?? 100;
      slot.setAttribute("data-image-slot", "");
      slot.setAttribute("data-base-style", base);
      slot.setAttribute("style", `${base};position:relative;overflow:hidden;padding:0;width:${width}%;margin-left:auto;margin-right:auto;border-radius:${frame.radius}px;${block.image?.height ? `height:${block.image.height}px;` : ""}`);
      slot.innerHTML = `<img data-slot-image="" draggable="false" src="${safeSrc}" alt="${safeAlt}" style="display:block;width:100%;height:100%;object-fit:${frame.fit};object-position:${frame.x}% ${frame.y}%;transform:scale(${frame.zoom});transform-origin:${frame.x}% ${frame.y}%;" />${handles ? imageOverlayHtml(`${Math.round(width)}%${block.image?.height ? ` × ${block.image.height}px` : ""} · ${frame.fit === "cover" ? `crop ${Math.round(frame.zoom * 100)}%` : "whole image"}`) : ""}`;
      return root.innerHTML;
    };
    if(block.designHtml) return applyImageToSlot(block.designHtml);
    const html=renderToStaticMarkup(<BlockDesign item={{type:block.type,label:block.variant || ({navigation:"Logo + Navigation",hero:"Standard hero",text:"Text",footer:"Footer"} as Record<string,string>)[block.type] || block.title}} />);
    if(block.variant) return applyImageToSlot(html);
    const escape=(text:string)=>text.replace(/[&<>"']/g, char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
    return html.replace('Introduce your concept',escape(block.title)).replace('Use this space to introduce subscribers to the topic of this newsletter.',escape(block.body)).replace('Share your story and help your readers discover what comes next.',escape(block.body || block.title));
  };
  const sectionVars = (block: Block) => {const v={...defaultSectionStyle,...block.sectionStyle};return {"--section-primary":v.primary,"--section-background":v.background,"--section-heading":v.heading,"--section-text":v.text,"--section-font":v.font,"--section-heading-size":`${v.headingSize}px`,"--section-heading-scale":v.headingSize/32,"--section-text-scale":v.textSize/16,"--section-text-size":`${v.textSize}px`,"--section-line-height":v.lineHeight,"--section-image-width":`${v.imageWidth}%`,padding:v.padding,fontFamily:v.font,backgroundColor:v.background} as React.CSSProperties;};
  // Email clients (Gmail, Outlook) drop var()/calc(), so the exported HTML gets the section's real values baked in.
  const resolveSectionVars = (html: string, block: Block) => {
    const v = {...defaultSectionStyle,...block.sectionStyle};
    const values: Record<string,string> = {primary:v.primary,background:v.background,heading:v.heading,text:v.text,font:v.font,"heading-size":`${v.headingSize}px`,"text-size":`${v.textSize}px`,"line-height":String(v.lineHeight),"image-width":`${v.imageWidth}%`};
    const scales = {heading:v.headingSize/32,text:v.textSize/16};
    return html
      .replace(/calc\(\s*([\d.]+)px\s*\*\s*var\(--section-(heading|text)-scale(?:,\s*1)?\)\s*\)/g, (_, size: string, kind: "heading"|"text") => `${Math.round(Number(size)*scales[kind]*10)/10}px`)
      .replace(/var\(--section-([a-z-]+)(?:,[^()]*)?\)/g, (match, key: string) => values[key] ?? match);
  };
  const documentHtml = blocks.map(block => renderToStaticMarkup(<div style={sectionVars(block)} dangerouslySetInnerHTML={{__html:resolveSectionVars(blockHtml(block), block)}}/>)).join("");
  const selectedBlock = selected === null ? null : blocks[selected] ?? null;
  const changeSelected = (patch: Partial<Block>) => selected !== null && setBlocks(current=>current.map((block,index)=>index===selected?{...block,...patch}:block));
  const removeSelectedImage = (index: number) => {
    setBlocks(current => current.map((block, blockIndex) => blockIndex === index
      ? { ...block, imageSrc: undefined, image: undefined, designHtml: undefined, sectionStyle: { ...defaultSectionStyle, ...block.sectionStyle, imageWidth: 100 } }
      : block
    ));
  };
  // Links, buttons and social icons live inside the section's HTML; the inspector reads and rewrites them there.
  const selectedDom = selectedBlock && typeof window !== "undefined" ? new DOMParser().parseFromString(blockHtml(selectedBlock), "text/html").body : null;
  const selectedLinks = selectedDom ? Array.from(selectedDom.querySelectorAll("[data-link]")).map((el) => ({ label: (el.textContent || "").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/\s+/g, " ").trim() || "Link", href: el.getAttribute("href") || "" })) : [];
  const selectedSocials = selectedDom ? Array.from(selectedDom.querySelectorAll("[data-social]")).map((el) => ({ network: el.getAttribute("data-social") || "facebook", href: el.getAttribute("href") || "" })) : [];
  const selectedHasSocials = Boolean(selectedDom?.querySelector("[data-socials]"));
  const selectedText = selectedDom ? sectionTextFeatures(selectedDom) : { heading: false, text: false };
  const selectedHasLogo = Boolean(selectedDom?.querySelector("[data-logo]"));
  const selectedHasImage = !selectedHasLogo && Boolean(selectedBlock?.imageSrc || selectedDom?.querySelector('[data-testid="ImageOutlinedIcon"]'));
  const safeHref = (value: string) => { const url = value.trim(); return !url || /^(javascript|data|vbscript):/i.test(url) ? "#" : url; };
  const editSelectedHtml = (mutate: (root: HTMLElement) => void) => {
    if (!selectedBlock) return;
    const root = new DOMParser().parseFromString(blockHtml(selectedBlock), "text/html").body;
    mutate(root);
    changeSelected({ designHtml: root.innerHTML });
  };
  const socialHtml = (network: string, url?: string) => renderToStaticMarkup(<SocialLink network={network} url={url} />);
  const changeSectionStyle = (patch: Partial<NonNullable<Block["sectionStyle"]>>) => selected !== null && setBlocks(current=>current.map((block,index)=>index===selected?{...block,sectionStyle:{...defaultSectionStyle,...block.sectionStyle,...patch}}:block));
  const openImagePicker = (index: number) => {
    setSelected(index);
    window.setTimeout(() => imageInputRef.current?.click(), 0);
  };
  // Drag the logo itself to resize it; a plain click still opens the file picker.
  const startLogoResize = (event: React.PointerEvent, index: number) => {
    const image = (event.target as HTMLElement).closest("img[data-logo]");
    if (!image) return;
    const rect = image.getBoundingClientRect();
    const blockRect = event.currentTarget.getBoundingClientRect();
    const centred = Math.abs((rect.left + rect.width / 2) - (blockRect.left + blockRect.width / 2)) < 6;
    const direction = event.clientX < rect.left + rect.width / 2 ? -1 : 1;
    const startX = event.clientX;
    const startWidth = blocks[index].logoWidth ?? logoSizes.md;
    resizeStart.current = { x: startX, width: startWidth };
    const onMove = (moveEvent: PointerEvent) => {
      const delta = moveEvent.clientX - startX;
      if (Math.abs(delta) < 3) return;
      logoDragged.current = true;
      const next = Math.round(Math.max(40, Math.min(400, startWidth + direction * delta * (centred ? 2 : 1) / (canvasZoom / 100))));
      setBlocks(current => current.map((block, blockIndex) => blockIndex === index ? { ...block, logoWidth: next } : block));
    };
    const onUp = () => { resizeStart.current = null; document.removeEventListener("pointermove", onMove); document.removeEventListener("pointerup", onUp); };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  };
  const changeSelectedImage = (patch: NonNullable<Block["image"]>) => selected !== null && setBlocks(current=>current.map((block,index)=>index===selected?{...block,image:{...block.image,...patch}}:block));
  const runImageAction = (index: number, action: string) => {
    if (action === "replace") return openImagePicker(index);
    if (action === "remove") return removeSelectedImage(index);
    setSelected(index);
    setBlocks(current => current.map((block, blockIndex) => {
      if (blockIndex !== index) return block;
      const frame = { ...imageDefaults, ...block.image };
      const patch = action === "reset" ? { x: 50, y: 50, zoom: 1 }
        : { fit: "cover" as const, zoom: Math.round(Math.max(1, Math.min(3, frame.zoom + (action === "zoom-in" ? 0.1 : -0.1))) * 100) / 100 };
      return { ...block, image: { ...block.image, ...patch } };
    }));
  };
  // Drag the picture to choose which part shows; drag the grip at its bottom edge to change the frame height.
  const startImageEdit = (event: React.PointerEvent, index: number) => {
    const target = event.target as HTMLElement;
    const slot = target.closest<HTMLElement>("[data-image-slot]");
    if (!slot || target.closest("[data-image-tools]")) return;
    const handle = target.closest("[data-image-handle]")?.getAttribute("data-image-handle") || "";
    const rect = slot.getBoundingClientRect();
    const parentWidth = slot.parentElement?.getBoundingClientRect().width || rect.width;
    const scale = canvasZoom / 100;
    const frame = { ...imageDefaults, ...blocks[index].image };
    const start = { x: event.clientX, y: event.clientY, height: slot.offsetHeight, width: blocks[index].sectionStyle?.imageWidth ?? 100 };
    resizeStart.current = { x: start.x, width: 0 };
    const clamp = (value: number, min: number, max: number) => Math.round(Math.max(min, Math.min(max, value)));
    const onMove = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - start.x, dy = moveEvent.clientY - start.y;
      if (Math.abs(dx) < 3 && Math.abs(dy) < 3) return;
      logoDragged.current = true;
      setBlocks(current => current.map((block, blockIndex) => {
        if (blockIndex !== index) return block;
        // no handle: pan the picture inside its frame
        if (!handle) return { ...block, image: { ...block.image, x: clamp(frame.x - dx / rect.width * 100, 0, 100), y: clamp(frame.y - dy / rect.height * 100, 0, 100) } };
        // the frame is centred, so a side handle moves both edges: twice the pointer travel
        const width = handle === "s" ? start.width : clamp(start.width + (handle.includes("w") ? -1 : 1) * dx * 2 / parentWidth * 100, 20, 100);
        const height = handle === "e" || handle === "w" ? block.image?.height : clamp(start.height + dy / scale, 60, 600);
        return { ...block, image: { ...block.image, height }, sectionStyle: { ...defaultSectionStyle, ...block.sectionStyle, imageWidth: width } };
      }));
    };
    const onUp = () => { resizeStart.current = null; document.removeEventListener("pointermove", onMove); document.removeEventListener("pointerup", onUp); };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  };
  const addLibraryItem = (entry: LibraryItem, at = blocks.length) => {
    const block: Block = {id:Date.now(), ...blockDefaults[entry.type],variant:entry.label,designHtml:renderToStaticMarkup(<BlockDesign item={entry}/>),sectionStyle:{...defaultSectionStyle}};
    setBlocks(current=>{const next=[...current];next.splice(at,0,block);return next;});
    setSelected(at);setInspectorTab(1);setDraggingLibrary(null);setDropIndex(null);setLibraryOpen(false);
  };
  const finishDrop = (at: number) => {
    dragActive.current=false;
    if(draggingLibrary) addLibraryItem(draggingLibrary, at);
    else if(dragging!==null){const target=at>dragging?at-1:at;setBlocks(current=>reorderByInsertionIndex(current,dragging,at));setSelected(target);}
    setDragging(null);setDropIndex(null);setLibraryOpen(false);
  };
  const move = (delta: number) => {
    if (selected === null) return;
    const next = selected + delta;
    if (next < 0 || next >= blocks.length) return;
    setBlocks((current) => {
      const clone = [...current];
      [clone[selected], clone[next]] = [clone[next], clone[selected]];
      return clone;
    });
    setSelected(next);
  };
  const errorMessage = (error: unknown, fallback: string) => error && typeof error === "object" && "message" in error ? String((error as { message?: unknown }).message) : fallback;
  // The file goes to the server first; the block only ever stores the returned public URL, so it survives a reload and works in the sent email.
  const uploadImage = async (file: File | undefined, imageKind: "image" | "logo") => {
    if (!file || selected === null) return;
    const blockId = blocks[selected].id;
    if (file.size > 5 * 1024 * 1024) { onNotice("The image is too large. Use one under 5 MB."); return; }
    setUploading(true);
    try {
      const asset = await emailApi.templates.uploadAsset(projectId, file, imageKind);
      setBlocks(current => current.map(block => block.id === blockId ? { ...block, imageSrc: asset.url } : block));
    } catch (error) {
      onNotice(errorMessage(error, "The image could not be uploaded."));
    } finally {
      setUploading(false);
    }
  };
  // What is delivered: the sections inside a centred container on the template's body background.
  const emailHtml = `<div style="margin:0;padding:24px 0;background-color:${style.background};"><div style="max-width:${style.width}px;margin:0 auto;background-color:#ffffff;">${documentHtml}</div></div>`;
  const emailSubject = subject.trim() || name.trim() || "Untitled email";
  const saveAs = async (destination: "drafts" | "templates") => {
    if (saving) return;
    setSaving(true);
    try {
      // `design` is everything needed to reopen the builder exactly as it was; `html` is what gets sent.
      const content = { subject: emailSubject, html: emailHtml, editor: "drag_drop" as const, design: { version: 1, blocks, style }, translations };
      const isExisting = Boolean(item?.id && !item.id.startsWith("email-"));
      const saved = destination === "templates"
        ? isExisting && item?.kind === "templates"
          ? await emailApi.templates.update(projectId, item.id, { name, ...content })
          : await emailApi.templates.create(projectId, { name, ...content })
        : isExisting && item?.kind === "drafts"
          ? await emailApi.campaigns.update(projectId, item.id, { name, content })
          : await emailApi.campaigns.create(projectId, { name, content });
      onSave(
        { id: saved.id, name, subject: emailSubject, description: "Visual email layout.", editor: "drag", kind: destination, updated: "Updated just now", content: emailHtml, translations, blocks, style },
        destination === "templates" ? "Template saved" : "Draft saved",
      );
    } catch (error) {
      onNotice(errorMessage(error, "Could not save this email."));
    } finally {
      setSaving(false);
    }
  };
  const save = () => saveAs(kind);
  if (review)
    return (
      <CampaignReview
        name={name}
        subject={emailSubject}
        html={emailHtml}
        editor="Drag & drop editor"
        onBack={() => setReview(false)}
        onSaveLater={save}
        onNotice={onNotice}
      />
    );
  return (
    <Box className={`email-fullscreen drag-editor ${libraryOpen ? "drag-library-visible" : "drag-library-hidden"}`}>
      <EditorToolbar
        name={name}
        setName={setName}
        language={language}
        onClose={onClose}
        onSave={save}
        onSaveDraft={() => saveAs("drafts")}
        onSaveTemplate={() => saveAs("templates")}
        onPreview={() => setPreview(true)}
        onPrepare={() => setReview(true)}
        onNotice={onNotice}
        onUndo={undo}
        onRedo={redo}
        canUndo={history.current.past.length > 0}
        canRedo={history.current.future.length > 0}
      />
      <Box className={`drag-editor-body panel-${panel} ${libraryOpen ? "library-open" : "library-closed"}`}>
        <Box className="editor-rail">
          <IconButton
            className={panel === "blocks" ? "active" : ""}
            onClick={() => setPanel("blocks")}
            aria-label="Blocks"
          >
            <GridViewRounded />
          </IconButton>
          <IconButton
            className={panel === "ai" ? "active" : ""}
            onClick={() => setPanel("ai")}
            aria-label="AI translation"
          >
            <Image src={aiIcon} alt="AI translation" width={28} height={28} />
          </IconButton>
          <IconButton
            className={panel === "settings" ? "active" : ""}
            onClick={() => setPanel("settings")}
            aria-label="Settings"
          >
            <SettingsRounded />
          </IconButton>
        </Box>
        <Box className="blocks-panel" onMouseLeave={scheduleLibraryClose}>
          {panel === "blocks" ? (
            <>
              <Typography className="drag-panel-kicker">BLOCKS</Typography>
              <Typography variant="h3">Add sections</Typography>
              <TextField
                size="small"
                placeholder="Search blocks"
                value={blockSearch}
                onChange={(event) => { setBlockSearch(event.target.value); if (event.target.value) openLibrary(activeCategory); }}
                sx={{ mt: 2 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRounded fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
              <Box className="drag-category-list">
                {dragCategories.map((category) => (
                  <Button key={category} className={`drag-category ${activeCategory === category && libraryOpen ? "active" : ""}`} onMouseEnter={() => openLibrary(category)} onClick={() => openLibrary(category)}>
                    <span className="drag-category-icon">{(() => { const Icon = dragCategoryIcons[category]; return <Icon fontSize="small" />; })()}</span><span>{category}</span><ArrowForwardRounded fontSize="small" />
                  </Button>
                ))}
              </Box>
            </>
          ) : panel === "ai" ? (
            <EmailTranslationPanel mode="drag" onNotice={onNotice} projectId={projectId} subject={emailSubject} html={emailHtml} sourceLanguage={language} initialTranslations={translations} onTranslationsChange={setTranslations} />
          ) : (
            <>
              <Typography component="h3" className="admin-side-title">Settings</Typography>
              <Typography className="admin-side-copy">
                Choose how new campaigns should start in the editor.
              </Typography>
              <Box className="admin-side-card">
                <EmailLanguageSettings projectId={projectId} currentLanguage={language} dark onNotice={onNotice} />
              </Box>
            </>
          )}
        </Box>
        {panel === "blocks" && libraryOpen && (() => {
          // Searching looks across every category; otherwise show the hovered one.
          const entries = (blockSearch ? Object.values(dragLibrary).flat() : dragLibrary[activeCategory]).filter((entry) => `${entry.label} ${entry.description}`.toLowerCase().includes(blockSearch.toLowerCase()));
          return (
          <Box className={`library-panel ${draggingLibrary ? "is-dragging" : ""}`} onMouseEnter={() => { if (libraryCloseTimer.current) window.clearTimeout(libraryCloseTimer.current); }} onMouseLeave={scheduleLibraryClose}>
            <Typography className="drag-panel-kicker">{blockSearch ? "SEARCH RESULTS" : activeCategory.toUpperCase()}</Typography>
            <Typography color="text.secondary" fontSize={12} sx={{ mt: 1 }}>Drag a design into the email or click Add.</Typography>
            <Stack gap={1.5} sx={{ mt: 2 }}>
              {entries.length === 0 && <Box className="library-empty">No blocks match “{blockSearch}”.</Box>}
              {entries.map((entry, entryIndex) => (
                <Paper key={`${entry.type}-${entry.label}-${entryIndex}`} className="library-card" draggable onDragStart={(event) => { dragActive.current=true; if(libraryCloseTimer.current) window.clearTimeout(libraryCloseTimer.current); event.dataTransfer.setData("text/plain", entry.label); event.dataTransfer.effectAllowed="copy"; setDraggingLibrary(entry); }} onDragEnd={() => {dragActive.current=false;setDraggingLibrary(null);setDropIndex(null);setLibraryOpen(false);}}>
                  <Box className="dashboard-design-thumbnail"><BlockDesign item={entry} miniature /></Box>
                  <Box className="library-card-meta">
                    <DragIndicatorRounded />
                    <div>
                      <Typography className="library-card-title">{entry.label}</Typography>
                      <Typography className="library-card-desc">{entry.description}</Typography>
                    </div>
                    <Button size="small" startIcon={<AddRounded />} onClick={() => addLibraryItem(entry)}>Add</Button>
                  </Box>
                </Paper>
              ))}
            </Stack>
          </Box>
          );
        })()}
        <Box className="drag-canvas" onClick={(event) => { if (!(event.target as HTMLElement).closest(".email-block")) setSelected(null); }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ mb: 1 }}
          >
            <Typography variant="overline" color="text.secondary">
              Live email preview
            </Typography>
            <Stack direction="row" alignItems="center" gap={1} onClick={event => event.stopPropagation()}>
            <Box className="canvas-zoom-controls" role="group" aria-label="Email canvas zoom">
              <IconButton size="small" aria-label="Zoom out" disabled={canvasZoom <= 50} onClick={() => setCanvasZoom(value => Math.max(50, value - 10))}><ZoomOutRounded /></IconButton>
              <Button aria-label="Reset zoom to 100 percent" title="Reset zoom to 100%" onClick={() => setCanvasZoom(100)}>{canvasZoom}%</Button>
              <IconButton size="small" aria-label="Zoom in" disabled={canvasZoom >= 150} onClick={() => setCanvasZoom(value => Math.min(150, value + 10))}><ZoomInRounded /></IconButton>
            </Box>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={device}
              onChange={(_, value) => value && setDevice(value)}
            >
              <ToggleButton value="desktop">Desktop</ToggleButton>
              <ToggleButton value="mobile">Mobile</ToggleButton>
            </ToggleButtonGroup>
            </Stack>
          </Stack>
          <Paper
            className="email-render-canvas"
            onDragOver={(event) => {event.preventDefault();if(event.target===event.currentTarget)setDropIndex(blocks.length);}}
            onDrop={(event) => {event.preventDefault();event.stopPropagation();finishDrop(dropIndex ?? blocks.length);}}
            sx={{
              width: device === "mobile" ? 390 : style.width,
              maxWidth: "none",
              zoom: canvasZoom / 100,
              background: "#fff",
            }}
          >
            {blocks.map((block, index) => (
              <Box key={block.id}>
              {dropIndex===index && <Box className="design-drop-indicator">Drop section here</Box>}
              <Box
                key={block.id}
                draggable
                onDragStart={(event) => {if(resizeStart.current){event.preventDefault();return;}dragActive.current=true;event.dataTransfer.setData("text/plain", String(block.id));event.dataTransfer.effectAllowed="move";setDragging(index);}}
                onDragEnd={() => {dragActive.current=false;setDragging(null);setDropIndex(null);}}
                onDragOver={(event) => {event.preventDefault();event.stopPropagation();const rect=event.currentTarget.getBoundingClientRect();setDropIndex(index+(event.clientY>rect.top+rect.height/2?1:0));}}
                onDrop={(event) => {event.preventDefault();event.stopPropagation();finishDrop(dropIndex ?? index);}}
                className={`email-block ${selected === index ? "selected" : ""} ${dragging === index ? "dragging" : ""}`}
                data-label={block.variant || block.type}
                onClick={() => {setSelected(index);setInspectorTab(1);}}
              >
                <Stack direction="row" className="block-controls">
                  <IconButton
                    size="small"
                    aria-label="Move section up"
                    title="Move section up"
                    onClick={(e) => {
                      e.stopPropagation();
                      move(-1);
                    }}
                  >
                    <ArrowUpwardRounded />
                  </IconButton>
                  <IconButton
                    size="small"
                    aria-label="Move section down"
                    title="Move section down"
                    onClick={(e) => {
                      e.stopPropagation();
                      move(1);
                    }}
                  >
                    <ArrowDownwardRounded />
                  </IconButton>
                  <IconButton
                    size="small"
                    aria-label="Duplicate section"
                    title="Duplicate section"
                    onClick={(e) => {
                      e.stopPropagation();
                      setBlocks((current) => [
                        ...current,
                        { ...block, id: Date.now() },
                      ]);
                    }}
                  >
                    <ContentCopyRounded />
                  </IconButton>
                  <IconButton
                    size="small"
                    aria-label="Delete section"
                    title="Delete section"
                    onClick={(e) => {
                      e.stopPropagation();
                      setBlocks((current) =>
                        current.filter((_, blockIndex) => blockIndex !== index),
                      );
                      setSelected(null);
                    }}
                  >
                    <DeleteOutlineRounded />
                  </IconButton>
                </Stack>
                <div className={`section-design-content ${blockHtml(block).includes("-scale") ? "scaled" : ""}`} style={sectionVars(block)} contentEditable suppressContentEditableWarning onPointerDown={(event) => { startLogoResize(event, index); startImageEdit(event, index); }} onClick={(event) => { const target = event.target as HTMLElement; const imageAction = target.closest("[data-image-action]")?.getAttribute("data-image-action"); if (imageAction) { event.preventDefault(); runImageAction(index, imageAction); return; } if (logoDragged.current) { logoDragged.current = false; event.preventDefault(); return; } if (target.closest(".image-placeholder") || target.closest('div[style*="background-color:#f7f8fb"]')?.querySelector('[data-testid="ImageOutlinedIcon"]')) { event.preventDefault(); event.stopPropagation(); openImagePicker(index); } }} onBlur={event=>{const html=event.currentTarget.innerHTML;setBlocks(current=>current.map(value=>value.id===block.id?{...value,designHtml:html}:value));}} dangerouslySetInnerHTML={{__html:blockHtml(block, true)}} />
              </Box>
              </Box>
            ))}
            {blocks.length === 0 && dropIndex === null && <Box className="canvas-empty"><strong>Your email is empty</strong>Pick a category on the left, then drag a block here or click Add.</Box>}
            {dropIndex===blocks.length && <Box className="design-drop-indicator">Drop section here</Box>}
          </Paper>
        </Box>
        <Box className="inspector-panel">
          {selectedBlock === null ? <>
            <Tabs value={0}><Tab label="Template" /><Tab label="Style" disabled /></Tabs>
            <Paper className="inspector-brand-card" sx={{mt:3}}>
              <Typography className="drag-panel-kicker">TEMPLATE</Typography>
              <Typography variant="h3" sx={{mt:2}}>Brand system</Typography>
              <Typography color="text.secondary" fontSize={12} sx={{mt:1}}>Set default colors, typography, and layout for this whole email.</Typography>
            </Paper>
            <TextField fullWidth size="small" label="Subject line" placeholder="What recipients see in their inbox" value={subject} onChange={event=>setSubject(event.target.value)} inputProps={{maxLength:998}} InputLabelProps={{shrink:true}} sx={{mt:3}} />
            <Typography fontWeight={900} sx={{mt:3}}>Layout</Typography>
            <ToggleButtonGroup exclusive size="small" value={style.width} onChange={(_,value)=>value&&setStyle(current=>({...current,width:value}))} sx={{mt:1}}>
              <ToggleButton value={640}>Default</ToggleButton><ToggleButton value={760}>Wide</ToggleButton>
            </ToggleButtonGroup>
            <TextField select fullWidth label="Font" value="Arial" sx={{mt:3}} onChange={()=>undefined}><MenuItem value="Arial">Arial</MenuItem><MenuItem value="Inter">Inter</MenuItem><MenuItem value="Georgia">Georgia</MenuItem><MenuItem value="Verdana">Verdana</MenuItem></TextField>
            {([['primary','Primary color'],['background','Body background']] as const).map(([key,label])=><TextField key={key} fullWidth type="color" label={label} value={style[key]} onChange={event=>setStyle(current=>({...current,[key]:event.target.value}))} sx={{mt:2}} />)}
          </> : <>
            <Typography className="drag-panel-kicker">INSPECTOR</Typography>
            <Typography variant="h3" sx={{mt:1}}>{selectedBlock.variant || selectedBlock.type}</Typography>
            <Typography color="text.secondary" fontSize={12} sx={{mt:1}}>Click any text in the email to edit it. Links, social icons and style are set here.</Typography>
            {selectedLinks.length > 0 && <Paper className="inspector-upload-card" sx={{mt:2}}>
              <Typography fontWeight={800} fontSize={12}>Links and buttons</Typography>
              {selectedLinks.map((link, linkIndex) => <Box className="inspector-link-row" key={linkIndex}>
                <TextField size="small" fullWidth label={link.label} placeholder="https://" value={link.href === "#" ? "" : link.href} onChange={event=>editSelectedHtml(root=>root.querySelectorAll("[data-link]")[linkIndex]?.setAttribute("href", safeHref(event.target.value)))} InputLabelProps={{shrink:true}} />
                <IconButton size="small" aria-label={`Remove ${link.label}`} title="Remove" onClick={()=>editSelectedHtml(root=>root.querySelectorAll("[data-link]")[linkIndex]?.remove())}><DeleteOutlineRounded /></IconButton>
              </Box>)}
            </Paper>}
            {selectedHasSocials && <Paper className="inspector-upload-card" sx={{mt:2}}>
              <Typography fontWeight={800} fontSize={12}>Social links</Typography>
              {selectedSocials.map((social, socialIndex) => <Box className="inspector-link-row inspector-social-row" key={socialIndex}>
                <TextField select size="small" aria-label="Network" value={socialNetworks[social.network] ? social.network : "facebook"} onChange={event=>editSelectedHtml(root=>{const el=root.querySelectorAll("[data-social]")[socialIndex]; if(!el) return; const wasDefault=social.href===socialNetworks[social.network]?.url; el.outerHTML=socialHtml(event.target.value, wasDefault ? undefined : social.href);})}>
                  {Object.entries(socialNetworks).map(([key, item]) => <MenuItem key={key} value={key}>{item.label}</MenuItem>)}
                </TextField>
                <TextField size="small" fullWidth placeholder="https://" aria-label="Profile URL" value={social.href} onChange={event=>editSelectedHtml(root=>root.querySelectorAll("[data-social]")[socialIndex]?.setAttribute("href", safeHref(event.target.value)))} />
                <IconButton size="small" aria-label={`Remove ${socialNetworks[social.network]?.label || "social"} link`} title="Remove" onClick={()=>editSelectedHtml(root=>root.querySelectorAll("[data-social]")[socialIndex]?.remove())}><DeleteOutlineRounded /></IconButton>
              </Box>)}
              <Button size="small" variant="outlined" startIcon={<AddRounded />} sx={{mt:1.5}} disabled={selectedSocials.length >= Object.keys(socialNetworks).length} onClick={()=>editSelectedHtml(root=>{const used=selectedSocials.map(item=>item.network); const next=Object.keys(socialNetworks).find(key=>!used.includes(key)) || "facebook"; root.querySelector("[data-socials]")?.insertAdjacentHTML("beforeend", socialHtml(next));})}>Add social link</Button>
            </Paper>}
            {selectedHasLogo && <Paper className="inspector-upload-card" sx={{mt:2}}>
              <Typography fontWeight={800} fontSize={12}>Logo</Typography>
              <Stack direction="row" gap={1} sx={{mt:1}}>
                <Button component="label" variant="contained" color="success" size="small" disabled={uploading}>{uploading ? "Uploading…" : selectedBlock.imageSrc ? "Replace" : "Upload logo"}<input ref={imageInputRef} hidden type="file" accept="image/*" onChange={event=>{void uploadImage(event.target.files?.[0],"logo");event.currentTarget.value=""}} /></Button>
                {selectedBlock.imageSrc && selected !== null && <Button variant="outlined" size="small" onClick={()=>removeSelectedImage(selected)}>Remove</Button>}
              </Stack>
              {selectedBlock.imageSrc ? <>
                <Stack direction="row" justifyContent="space-between" sx={{mt:2}}><Typography fontSize={12}>Size</Typography><Typography fontSize={12} fontWeight={800}>{selectedBlock.logoWidth ?? logoSizes.md}px wide</Typography></Stack>
                <ToggleButtonGroup exclusive fullWidth size="small" value={selectedBlock.logoWidth ?? logoSizes.md} onChange={(_,value)=>value&&changeSelected({logoWidth:value})} sx={{mt:1}}>
                  {Object.entries(logoSizes).map(([name,width])=><ToggleButton key={name} value={width} title={`${width}px`}>{name.toUpperCase()}</ToggleButton>)}
                </ToggleButtonGroup>
                <Box className="inspector-slider-row" sx={{pt:"6px !important",borderBottom:"0 !important"}}><input type="range" aria-label="Logo width" min={40} max={400} step={2} value={selectedBlock.logoWidth ?? logoSizes.md} onChange={event=>changeSelected({logoWidth:Number(event.target.value)})} /></Box>
                <TextField size="small" fullWidth label="Logo name (alt text)" placeholder="Your brand name" value={selectedBlock.logoAlt ?? ""} onChange={event=>changeSelected({logoAlt:event.target.value})} InputLabelProps={{shrink:true}} sx={{mt:1}} />
                <Typography className="inspector-hint">Drag the logo in the email to resize it. Readers see the logo name when images are blocked. Best results: a transparent PNG at least twice the displayed width.</Typography>
              </> : <Typography className="inspector-hint">No image yet, so the text logo is shown. Click it in the email to type your brand name, or upload a logo to replace it.</Typography>}
            </Paper>}
            {selectedHasImage && <Paper className="inspector-upload-card" sx={{mt:2}}>
              <Typography fontWeight={800} fontSize={12}>Image</Typography>
              <Stack direction="row" gap={1} sx={{mt:1}}>
                <Button component="label" variant="contained" color="success" size="small" disabled={uploading}>{uploading ? "Uploading…" : selectedBlock.imageSrc ? "Replace" : "Upload image"}<input ref={imageInputRef} hidden type="file" accept="image/*" onChange={event=>{void uploadImage(event.target.files?.[0],"image");event.currentTarget.value=""}} /></Button>
                {selectedBlock.imageSrc && selected !== null && <Button variant="outlined" size="small" onClick={()=>removeSelectedImage(selected)}>Remove</Button>}
              </Stack>
              {selectedBlock.imageSrc ? (() => {
                const frame = { ...imageDefaults, ...selectedBlock.image };
                const height = selectedBlock.image?.height ?? (parseFloat(selectedDom?.querySelector<HTMLElement>("[data-image-slot]")?.style.height || "") || 200);
                const sliders = [
                  { label: "Height", value: height, unit: "px", min: 60, max: 600, step: 2, set: (value: number) => changeSelectedImage({ height: value }) },
                  { label: "Width", value: Math.round(selectedBlock.sectionStyle?.imageWidth ?? 100), unit: "%", min: 20, max: 100, step: 1, set: (value: number) => changeSectionStyle({ imageWidth: value }) },
                  ...(frame.fit === "cover" ? [{ label: "Zoom", value: Math.round(frame.zoom * 100), unit: "%", min: 100, max: 300, step: 5, set: (value: number) => changeSelectedImage({ zoom: value / 100 }) }] : []),
                  { label: "Corner radius", value: frame.radius, unit: "px", min: 0, max: 40, step: 1, set: (value: number) => changeSelectedImage({ radius: value }) },
                ];
                return <>
                  <ToggleButtonGroup exclusive fullWidth size="small" value={frame.fit} onChange={(_,value)=>value&&changeSelectedImage(value === "contain" ? { fit: value, zoom: 1 } : { fit: value })} sx={{mt:2}}>
                    <ToggleButton value="cover" title="Fill the frame and crop the overflow">Fill and crop</ToggleButton>
                    <ToggleButton value="contain" title="Show the whole image inside the frame">Fit whole image</ToggleButton>
                  </ToggleButtonGroup>
                  {sliders.map(slider => <Box className="inspector-slider-row" key={slider.label}><Stack direction="row" justifyContent="space-between"><Typography fontSize={12}>{slider.label}</Typography><Typography fontSize={12} fontWeight={800}>{slider.value}{slider.unit}</Typography></Stack><input type="range" aria-label={`Image ${slider.label.toLowerCase()}`} min={slider.min} max={slider.max} step={slider.step} value={slider.value} onChange={event=>slider.set(Number(event.target.value))} /></Box>)}
                  <Button variant="outlined" size="small" sx={{mt:1.5}} onClick={()=>changeSelectedImage({ x: 50, y: 50, zoom: 1 })}>Centre and reset zoom</Button>
                  <TextField size="small" fullWidth label="Image description (alt text)" placeholder="Describe the image" value={selectedBlock.image?.alt ?? ""} onChange={event=>changeSelectedImage({alt:event.target.value})} InputLabelProps={{shrink:true}} sx={{mt:2}} />
                  <Typography className="inspector-hint">Use the toolbar on the image to replace, zoom or delete it. Drag the white handles to resize: sides change the width, the bottom changes the height, corners change both. Drag the image itself to choose which part shows; if it does not move, zoom in first.</Typography>
                </>;
              })() : <Typography className="inspector-hint">Click the grey placeholder in the email or upload an image here.</Typography>}
            </Paper>}
            <TextField select fullWidth label="Font" value={selectedBlock.sectionStyle?.font || "Arial, sans-serif"} onChange={event=>changeSectionStyle({font:event.target.value})} sx={{mt:2}}><MenuItem value="Arial, sans-serif">Arial</MenuItem><MenuItem value="Inter, sans-serif">Inter</MenuItem><MenuItem value="Georgia, serif">Georgia</MenuItem><MenuItem value="Verdana, sans-serif">Verdana</MenuItem></TextField>
            {([['headingSize','Heading size',18,64,1],['textSize','Text size',10,28,1],['lineHeight','Line height',1,2.2,.1],['padding','Section spacing',0,64,1]] as const).filter(([key])=>key==='headingSize'?selectedText.heading:key==='padding'||selectedText.text).map(([key,label,min,max,step])=><Box className="inspector-slider-row" key={key}><Stack direction="row" justifyContent="space-between"><Typography fontSize={12}>{label}</Typography><Typography fontSize={12} fontWeight={800}>{selectedBlock.sectionStyle?.[key] ?? defaultSectionStyle[key]}{key === 'lineHeight' ? '' : 'px'}</Typography></Stack><input type="range" min={min} max={max} step={step} value={selectedBlock.sectionStyle?.[key] ?? defaultSectionStyle[key]} onChange={event=>changeSectionStyle({[key]:Number(event.target.value)})} /></Box>)}
            {([['primary','Primary color'],['heading','Heading color'],['text','Text color'],['background','Section background']] as const).map(([key,label])=><TextField key={key} fullWidth type="color" label={label} value={{...defaultSectionStyle,...selectedBlock.sectionStyle}[key]} onChange={event=>changeSectionStyle({[key]:event.target.value})} sx={{mt:1.5}} />)}
            <Button variant="outlined" onClick={()=>changeSectionStyle(defaultSectionStyle)} sx={{mt:2}}>Reset section style</Button>
          </>}
        </Box>
      </Box>
      {preview && (
        <PreviewModal
          title={name}
          html={emailHtml}
          onClose={() => setPreview(false)}
          onNotice={onNotice}
        />
      )}
    </Box>
  );
}
function PreviewModal({
  title,
  html,
  onClose,
  onNotice,
}: {
  title: string;
  html: string;
  onClose: () => void;
  onNotice: (message: string) => void;
}) {
  return (
    <Box className="email-modal-backdrop">
      <Paper className="email-preview-modal">
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Typography variant="h3">Preview and test</Typography>
          <IconButton onClick={onClose}>
            <CloseRounded />
          </IconButton>
        </Stack>
        <Typography color="text.secondary" fontSize={12}>
          Recipient-facing preview · {title}
        </Typography>
        <Paper
          className="recipient-preview"
          dangerouslySetInnerHTML={{ __html: html }}
        />
        <Stack direction="row" gap={1} justifyContent="flex-end">
          <TextField size="small" placeholder="test@example.com" />
          <Button
            variant="contained"
            startIcon={<SendRounded />}
            onClick={() => {
              onNotice("Test email prepared locally");
              onClose();
            }}
          >
            Send test
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}

function CampaignReview({
  name,
  subject,
  html,
  editor,
  onBack,
  onSaveLater,
  onNotice,
}: {
  name: string;
  subject: string;
  html: string;
  editor: string;
  onBack: () => void;
  onSaveLater: () => void;
  onNotice: (message: string) => void;
}) {
  const [deliveryMode, setDeliveryMode] = useState<"immediately" | "specific">("immediately");
  return (
    <Box className="campaign-review-screen">
      <Box className="campaign-review-inner">
        <Stack className="campaign-review-topbar" direction="row" justifyContent="space-between" alignItems="center">
          <Button startIcon={<ArrowBackRounded />} onClick={onBack}>Back to editor</Button>
          <Button variant="contained" color="success" onClick={() => { onSaveLater(); onNotice("Campaign saved for later"); }}>Save for later</Button>
        </Stack>
        <Stack className="campaign-review-heading" direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={2}>
          <Box>
            <Typography className="campaign-eyebrow">CAMPAIGN SETUP</Typography>
            <Typography variant="h1">Review your campaign</Typography>
            <Typography color="text.secondary">Check the details, preview your email, and send when you’re ready.</Typography>
          </Box>
          <Chip className="campaign-ready" label="Draft ready for review" />
        </Stack>
        <Box className="campaign-review-grid">
          <Stack gap={2.5}>
            <Paper className="campaign-review-card">
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={2}>
                <Box><Typography variant="h3">Campaign details</Typography><Typography color="text.secondary" fontSize={12}>Give your campaign a clear identity.</Typography></Box>
                <Chip label={editor} size="small" />
              </Stack>
              <Typography className="review-label">Campaign name</Typography><TextField fullWidth size="small" value={name} InputProps={{ readOnly: true }} />
              <Typography className="review-label">Subject line</Typography><TextField fullWidth size="small" value={subject} placeholder="Add a subject" InputProps={{ readOnly: true }} />
              <Typography className="review-label">Preheader <span>(optional)</span></Typography><TextField fullWidth size="small" placeholder="A short preview of your email content" InputProps={{ readOnly: true }} />
            </Paper>
            <ReviewInfoCard icon={<EmailRounded />} title="Sender details" copy="These details come from Email Marketing settings."><Box className="review-info-grid"><span><small>FROM NAME</small><b>PixlPush</b></span><span><small>FROM EMAIL</small><b>hello@pixlpush.com</b></span></Box></ReviewInfoCard>
            <ReviewInfoCard icon={<InsertEmoticonRounded />} title="Recipients" copy="Who should receive this campaign?"><Select fullWidth size="small" value="All eligible users"><MenuItem value="All eligible users">All eligible users</MenuItem></Select><Typography color="text.secondary" fontSize={11} sx={{ mt: 1.5 }}>You can change your recipient selection before the campaign is sent.</Typography><Typography fontWeight={900} fontSize={12} sx={{ mt: 1 }}>87,493 eligible recipients</Typography></ReviewInfoCard>
            <Paper className="campaign-review-card"><Stack direction="row" gap={1.5} alignItems="flex-start"><Box className="review-icon review-icon-orange">◷</Box><Box><Typography variant="h3">Schedule delivery</Typography><Typography color="text.secondary" fontSize={12}>Leave it blank to start delivery now, or choose a future time.</Typography></Box></Stack><Typography className="review-label">When should this message start sending?</Typography><Box className={`review-option ${deliveryMode === "immediately" ? "selected" : ""}`} onClick={() => setDeliveryMode("immediately")}>◉ Immediately</Box><Box className={`review-option ${deliveryMode === "specific" ? "selected" : ""}`} onClick={() => setDeliveryMode("specific")}>○ Specific date</Box>{deliveryMode === "specific" ? <Box className="review-schedule-panel"><Typography className="review-label">Select date</Typography><TextField fullWidth size="small" type="date" /><Stack direction="row" gap={1} sx={{ mt: 1.5 }}><TextField size="small" label="Hour" defaultValue="12" /><TextField size="small" label="Minute" defaultValue="00" /><Select size="small" defaultValue="AM"><MenuItem value="AM">AM</MenuItem><MenuItem value="PM">PM</MenuItem></Select></Stack><Typography className="review-timezone">Scheduled using your workspace timezone (UTC+1).</Typography></Box> : <Typography className="review-note">Immediate campaigns start through the background delivery pipeline.</Typography>}</Paper>
          </Stack>
          <Paper className="campaign-review-card campaign-review-preview"><Stack direction="row" justifyContent="space-between" alignItems="center"><Box><Typography variant="h3">Email preview</Typography><Typography color="text.secondary" fontSize={12}>This is how your campaign will look.</Typography></Box><Button variant="outlined" onClick={onBack}>Edit content</Button></Stack><Paper className="review-email-frame" dangerouslySetInnerHTML={{ __html: html || "<p>Your email content will appear here.</p>" }} /></Paper>
        </Box>
        <Paper className="campaign-review-footer"><Box><Typography fontWeight={900}>Ready to send this campaign?</Typography><Typography color="text.secondary" fontSize={11}>The campaign is prepared locally and can be sent when you are ready.</Typography></Box><Button variant="contained" startIcon={<SendRounded />} onClick={() => onNotice("Campaign ready to send locally")}>Send campaign</Button></Paper>
      </Box>
    </Box>
  );
}

function ReviewInfoCard({ icon, title, copy, children }: { icon: React.ReactNode; title: string; copy: string; children: React.ReactNode }) {
  return <Paper className="campaign-review-card"><Stack direction="row" gap={1.5} alignItems="flex-start"><Box className="review-icon">{icon}</Box><Box><Typography variant="h3">{title}</Typography><Typography color="text.secondary" fontSize={12}>{copy}</Typography></Box></Stack><Box sx={{ mt: 2 }}>{children}</Box></Paper>;
}
