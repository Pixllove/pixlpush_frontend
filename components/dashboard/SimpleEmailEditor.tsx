"use client";

import CloseEmailEditor from "./CloseEmailEditor";
import EmailTranslationPanel from "./EmailTranslationPanel";
import EmailLanguageSettings from "./EmailLanguageSettings";
import { languageName } from "./EmailLanguageSettings";
import { emailApi } from "@/lib/projects/api";
import Image from "next/image";
import aiIcon from "../../assets/ai.png";

import {
  ChangeEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  FormatAlignCenterRounded,
  FormatAlignLeftRounded,
  FormatAlignRightRounded,
  AttachFileRounded,
  AutoAwesomeRounded,
  ArrowBackRounded,
  AddRounded,
  CloseRounded,
  DeleteOutlineRounded,
  EmailRounded,
  ExpandLessRounded,
  ExpandMoreRounded,
  FacebookRounded,
  FormatBoldRounded,
  FormatItalicRounded,
  FormatUnderlinedRounded,
  ImageRounded,
  Instagram,
  InsertEmoticonRounded,
  KeyboardArrowDownRounded,
  LinkRounded,
  LinkedIn,
  RedoRounded,
  SettingsRounded,
  StrikethroughSRounded,
  TextFieldsRounded,
  UndoRounded,
  YouTube,
  X,
  SendRounded,
} from "@mui/icons-material";
import {
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";

type EmailKind = "drafts" | "templates";
type EditorItem = {
  id: string;
  name: string;
  subject: string;
  description: string;
  editor: "simple";
  kind: "send" | "drafts" | "templates";
  updated: string;
  content?: string;
};

type Props = {
  item: EditorItem | null;
  kind: EmailKind;
  projectId: string;
  language: string;
  onClose: () => void;
  onSave: (item: EditorItem, message: string) => void;
  onNotice: (message: string) => void;
};

type FooterType = "basic" | "social" | "app" | "social-app";
type FooterSocial = { platform: string; url: string };
type FooterConfig = {
  type: FooterType;
  brand: string;
  address: string;
  legal: string;
  appHeading: string;
  appStoreUrl: string;
  playStoreUrl: string;
  unsubscribeUrl: string;
  badgeText: string;
  socials: FooterSocial[];
};

const DEFAULT_FOOTER_CONFIG: FooterConfig = {
  type: "basic",
  brand: "PixlPush",
  address: "Add your company postal address here",
  legal: "You received this email because you signed up on our website or made a purchase from us.",
  appHeading: "Use our app on the go",
  appStoreUrl: "https://www.apple.com/app-store/",
  playStoreUrl: "https://play.google.com/",
  unsubscribeUrl: "#",
  badgeText: "",
  socials: [
    { platform: "Facebook", url: "https://facebook.com/" },
    { platform: "Instagram", url: "https://instagram.com/" },
    { platform: "X", url: "https://x.com/" },
  ],
};

const FOOTER_OPTIONS: Array<{ type: FooterType; title: string; description: string }> = [
  { type: "basic", title: "Basic footer", description: "Company details and unsubscribe" },
  { type: "social", title: "Social footer", description: "Company details and social links" },
  { type: "app", title: "App download", description: "App Store and Google Play links" },
  { type: "social-app", title: "Social + app download", description: "Social links and app downloads" },
];

const SOCIAL_OPTIONS = ["Facebook", "Instagram", "X", "LinkedIn", "YouTube"];

function SocialPlatformIcon({ platform }: { platform: string }) {
  const props = { sx: { fontSize: 16 } };
  if (platform === "Facebook") return <FacebookRounded {...props} />;
  if (platform === "Instagram") return <Instagram {...props} />;
  if (platform === "LinkedIn") return <LinkedIn {...props} />;
  if (platform === "YouTube") return <YouTube {...props} />;
  return <X {...props} />;
}

const SOCIAL_ICON_PATHS: Record<string, string> = {
  Facebook: "M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z",
  Instagram: "M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.61 18.39 4 16.4 4H7.6m9.65 1.5a1.25 1.25 0 1 1-1.25 1.25A1.25 1.25 0 0 1 17.25 5.5M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10m0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  LinkedIn: "M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 1 0 0-3.37 1.68 1.68 0 0 0 0 3.37m1.39 9.94v-8.37H5.5v8.37h2.77z",
  X: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
  YouTube: "M10 15l5.19-3L10 9v6m11.56-7.83c.13.47.22 1.1.28 1.9.07.8.1 1.49.1 2.09L22 12c0 2.19-.16 3.8-.44 4.83-.25.9-.83 1.48-1.73 1.73-.47.13-1.33.22-2.65.28-1.3.07-2.49.1-3.59.1L12 19c-4.19 0-6.8-.16-7.83-.44-.9-.47-1.48-.83-1.73-1.73-.13-.47-.22-1.33-.28-2.65-.07-.8-.1-1.49-.1-2.09L2 12c0-2.19.16-3.8.44-4.83.25-.9.83-1.48 1.73-1.73.47-.13 1.33-.22 2.65-.28 1.3-.07 2.49-.1 3.59-.1L12 5c4.19 0 6.8.16 7.83.44.9.13 1.48.83 1.73 1.73z",
};

function footerSvgIcon(platform: string) {
  const path = SOCIAL_ICON_PATHS[platform] || SOCIAL_ICON_PATHS.X;
  return `<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="display:block;margin:8px auto"><path d="${path}"/></svg>`;
}

function escapeFooterHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
      character
    ] || character,
  );
}

function footerInnerMarkup(config: FooterConfig) {
  const socialMarkup = config.socials
    .filter((social) => social.url.trim())
    .map(
      (social) =>
        `<a href="${escapeFooterHtml(social.url)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeFooterHtml(social.platform)}" style="display:inline-block;width:34px;height:34px;margin:0 8px 0 0;border-radius:50%;background:#475569;color:#fff;text-align:center;text-decoration:none;font-weight:800">${footerSvgIcon(social.platform)}</a>`,
    )
    .join("");
  const appMarkup =
    config.type === "app" || config.type === "social-app"
      ? `<p style="margin:22px 0 10px;font-size:18px;font-weight:800;color:#273449">${escapeFooterHtml(config.appHeading)}</p><a href="${escapeFooterHtml(config.appStoreUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:8px;margin:0 8px 10px 0;padding:9px 15px;border-radius:6px;background:#1f2937;color:#fff;text-decoration:none;font-weight:800"><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg><span>App Store</span></a><a href="${escapeFooterHtml(config.playStoreUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:8px;margin:0 0 10px;padding:9px 15px;border-radius:6px;background:#1f2937;color:#fff;text-decoration:none;font-weight:800"><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24"><path fill="#34a853" d="M2 3.5v17l10-8.5z"/><path fill="#4285f4" d="m2 3.5 12 6.8 3-2.2z"/><path fill="#fbbc04" d="m2 20.5 15-8.4-3-1.6z"/><path fill="#ea4335" d="m14 10.3 3 1.8-3 1.7-2-1.7z"/></svg><span>Google Play</span></a>`
      : "";
  const socialSection =
    config.type === "social" || config.type === "social-app"
      ? `<div style="margin:18px 0 8px">${socialMarkup}</div>`
      : "";
  return `<hr style="border:0;border-top:1px solid #cbd5e1;margin:0 0 24px"><p style="margin:0 0 10px;font-size:18px;font-weight:800;color:#273449">${escapeFooterHtml(config.brand)}</p><p style="margin:0 0 20px;font-size:16px;color:#64748b">${escapeFooterHtml(config.address)}</p><p style="margin:0 0 10px;font-size:16px;color:#64748b">${escapeFooterHtml(config.legal)}</p>${appMarkup}${socialSection}<p style="margin:18px 0 0"><a href="${escapeFooterHtml(config.unsubscribeUrl)}" style="color:#3d5be8;font-size:16px;font-weight:800;text-decoration:underline">Unsubscribe</a></p>${config.badgeText ? `<p style="margin:12px 0 0;font-size:12px;color:#94a3b8">${escapeFooterHtml(config.badgeText)}</p>` : ""}`;
}

function footerMarkup(config: FooterConfig, id: string) {
  return `<div data-email-footer="true" data-footer-id="${id}" contenteditable="false" style="position:relative;display:block;max-width:100%;margin:24px 0 0;padding:24px 38px 24px 0;user-select:none;color:#475569">${footerInnerMarkup(config)}<button type="button" data-footer-delete="true" contenteditable="false" aria-label="Remove footer" style="position:absolute;right:0;top:0;border:0;background:transparent;color:#ef4444;font:bold 14px/20px Arial,sans-serif;cursor:pointer;padding:4px 0">🗑 Remove footer</button></div>`;
}

const DEFAULT_SIGNATURE_HTML = `Viele Grüße,<br>&nbsp;<br>&nbsp;<br><table style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.35;color:#333;width:520px;max-width:100%;border-collapse:collapse;border-spacing:0;white-space:normal"><tbody><tr><td style="width:205px;padding:0 14px 0 0;text-align:center;vertical-align:top"><div style="width:120px;height:120px;border-radius:50%;margin:0 auto 10px;background:linear-gradient(135deg,#2d3261,#0aa971)"></div><div style="height:16px;width:160px;margin:10px auto;background:#0aa971;border-radius:3px"></div></td><td style="width:315px;border-left:1px solid #0AA971;padding:0 0 0 14px;text-align:left;vertical-align:top"><p style="margin:0;font-weight:bold;color:#2d3261;font-size:16px;line-height:20px">Emilija Schneidermann</p><p style="margin:0;font-size:14px;line-height:18px;color:#666">Sales Development Representative</p><p style="margin:0;font-size:14px;line-height:18px;color:#666">heyData GmbH</p><p style="margin:8px 0 4px;font-size:14px;line-height:18px;color:#0aa971;font-weight:700">Schedule a meeting</p><p style="margin:0;font-size:14px;line-height:18px;color:#666">Emilija@tryheydata.io</p><p style="margin:0;font-size:14px;line-height:18px;color:#666">+49 30 31196418</p><p style="margin:0;font-size:14px;line-height:18px;color:#666">Schützenstr. 5, 10117 Berlin</p><p style="margin:0;font-size:14px;line-height:18px;color:#0aa971;font-weight:700">heydata.eu</p></td></tr><tr><td colspan="2" style="padding:14px 0 0;font-size:12px;color:#888;line-height:16px">Managing Directors: Daniel Deutsch, Miloš Djurdjevic · Privacy policy</td></tr></tbody></table>`;

function normalizeSignatureHtml(value: string) {
  return value
    .replace(/\\(?=<\/?[a-z])/gi, "")
    .replace(/\\([_])/g, "$1")
    .replace(/(\b(?:src|href)=\s*")\[([^\]]+)\]\((https?:\/\/[^)]+)\)(")/gi, "$1$3$4")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function nonEditableImageMarkup(src: string, alt: string, width = 320) {
  return `<span data-simple-image-wrapper="true" contenteditable="false" draggable="false" style="position:relative;display:inline-block;width:${width}px;max-width:100%;margin:12px 12px 12px 0;vertical-align:middle;line-height:0;cursor:grab"><img draggable="false" src="${src}" alt="${alt}" style="display:block;width:100%;max-width:100%;height:auto" /><span data-simple-image-resize="nw" style="position:absolute;left:-8px;top:-8px;width:16px;height:16px;border-radius:4px;background:#fff;border:2px solid #4d55e9;box-sizing:border-box;cursor:nwse-resize"></span><span data-simple-image-resize="ne" style="position:absolute;right:-8px;top:-8px;width:16px;height:16px;border-radius:4px;background:#fff;border:2px solid #4d55e9;box-sizing:border-box;cursor:nesw-resize"></span><span data-simple-image-resize="sw" style="position:absolute;left:-8px;bottom:-8px;width:16px;height:16px;border-radius:4px;background:#fff;border:2px solid #4d55e9;box-sizing:border-box;cursor:nesw-resize"></span><span data-simple-image-resize="se" style="position:absolute;right:-8px;bottom:-8px;width:16px;height:16px;border-radius:4px;background:#fff;border:2px solid #4d55e9;box-sizing:border-box;cursor:nwse-resize"></span><button type="button" data-simple-image-delete="true" contenteditable="false" aria-label="Delete image" style="position:absolute;right:-14px;top:-30px;width:28px;height:28px;border:0;border-radius:999px;background:#ef4444;color:#fff;font:bold 18px/28px Arial,sans-serif;text-align:center;padding:0;cursor:pointer">×</button></span>`;
}

const TOKEN_OPTIONS = [
  ["First name", "{{first_name}}"],
  ["Last name", "{{last_name}}"],
  ["Email", "{{email}}"],
  ["City", "{{city}}"],
  ["Phone number", "{{phone}}"],
];
const FONT_OPTIONS = [
  "Inter",
  "Arial",
  "Helvetica",
  "Georgia",
  "Times New Roman",
  "Verdana",
  "Trebuchet MS",
  "Courier New",
];
const FONT_SIZE_OPTIONS = [10, 12, 14, 16, 18, 20, 24, 28, 32, 36];

export default function SimpleEmailEditor({
  item,
  kind,
  projectId,
  language,
  onClose,
  onSave,
  onNotice,
}: Props) {
  const [name, setName] = useState(
    item?.name ||
      (kind === "templates" ? "New email template" : "New email campaign"),
  );
  const [activeLanguage, setActiveLanguage] = useState(language);
  const [subject, setSubject] = useState(item?.subject || "");
  const [content, setContent] = useState(item?.content || "");
  const [panel, setPanel] = useState<"ai" | "settings">("ai");
  const [preview, setPreview] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [previewAnchor, setPreviewAnchor] = useState<null | HTMLElement>(null);
  const [saveAnchor, setSaveAnchor] = useState<null | HTMLElement>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiResult, setAiResult] = useState<{
    subject: string;
    content: string;
  } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testRecipient, setTestRecipient] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkText, setLinkText] = useState("");
  const [linkUrl, setLinkUrl] = useState("https://");
  const [insertAnchor, setInsertAnchor] = useState<null | HTMLElement>(null);
  const [tokenAnchor, setTokenAnchor] = useState<null | HTMLElement>(null);
  const [signatureOpen, setSignatureOpen] = useState(false);
  const [footerOpen, setFooterOpen] = useState(false);
  const [footerConfig, setFooterConfig] = useState<FooterConfig>(DEFAULT_FOOTER_CONFIG);
  const [footerSettingsOpen, setFooterSettingsOpen] = useState(true);
  const [insertedFooterId, setInsertedFooterId] = useState<string | null>(() => {
    const match = item?.content?.match(/data-footer-id="([^"]+)"/);
    return match?.[1] || null;
  });
  const [handwrittenOpen, setHandwrittenOpen] = useState(false);
  const [signatureHtml, setSignatureHtml] = useState(DEFAULT_SIGNATURE_HTML);
  const [history, setHistory] = useState<string[]>([item?.content || ""]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const signatureCanvasRef = useRef<HTMLCanvasElement>(null);
  const linkSelectionRef = useRef<Range | null>(null);
  const formatSelectionRef = useRef<Range | null>(null);
  const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(
    null,
  );
  const [imageSelection, setImageSelection] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const id = item?.id || `email-${Date.now()}`;

  useEffect(() => {
    setName(item?.name || (kind === "templates" ? "New email template" : "New email campaign"));
    setSubject(item?.subject || "");
    setContent(item?.content || "");
    setHistory([item?.content || ""]);
    setHistoryIndex(0);
    setInsertedFooterId(item?.content?.match(/data-footer-id="([^"]+)"/)?.[1] || null);
  }, [item?.id, item?.content, item?.name, item?.subject, kind]);

  useEffect(() => {
    const editor = contentRef.current;
    if (!editor || document.activeElement === editor) return;
    if (editor.innerHTML !== content) editor.innerHTML = content;
  }, [content]);

  useEffect(() => {
    if (!insertedFooterId || !contentRef.current) return;
    const footer = contentRef.current.querySelector(
      `[data-footer-id="${insertedFooterId}"]`,
    ) as HTMLElement | null;
    if (!footer) return;
    const deleteButton = footer.querySelector("[data-footer-delete]")?.outerHTML || "";
    footer.innerHTML = `${footerInnerMarkup(footerConfig)}${deleteButton}`;
    updateContent(contentRef.current.innerHTML);
    // The footer is intentionally locked, but its settings remain editable here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [footerConfig, insertedFooterId]);

  const updateContent = (value: string) => {
    setContent(value);
    setHistory((current) => [...current.slice(0, historyIndex + 1), value]);
    setHistoryIndex((current) => current + 1);
  };
  const rememberFormatSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !contentRef.current) return;
    const range = selection.getRangeAt(0);
    if (contentRef.current.contains(range.commonAncestorContainer)) {
      formatSelectionRef.current = range.cloneRange();
    }
  };
  const applyTextStyle = (styles: {
    fontFamily?: string;
    fontSize?: string;
  }) => {
    const editor = contentRef.current;
    const range = formatSelectionRef.current;
    if (!editor || !range || !editor.contains(range.commonAncestorContainer))
      return;
    const span = document.createElement("span");
    Object.assign(span.style, styles);
    if (range.collapsed) {
      const marker = document.createTextNode("\u200b");
      span.appendChild(marker);
      range.insertNode(span);
      const selection = window.getSelection();
      const nextRange = document.createRange();
      nextRange.setStart(marker, 1);
      nextRange.collapse(true);
      selection?.removeAllRanges();
      selection?.addRange(nextRange);
    } else {
      span.appendChild(range.extractContents());
      range.insertNode(span);
      const selection = window.getSelection();
      const nextRange = document.createRange();
      nextRange.selectNodeContents(span);
      selection?.removeAllRanges();
      selection?.addRange(nextRange);
    }
    editor.focus();
    updateContent(editor.innerHTML);
    formatSelectionRef.current = window.getSelection()?.rangeCount
      ? window.getSelection()!.getRangeAt(0).cloneRange()
      : null;
  };
  const undo = () => {
    if (historyIndex > 0) {
      const next = historyIndex - 1;
      setHistoryIndex(next);
      setContent(history[next]);
    }
  };
  const redo = () => {
    if (historyIndex < history.length - 1) {
      const next = historyIndex + 1;
      setHistoryIndex(next);
      setContent(history[next]);
    }
  };
  const command = (name: string, value?: string) => {
    document.execCommand(name, false, value);
    const editor = document.querySelector<HTMLElement>(".admin-simple-content");
    if (editor) updateContent(editor.innerHTML);
  };
  const openLinkDialog = () => {
    const selection = window.getSelection();
    const range =
      selection && selection.rangeCount > 0
        ? selection.getRangeAt(0).cloneRange()
        : null;
    linkSelectionRef.current = range;
    setLinkText(selection?.toString() || "");
    setLinkUrl("https://");
    setLinkOpen(true);
  };
  const applyLink = () => {
    const text = linkText.trim();
    const rawUrl = linkUrl.trim();
    if (!text || !rawUrl || rawUrl === "https://") return;
    const url = /^(https?:\/\/|mailto:)/i.test(rawUrl)
      ? rawUrl
      : `https://${rawUrl}`;
    const escapeHtml = (value: string) =>
      value.replace(
        /[&<>'"]/g,
        (character) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            "'": "&#39;",
            '"': "&quot;",
          })[character] || character,
      );
    const selection = window.getSelection();
    const range = linkSelectionRef.current;
    if (
      selection &&
      range &&
      contentRef.current?.contains(range.commonAncestorContainer)
    ) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
    const html = `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" style="color:#2563eb;text-decoration:underline">${escapeHtml(text)}</a>`;
    document.execCommand("insertHTML", false, html);
    updateContent(contentRef.current?.innerHTML || `${content}<p>${html}</p>`);
    linkSelectionRef.current = null;
    setLinkOpen(false);
  };
  const appendHtml = (html: string) => updateContent(`${content}${html}`);
  const insertHtmlAtSelection = (html: string) => {
    const editor = contentRef.current;
    const range = formatSelectionRef.current;
    if (!editor || !range || !editor.contains(range.commonAncestorContainer)) {
      appendHtml(html);
      return;
    }
    const blockedParent = (range.startContainer.nodeType === Node.ELEMENT_NODE
      ? (range.startContainer as Element)
      : range.startContainer.parentElement
    )?.closest("[data-email-footer], [data-simple-image-wrapper]");
    if (blockedParent) return;
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    const fragment = range.createContextualFragment(html);
    const lastNode = fragment.lastChild;
    range.deleteContents();
    range.insertNode(fragment);
    if (lastNode) {
      const nextRange = document.createRange();
      nextRange.setStartAfter(lastNode);
      nextRange.collapse(true);
      selection?.removeAllRanges();
      selection?.addRange(nextRange);
    }
    editor.focus();
    updateContent(editor.innerHTML);
  };
  const saveAs = async (destination: EmailKind) => {
    if (saving) return;
    setSaving(true);
    try {
      const isExisting = Boolean(item?.id && !item.id.startsWith("email-"));
      let savedId = id;
      if (destination === "templates") {
        const saved = isExisting && item?.kind === "templates"
          ? await emailApi.templates.update(projectId, item.id, { name, subject, html: content, editor: "simple" })
          : await emailApi.templates.create(projectId, { name, subject, html: content, editor: "simple" });
        savedId = saved.id;
      } else {
        const campaign = isExisting && item?.kind === "drafts"
          ? await emailApi.campaigns.update(projectId, item.id, { name, content: { subject, html: content, editor: "simple" } })
          : await emailApi.campaigns.create(projectId, { name, content: { subject, html: content, editor: "simple" } });
        savedId = campaign.id;
      }
      onSave(
        {
          id: savedId,
          name,
          subject,
          description: subject || "Saved email content.",
          editor: "simple",
          kind: destination,
          updated: "Updated just now",
          content,
        },
        destination === "templates" ? "Template saved" : "Draft saved",
      );
    } catch (error) {
      onNotice(error && typeof error === "object" && "message" in error
        ? String((error as { message?: unknown }).message)
        : "Could not save this email.");
    } finally {
      setSaving(false);
    }
  };
  const save = () => saveAs(kind);
  const sendTest = async () => {
    const to = testRecipient.trim();
    if (!to || saving) {
      onNotice("Enter a recipient email address first.");
      return;
    }
    setSaving(true);
    let temporaryTemplateId: string | null = null;
    try {
      const temporary = await emailApi.templates.create(projectId, {
        name: `${name} test`,
        subject,
        html: content,
        editor: "simple",
      });
      temporaryTemplateId = temporary.id;
      const result = await emailApi.templates.test(projectId, temporary.id, to);
      onNotice(result.failed ? result.error || "Test email failed." : `Test email sent to ${to}.`);
      setPreview(false);
    } catch (error) {
      onNotice(error && typeof error === "object" && "message" in error
        ? String((error as { message?: unknown }).message)
        : "Could not send the test email.");
    } finally {
      if (temporaryTemplateId) {
        await emailApi.templates.delete(projectId, temporaryTemplateId).catch(() => undefined);
      }
      setSaving(false);
    }
  };
  if (reviewOpen)
    return (
      <SimpleCampaignReview
        name={name}
        subject={subject}
        content={content}
        onBack={() => setReviewOpen(false)}
        onSave={() => { save(); onNotice("Campaign saved for later"); }}
        onNotice={onNotice}
      />
    );
  const handleFile = (
    event: ChangeEvent<HTMLInputElement>,
    type: "image" | "attachment",
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (type === "image") {
      const reader = new FileReader();
      reader.onload = () =>
        appendHtml(
          `<span data-simple-image-wrapper="true" contenteditable="false" draggable="false" style="position:relative;display:inline-block;width:320px;max-width:100%;margin:12px 0;vertical-align:middle;line-height:0;cursor:grab"><img draggable="false" src="${String(reader.result)}" alt="${file.name}" style="display:block;width:100%;max-width:100%;height:auto;border-radius:8px" /><span data-simple-image-resize="nw" style="position:absolute;left:-8px;top:-8px;width:16px;height:16px;border-radius:4px;background:#fff;border:2px solid #4d55e9;box-sizing:border-box;cursor:nwse-resize"></span><span data-simple-image-resize="ne" style="position:absolute;right:-8px;top:-8px;width:16px;height:16px;border-radius:4px;background:#fff;border:2px solid #4d55e9;box-sizing:border-box;cursor:nesw-resize"></span><span data-simple-image-resize="sw" style="position:absolute;left:-8px;bottom:-8px;width:16px;height:16px;border-radius:4px;background:#fff;border:2px solid #4d55e9;box-sizing:border-box;cursor:nesw-resize"></span><span data-simple-image-resize="se" style="position:absolute;right:-8px;bottom:-8px;width:16px;height:16px;border-radius:4px;background:#fff;border:2px solid #4d55e9;box-sizing:border-box;cursor:nwse-resize"></span><button type="button" data-simple-image-delete="true" contenteditable="false" aria-label="Delete image" style="position:absolute;right:-14px;top:-30px;width:28px;height:28px;border:0;border-radius:999px;background:#ef4444;color:#fff;font:bold 18px/28px Arial,sans-serif;text-align:center;padding:0;cursor:pointer;box-shadow:0 2px 8px rgba(15,23,42,.22)">×</button></span>`,
        );
      reader.readAsDataURL(file);
    } else
      appendHtml(
        `<p><span style="display:inline-block;padding:8px 12px;border:1px solid #d7dbea;border-radius:8px">📎 ${file.name}</span></p>`,
      );
    event.target.value = "";
  };
  const selectImage = (event: ReactMouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const footerDeleteButton = target.closest(
      "[data-footer-delete]",
    ) as HTMLElement | null;
    if (footerDeleteButton) {
      event.preventDefault();
      event.stopPropagation();
      const footer = footerDeleteButton.closest("[data-email-footer]");
      footer?.remove();
      updateContent(contentRef.current?.innerHTML || "");
      setInsertedFooterId(null);
      return;
    }
    const deleteButton = target.closest(
      "[data-simple-image-delete]",
    ) as HTMLElement | null;
    if (deleteButton) {
      event.preventDefault();
      event.stopPropagation();
      const wrapper = deleteButton.closest(
        "[data-simple-image-wrapper]",
      ) as HTMLElement | null;
      wrapper?.remove();
      updateContent(contentRef.current?.innerHTML || "");
      setSelectedImage(null);
      setImageSelection(null);
      return;
    }
    if (!(target instanceof HTMLImageElement) || !contentRef.current) {
      setSelectedImage(null);
      setImageSelection(null);
      return;
    }
    const wrapper = target.closest(
      "[data-simple-image-wrapper]",
    ) as HTMLElement | null;
    if (wrapper) wrapper.style.outline = "2px solid #4d55e9";
    const imageRect = (wrapper || target).getBoundingClientRect();
    const areaRect = (
      contentRef.current.parentElement || contentRef.current
    ).getBoundingClientRect();
    setSelectedImage(target);
    setImageSelection({
      left: imageRect.left - areaRect.left,
      top: imageRect.top - areaRect.top,
      width: imageRect.width,
      height: imageRect.height,
    });
  };
  const handleImageMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const resizeHandle = target.closest(
      "[data-simple-image-resize]",
    ) as HTMLElement | null;
    const wrapper = target.closest(
      "[data-simple-image-wrapper]",
    ) as HTMLElement | null;
    if (!contentRef.current || !wrapper) return;
    if (!resizeHandle) {
      if (!(target instanceof HTMLImageElement)) return;
      event.preventDefault();
      event.stopPropagation();
      const startX = event.clientX;
      const startY = event.clientY;
      const startLeft = parseFloat(wrapper.style.left || "0");
      const startTop = parseFloat(wrapper.style.top || "0");
      wrapper.style.cursor = "grabbing";
      const onMove = (moveEvent: MouseEvent) => {
        wrapper.style.position = "relative";
        wrapper.style.left = `${startLeft + moveEvent.clientX - startX}px`;
        wrapper.style.top = `${startTop + moveEvent.clientY - startY}px`;
      };
      const onUp = () => {
        wrapper.style.cursor = "grab";
        updateContent(contentRef.current?.innerHTML || "");
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const image = wrapper?.querySelector("img") as HTMLImageElement | null;
    if (!wrapper || !image) return;
    const direction = resizeHandle.dataset.simpleImageResize || "se";
    const startX = event.clientX;
    const startWidth = wrapper.getBoundingClientRect().width;
    const editorWidth = Math.max(160, contentRef.current.clientWidth - 32);
    const onMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      const nextWidth = Math.min(
        editorWidth,
        Math.max(80, startWidth + (direction.includes("w") ? -delta : delta)),
      );
      wrapper.style.width = `${nextWidth}px`;
      image.style.width = "100%";
      image.style.maxWidth = "100%";
      image.style.height = "auto";
    };
    const onUp = () => {
      updateContent(contentRef.current?.innerHTML || "");
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };
  const deleteSelectedImage = (event?: ReactMouseEvent | ReactPointerEvent) => {
    event?.preventDefault();
    event?.stopPropagation();
    if (!selectedImage) return;
    selectedImage.remove();
    updateContent(contentRef.current?.innerHTML || "");
    setSelectedImage(null);
    setImageSelection(null);
  };
  const beginResize = (
    event: ReactMouseEvent<HTMLButtonElement>,
    corner: string,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    const image = selectedImage;
    const editor = contentRef.current;
    if (!image || !editor) return;
    const direction = corner.includes("left") ? -1 : 1;
    const startX = event.clientX;
    const startWidth = image.getBoundingClientRect().width;
    const onMove = (moveEvent: MouseEvent) => {
      const nextWidth = Math.max(
        80,
        Math.min(700, startWidth + (moveEvent.clientX - startX) * direction),
      );
      image.style.width = `${nextWidth}px`;
      image.style.maxWidth = "100%";
      image.style.height = "auto";
      const imageRect = image.getBoundingClientRect();
      const areaRect = (editor.parentElement || editor).getBoundingClientRect();
      setImageSelection({
        left: imageRect.left - areaRect.left,
        top: imageRect.top - areaRect.top,
        width: imageRect.width,
        height: imageRect.height,
      });
    };
    const onUp = () => {
      updateContent(editor.innerHTML);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };
  const generateAiSuggestion = async () => {
    const prompt = aiPrompt.trim();
    if (!prompt || aiLoading) return;
    setAiLoading(true);
    try {
      const result = await emailApi.suggest(projectId, {
        prompt,
        subject: subject || null,
        content: content || null,
        language: activeLanguage,
      });
      setAiResult({ subject: result.subject, content: result.content });
    } catch (error) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message?: unknown }).message)
          : "Unable to generate a suggestion. Please try again.";
      onNotice(message);
    } finally {
      setAiLoading(false);
    }
  };
  const drawSignature = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (canvas.width / rect.width);
    const y = (event.clientY - rect.top) * (canvas.height / rect.height);
    if (event.type === "pointerdown") {
      context.beginPath();
      context.moveTo(x, y);
      canvas.setPointerCapture(event.pointerId);
    } else {
      context.lineTo(x, y);
      context.stroke();
    }
  };

  return (
    <Box className="admin-simple-editor">
      <Box className="admin-editor-topbar compact-email-header">
        <Stack direction="row" alignItems="center" gap={2}>
          <TextField
            value={name}
            onChange={(event) => setName(event.target.value)}
            size="small"
            placeholder="Campaign name"
          />
          <Select
            size="small"
            value={activeLanguage}
            sx={{
              color: "#fff",
              ".MuiOutlinedInput-notchedOutline": {
                borderColor: "rgba(255,255,255,.14)",
              },
            }}
          >
            <MenuItem value={activeLanguage}>{languageName(activeLanguage)}</MenuItem>
          </Select>
        </Stack>
        <Stack direction="row" alignItems="center" gap={1}>
          <IconButton
            onClick={undo}
            disabled={historyIndex === 0}
            aria-label="Undo"
          >
            <UndoRounded />
          </IconButton>
          <IconButton
            onClick={redo}
            disabled={historyIndex === history.length - 1}
            aria-label="Redo"
          >
            <RedoRounded />
          </IconButton>
          <Button color="inherit" endIcon={<KeyboardArrowDownRounded />} onClick={(event) => setPreviewAnchor(event.currentTarget)}>
            Preview and test
          </Button>
          <Menu anchorEl={previewAnchor} open={Boolean(previewAnchor)} onClose={() => setPreviewAnchor(null)}>
            <MenuItem onClick={() => { setPreview(true); setPreviewAnchor(null); }}>Preview mode</MenuItem>
            <MenuItem onClick={() => { setPreview(true); setPreviewAnchor(null); }}>Send a test email</MenuItem>
          </Menu>
          <Button variant="contained" color="success" endIcon={<KeyboardArrowDownRounded />} onClick={(event) => setSaveAnchor(event.currentTarget)}>
            Save
          </Button>
          <Menu anchorEl={saveAnchor} open={Boolean(saveAnchor)} onClose={() => setSaveAnchor(null)}>
            <MenuItem onClick={() => { saveAs("drafts"); setSaveAnchor(null); }}>Save as draft</MenuItem>
            <MenuItem onClick={() => { void saveAs("templates"); setSaveAnchor(null); }}>Save as template</MenuItem>
            <MenuItem onClick={() => { setReviewOpen(true); setSaveAnchor(null); }}>Prepare to send campaign</MenuItem>
          </Menu>
          <CloseEmailEditor onDiscard={onClose} onSaveDraft={() => { void saveAs("drafts"); }} />
        </Stack>
      </Box>
      <Box className="admin-simple-layout">
        <Box className="admin-editor-rail">
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
        <Box className="admin-translation-panel">
          {panel === "ai" ? (
            <EmailTranslationPanel
              mode="simple"
              onNotice={onNotice}
              projectId={projectId}
              subject={subject}
              html={content}
              sourceLanguage={language}
              onLanguageChange={setActiveLanguage}
              onApplyTranslation={(translatedLanguage, translation) => {
                setActiveLanguage(translatedLanguage);
                setSubject(translation.subject);
                updateContent(translation.html);
              }}
            />
          ) : (
            <>
              <Typography className="admin-side-title">Settings</Typography>
              <Typography className="admin-side-copy">
                Choose how new campaigns should start in the editor.
              </Typography>
              <Box className="admin-side-card">
                <EmailLanguageSettings projectId={projectId} currentLanguage={activeLanguage} dark onNotice={onNotice} />
              </Box>
              {insertedFooterId && <Box className="admin-side-card footer-settings-card">
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography fontWeight={800}>Footer content</Typography>
                    <Typography fontSize={12} color="rgba(255,255,255,.55)" sx={{ mt: 0.5 }}>
                      Edit footer details, app links, and social accounts.
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    color="error"
                    startIcon={<DeleteOutlineRounded />}
                    onClick={() => {
                      const footer = contentRef.current?.querySelector("[data-email-footer]");
                      footer?.remove();
                      updateContent(contentRef.current?.innerHTML || "");
                      setInsertedFooterId(null);
                    }}
                    disabled={!insertedFooterId}
                  >
                    Remove footer
                  </Button>
                </Stack>
                <IconButton
                  size="small"
                  onClick={() => setFooterSettingsOpen((open) => !open)}
                  sx={{ position: "absolute", right: 10, top: 10, color: "rgba(255,255,255,.7)" }}
                  aria-label="Toggle footer settings"
                >
                  {footerSettingsOpen ? <ExpandLessRounded /> : <ExpandMoreRounded />}
                </IconButton>
                {footerSettingsOpen && (
                  <Stack gap={1.25} sx={{ mt: 2 }}>
                    <TextField
                      label="Footer layout"
                      select
                      size="small"
                      value={footerConfig.type}
                      onChange={(event) => setFooterConfig((current) => ({ ...current, type: event.target.value as FooterType }))}
                    >
                      {FOOTER_OPTIONS.map((option) => <MenuItem key={option.type} value={option.type}>{option.title}</MenuItem>)}
                    </TextField>
                    <TextField label="Brand name" size="small" value={footerConfig.brand} onChange={(event) => setFooterConfig((current) => ({ ...current, brand: event.target.value }))} />
                    <TextField label="Postal address" size="small" value={footerConfig.address} onChange={(event) => setFooterConfig((current) => ({ ...current, address: event.target.value }))} />
                    <TextField label="Legal text" multiline minRows={2} size="small" value={footerConfig.legal} onChange={(event) => setFooterConfig((current) => ({ ...current, legal: event.target.value }))} />
                    {(footerConfig.type === "app" || footerConfig.type === "social-app") && <>
                      <TextField label="App heading" size="small" value={footerConfig.appHeading} onChange={(event) => setFooterConfig((current) => ({ ...current, appHeading: event.target.value }))} />
                      <TextField label="App Store link" size="small" value={footerConfig.appStoreUrl} onChange={(event) => setFooterConfig((current) => ({ ...current, appStoreUrl: event.target.value }))} />
                      <TextField label="Google Play link" size="small" value={footerConfig.playStoreUrl} onChange={(event) => setFooterConfig((current) => ({ ...current, playStoreUrl: event.target.value }))} />
                    </>}
                    <TextField label="Unsubscribe link" size="small" value={footerConfig.unsubscribeUrl} onChange={(event) => setFooterConfig((current) => ({ ...current, unsubscribeUrl: event.target.value }))} />
                    <TextField label="Footer badge text" size="small" value={footerConfig.badgeText} onChange={(event) => setFooterConfig((current) => ({ ...current, badgeText: event.target.value }))} />
                    {(footerConfig.type === "social" || footerConfig.type === "social-app") && <Box className="footer-social-settings">
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                        <Typography fontSize={12} fontWeight={800}>Social accounts</Typography>
                        <Button size="small" variant="contained" startIcon={<AddRounded />} onClick={() => setFooterConfig((current) => ({ ...current, socials: [...current.socials, { platform: "Facebook", url: "https://" }] }))}>Add</Button>
                      </Stack>
                      {footerConfig.socials.map((social, index) => <Box key={`${social.platform}-${index}`} className="footer-social-item">
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography fontSize={11} fontWeight={800}>{social.platform}</Typography>
                          <IconButton size="small" color="error" onClick={() => setFooterConfig((current) => ({ ...current, socials: current.socials.filter((_, socialIndex) => socialIndex !== index) }))}><DeleteOutlineRounded fontSize="small" /></IconButton>
                        </Stack>
                        <TextField label="Platform" select size="small" value={SOCIAL_OPTIONS.includes(social.platform) ? social.platform : "Facebook"} onChange={(event) => setFooterConfig((current) => ({ ...current, socials: current.socials.map((entry, socialIndex) => socialIndex === index ? { ...entry, platform: event.target.value } : entry) }))}>
                          {SOCIAL_OPTIONS.map((platform) => <MenuItem key={platform} value={platform}><Stack direction="row" alignItems="center" gap={1}><SocialPlatformIcon platform={platform} />{platform}</Stack></MenuItem>)}
                        </TextField>
                        <TextField label="Link" size="small" value={social.url} onChange={(event) => setFooterConfig((current) => ({ ...current, socials: current.socials.map((entry, socialIndex) => socialIndex === index ? { ...entry, url: event.target.value } : entry) }))} />
                      </Box>)}
                    </Box>}
                  </Stack>
                )}
              </Box>}
            </>
          )}
        </Box>
        <Box className="admin-simple-stage">
          <Box className="admin-preview-column">
            <Typography className="admin-live-label">
              LIVE EMAIL PREVIEW <span>Simple editor</span>
            </Typography>
            <Paper className="admin-simple-card">
              <Stack
                direction="row"
                alignItems="center"
                gap={1.5}
                className="admin-subject-row"
              >
                <EmailRounded className="admin-purple-icon" />
                <Typography fontWeight={900}>Subject</Typography>
                <TextField
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  placeholder="Add a subject"
                  size="small"
                  fullWidth
                />
              </Stack>
              <Box className="admin-content-area">
                <Stack direction="row" alignItems="center" gap={1}>
                  <TextFieldsRounded className="admin-purple-icon" />
                  <Typography fontWeight={900}>Email content</Typography>
                </Stack>
                <Divider sx={{ my: 1.5 }} />
                <Box
                  ref={contentRef}
                  contentEditable
                  dir="ltr"
                  suppressContentEditableWarning
                  onClick={selectImage}
                  onMouseDown={handleImageMouseDown}
                  onMouseUp={rememberFormatSelection}
                  onKeyUp={rememberFormatSelection}
                  onInput={(event) =>
                    updateContent(event.currentTarget.innerHTML)
                  }
                  className="admin-simple-content"
                  data-placeholder="Write your email content here..."
                />
              </Box>
              <Stack
                className="admin-format-toolbar"
                direction="row"
                alignItems="center"
                gap={0.3}
                flexWrap="wrap"
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
                <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
                <Tooltip title="Bold">
                  <IconButton onClick={() => command("bold")}>
                    <FormatBoldRounded />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Italic">
                  <IconButton onClick={() => command("italic")}>
                    <FormatItalicRounded />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Underline">
                  <IconButton onClick={() => command("underline")}>
                    <FormatUnderlinedRounded />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Strikethrough">
                  <IconButton onClick={() => command("strikeThrough")}>
                    <StrikethroughSRounded />
                  </IconButton>
                </Tooltip>
                <IconButton onClick={() => command("insertOrderedList")}>
                  <TextFieldsRounded />
                </IconButton>
                <IconButton onClick={() => command("insertUnorderedList")}>
                  <TextFieldsRounded />
                </IconButton>
                <IconButton onClick={() => command("justifyLeft")}>
                  <FormatAlignLeftRounded />
                </IconButton>
                <IconButton onClick={() => command("justifyCenter")}>
                  <FormatAlignCenterRounded />
                </IconButton>
                <IconButton onClick={() => command("justifyRight")}>
                  <FormatAlignRightRounded />
                </IconButton>
                <Button
                  className="admin-ai-button"
                  startIcon={<AutoAwesomeRounded />}
                  onClick={() => setAiOpen(true)}
                >
                  AI Suggestion
                </Button>
                <IconButton
                  onMouseDown={(event) => {
                    event.preventDefault();
                    rememberFormatSelection();
                  }}
                  onClick={(event) => setTokenAnchor(event.currentTarget)}
                  aria-label="Personalization tokens"
                >
                  <InsertEmoticonRounded />
                </IconButton>
                <IconButton onClick={openLinkDialog} aria-label="Insert link">
                  <LinkRounded />
                </IconButton>
                <IconButton
                  onClick={() => attachmentInputRef.current?.click()}
                  aria-label="Add attachment"
                >
                  <AttachFileRounded />
                </IconButton>
                <IconButton
                  onClick={() => imageInputRef.current?.click()}
                  aria-label="Add image"
                >
                  <ImageRounded />
                </IconButton>
              </Stack>
              <Stack
                direction="row"
                alignItems="center"
                gap={1}
                className="admin-insert-row"
              >
                <Select
                  size="small"
                  defaultValue="Inter"
                  onChange={(event) =>
                    applyTextStyle({ fontFamily: String(event.target.value) })
                  }
                >
                  {FONT_OPTIONS.map((font) => (
                    <MenuItem key={font} value={font}>
                      {font}
                    </MenuItem>
                  ))}
                </Select>
                <Select
                  size="small"
                  defaultValue={16}
                  onChange={(event) =>
                    applyTextStyle({ fontSize: `${event.target.value}px` })
                  }
                >
                  {FONT_SIZE_OPTIONS.map((size) => (
                    <MenuItem key={size} value={size}>
                      {size}
                    </MenuItem>
                  ))}
                </Select>
                <Button
                  onClick={(event) => setInsertAnchor(event.currentTarget)}
                  className="admin-insert-button"
                >
                  Insert ▾
                </Button>
                <IconButton
                  onClick={() => attachmentInputRef.current?.click()}
                  aria-label="Add attachment"
                >
                  <AttachFileRounded />
                </IconButton>
                <IconButton
                  onClick={() => imageInputRef.current?.click()}
                  aria-label="Add image"
                >
                  <ImageRounded />
                </IconButton>
              </Stack>
            </Paper>
          </Box>
        </Box>
      </Box>
      <input
        ref={imageInputRef}
        hidden
        type="file"
        accept="image/*"
        onChange={(event) => handleFile(event, "image")}
      />
      <input
        ref={attachmentInputRef}
        hidden
        type="file"
        onChange={(event) => handleFile(event, "attachment")}
      />
      <Menu
        anchorEl={tokenAnchor}
        open={Boolean(tokenAnchor)}
        onClose={() => setTokenAnchor(null)}
        className="admin-token-menu"
      >
        <MenuItem disabled>Insert personalization token</MenuItem>
        {TOKEN_OPTIONS.map(([label, token]) => (
          <MenuItem
            key={token}
            onClick={() => {
              insertHtmlAtSelection(`<span>${token}</span>`);
              setTokenAnchor(null);
            }}
          >
            {label}
            <span style={{ marginLeft: "auto", color: "#8997b3" }}>
              {token}
            </span>
          </MenuItem>
        ))}
      </Menu>
      <Menu
        anchorEl={insertAnchor}
        open={Boolean(insertAnchor)}
        onClose={() => setInsertAnchor(null)}
      >
        <MenuItem
          onClick={() => {
            setHandwrittenOpen(true);
            setInsertAnchor(null);
          }}
        >
          ✎ &nbsp; Handwritten signature
        </MenuItem>
        <MenuItem
          onClick={() => {
            setSignatureOpen(true);
            setInsertAnchor(null);
          }}
        >
          ✎ &nbsp; Email signature
        </MenuItem>
        <MenuItem
          onClick={() => {
            setFooterOpen(true);
            setInsertAnchor(null);
          }}
        >
          ▤ &nbsp; Footer
        </MenuItem>
        <MenuItem
          onClick={() => {
            setTokenAnchor(insertAnchor);
            setInsertAnchor(null);
          }}
        >
          ♙ &nbsp; Personalization token
        </MenuItem>
      </Menu>
      <Dialog
        open={linkOpen}
        onClose={() => setLinkOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Typography
            color="primary"
            fontSize={12}
            fontWeight={900}
            letterSpacing=".14em"
          >
            INSERT LINK
          </Typography>
          <Typography variant="h2" fontSize={24} sx={{ mt: 1 }}>
            Add link
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography fontSize={13} fontWeight={800} sx={{ mb: 0.75 }}>
            Text
          </Typography>
          <TextField
            autoFocus
            fullWidth
            value={linkText}
            onChange={(event) => setLinkText(event.target.value)}
            placeholder="Text to display"
          />
          <Typography fontSize={13} fontWeight={800} sx={{ mt: 2, mb: 0.75 }}>
            Link
          </Typography>
          <TextField
            fullWidth
            value={linkUrl}
            onChange={(event) => setLinkUrl(event.target.value)}
            placeholder="https://"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLinkOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={applyLink}
            disabled={
              !linkText.trim() ||
              !linkUrl.trim() ||
              linkUrl.trim() === "https://"
            }
          >
            Apply link
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" gap={1} alignItems="center">
            <AutoAwesomeRounded color="primary" />
            AI writing assistant
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Typography variant="h2" fontSize={24}>
            What should I write?
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Describe your email or ask me to improve the current subject and
            content.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={5}
            value={aiPrompt}
            onChange={(event) => setAiPrompt(event.target.value)}
            placeholder="Example: Create a friendly weekend email inviting users to discover new matches."
            sx={{ mt: 2 }}
          />
          <Typography color="text.secondary" fontSize={11} sx={{ mt: 1 }}>
            Try: “correct my grammar”, “make this more engaging”, or “shorten
            the email”.
          </Typography>
          {aiResult && (
            <Stack className="ai-results" gap={2} sx={{ mt: 2 }}>
              <Paper className="ai-result-card">
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography fontWeight={900}>Suggested subject</Typography>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => {
                      setSubject(aiResult.subject);
                      onNotice("Suggested subject applied");
                    }}
                  >
                    Use this
                  </Button>
                </Stack>
                <TextField
                  fullWidth
                  value={aiResult.subject}
                  InputProps={{ readOnly: true }}
                  sx={{ mt: 1 }}
                />
              </Paper>
              <Paper className="ai-result-card">
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography fontWeight={900}>
                    Suggested email content
                  </Typography>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => {
                      updateContent(
                        aiResult.content
                          .split("\n")
                          .map((line) => (line ? `<p>${line}</p>` : ""))
                          .join(""),
                      );
                      onNotice("Suggested content applied");
                    }}
                  >
                    Use this
                  </Button>
                </Stack>
                <TextField
                  fullWidth
                  multiline
                  minRows={5}
                  value={aiResult.content}
                  InputProps={{ readOnly: true }}
                  sx={{ mt: 1 }}
                />
              </Paper>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setAiOpen(false);
              setAiResult(null);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={generateAiSuggestion}
            disabled={!aiPrompt.trim() || aiLoading}
          >
            {aiLoading ? "Generating…" : "Generate suggestion ✨"}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={handwrittenOpen}
        onClose={() => setHandwrittenOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Draw your signature</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            Draw a handwritten signature to insert into the email.
          </Typography>
          <canvas
            ref={signatureCanvasRef}
            width={1000}
            height={260}
            className="signature-canvas"
            onPointerDown={drawSignature}
            onPointerMove={(event) => {
              if (event.buttons) drawSignature(event);
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              const canvas = signatureCanvasRef.current;
              canvas
                ?.getContext("2d")
                ?.clearRect(0, 0, canvas.width, canvas.height);
            }}
          >
            Clear
          </Button>
          <Button onClick={() => setHandwrittenOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              const data = signatureCanvasRef.current?.toDataURL("image/png");
              if (data)
                appendHtml(
                  `<span data-simple-image-wrapper="true" contenteditable="false" draggable="false" style="position:relative;display:inline-block;width:320px;max-width:100%;margin:12px 12px 12px 0;vertical-align:middle;line-height:0;cursor:grab"><img draggable="false" src="${data}" alt="Handwritten signature" style="display:block;width:100%;max-width:100%;height:auto" /><span data-simple-image-resize="nw" style="position:absolute;left:-8px;top:-8px;width:16px;height:16px;border-radius:4px;background:#fff;border:2px solid #4d55e9;box-sizing:border-box;cursor:nwse-resize"></span><span data-simple-image-resize="ne" style="position:absolute;right:-8px;top:-8px;width:16px;height:16px;border-radius:4px;background:#fff;border:2px solid #4d55e9;box-sizing:border-box;cursor:nesw-resize"></span><span data-simple-image-resize="sw" style="position:absolute;left:-8px;bottom:-8px;width:16px;height:16px;border-radius:4px;background:#fff;border:2px solid #4d55e9;box-sizing:border-box;cursor:nesw-resize"></span><span data-simple-image-resize="se" style="position:absolute;right:-8px;bottom:-8px;width:16px;height:16px;border-radius:4px;background:#fff;border:2px solid #4d55e9;box-sizing:border-box;cursor:nwse-resize"></span><button type="button" data-simple-image-delete="true" contenteditable="false" aria-label="Delete signature" style="position:absolute;right:-14px;top:-30px;width:28px;height:28px;border:0;border-radius:999px;background:#ef4444;color:#fff;font:bold 18px/28px Arial,sans-serif;text-align:center;padding:0;cursor:pointer">×</button></span>`,
                );
              setHandwrittenOpen(false);
            }}
          >
            Save signature
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={signatureOpen}
        onClose={() => setSignatureOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Email signature</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary" fontSize={13}>
            Edit the local HTML signature and preview it before inserting it
            into the email.
          </Typography>
          <TextField
            fullWidth
            multiline
            minRows={8}
            value={signatureHtml}
            onChange={(event) => setSignatureHtml(event.target.value)}
            sx={{ mt: 2 }}
          />
          <Typography fontWeight={800} sx={{ mt: 2 }}>
            Preview
          </Typography>
          <Paper
            className="signature-preview"
            dangerouslySetInnerHTML={{ __html: normalizeSignatureHtml(signatureHtml) }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSignatureOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              appendHtml(
                `<div data-email-signature="true" contenteditable="false" style="display:block;max-width:100%;margin:12px 0;user-select:none;">${normalizeSignatureHtml(signatureHtml)}</div>`,
              );
              setSignatureOpen(false);
            }}
          >
            Use this signature
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={footerOpen}
        onClose={() => setFooterOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Typography color="primary" fontSize={12} fontWeight={900} letterSpacing=".14em">
            EMAIL FOOTER
          </Typography>
          <Typography variant="h4" sx={{ mt: 0.5 }}>Choose a footer</Typography>
          <Typography color="text.secondary" fontSize={14} sx={{ mt: 0.5 }}>
            Preview each footer layout and choose the one you want to add to your email.
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box className="footer-choice-grid">
            {FOOTER_OPTIONS.map((option) => {
              const optionConfig = { ...DEFAULT_FOOTER_CONFIG, type: option.type };
              return (
              <Card
                key={option.type}
                className="footer-choice"
                onClick={() => {
                  const id = `footer-${Date.now()}`;
                  setFooterConfig(optionConfig);
                  setInsertedFooterId(id);
                  appendHtml(footerMarkup(optionConfig, id));
                  setFooterOpen(false);
                }}
              >
                <Typography fontWeight={900} fontSize={18}>{option.title}</Typography>
                <Typography color="text.secondary" fontSize={12} sx={{ mt: 1 }}>
                  {option.description}
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Box className="footer-preview-card" dangerouslySetInnerHTML={{ __html: footerInnerMarkup(optionConfig) }} />
              </Card>
              );
            })}
          </Box>
        </DialogContent>
      </Dialog>
      {preview && (
        <Dialog
          open={preview}
          onClose={() => setPreview(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Preview and test</DialogTitle>
          <DialogContent>
            <Typography color="text.secondary" fontSize={12}>
              Recipient-facing preview · {name}
            </Typography>
            <Paper
              className="recipient-preview"
              dangerouslySetInnerHTML={{
                __html: `<h3>${subject || "Add a subject"}</h3>${content || "<p>Your email content will appear here.</p>"}`,
              }}
            />
          </DialogContent>
          <DialogActions>
            <TextField
              size="small"
              placeholder="test@example.com"
              value={testRecipient}
              onChange={(event) => setTestRecipient(event.target.value)}
            />
            <Button
              variant="contained"
              startIcon={<SendRounded />}
              onClick={() => { void sendTest(); }}
              disabled={saving || !testRecipient.trim()}
            >
              {saving ? "Sending…" : "Send test"}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}

function SimpleCampaignReview({
  name,
  subject,
  content,
  onBack,
  onSave,
  onNotice,
}: {
  name: string;
  subject: string;
  content: string;
  onBack: () => void;
  onSave: () => void;
  onNotice: (message: string) => void;
}) {
  const [deliveryMode, setDeliveryMode] = useState<"immediately" | "specific">("immediately");
  return (
    <Box className="campaign-review-screen">
      <Box className="campaign-review-inner">
        <Stack className="campaign-review-topbar" direction="row" justifyContent="space-between" alignItems="center">
          <Button startIcon={<ArrowBackRounded />} onClick={onBack}>Back to editor</Button>
          <Button variant="contained" color="success" onClick={onSave}>Save for later</Button>
        </Stack>
        <Stack className="campaign-review-heading" direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={2}>
          <Box><Typography className="campaign-eyebrow">CAMPAIGN SETUP</Typography><Typography variant="h1">Review your campaign</Typography><Typography color="text.secondary">Check the details, preview your email, and send when you’re ready.</Typography></Box>
          <Chip className="campaign-ready" label="Draft ready for review" />
        </Stack>
        <Box className="campaign-review-grid">
          <Stack gap={2.5}>
            <Paper className="campaign-review-card"><Stack direction="row" justifyContent="space-between" alignItems="flex-start"><Box><Typography variant="h3">Campaign details</Typography><Typography color="text.secondary" fontSize={12}>Give your campaign a clear identity.</Typography></Box><Chip label="Simple editor" size="small" /></Stack><Typography className="review-label">Campaign name</Typography><TextField fullWidth size="small" value={name} InputProps={{ readOnly: true }} /><Typography className="review-label">Subject line</Typography><TextField fullWidth size="small" value={subject} placeholder="Add a subject" InputProps={{ readOnly: true }} /><Typography className="review-label">Preheader <span>(optional)</span></Typography><TextField fullWidth size="small" placeholder="A short preview of your email content" InputProps={{ readOnly: true }} /></Paper>
            <ReviewPanel icon={<EmailRounded />} title="Sender details" copy="These details come from Email Marketing settings."><Box className="review-info-grid"><span><small>FROM NAME</small><b>PixlPush</b></span><span><small>FROM EMAIL</small><b>hello@pixlpush.com</b></span></Box></ReviewPanel>
            <ReviewPanel icon={<InsertEmoticonRounded />} title="Recipients" copy="Who should receive this campaign?"><Select fullWidth size="small" value="All eligible users"><MenuItem value="All eligible users">All eligible users</MenuItem></Select><Typography color="text.secondary" fontSize={11} sx={{ mt: 1.5 }}>You can change your recipient selection before the campaign is sent.</Typography><Typography fontWeight={900} fontSize={12} sx={{ mt: 1 }}>87,493 eligible recipients</Typography></ReviewPanel>
            <Paper className="campaign-review-card"><Stack direction="row" gap={1.5}><Box className="review-icon review-icon-orange">◷</Box><Box><Typography variant="h3">Schedule delivery</Typography><Typography color="text.secondary" fontSize={12}>Leave it blank to start delivery now, or choose a future time.</Typography></Box></Stack><Typography className="review-label">When should this message start sending?</Typography><Box className={`review-option ${deliveryMode === "immediately" ? "selected" : ""}`} onClick={() => setDeliveryMode("immediately")}>◉ Immediately</Box><Box className={`review-option ${deliveryMode === "specific" ? "selected" : ""}`} onClick={() => setDeliveryMode("specific")}>○ Specific date</Box>{deliveryMode === "specific" ? <Box className="review-schedule-panel"><Typography className="review-label">Select date</Typography><TextField fullWidth size="small" type="date" /><Stack direction="row" gap={1} sx={{ mt: 1.5 }}><TextField size="small" label="Hour" defaultValue="12" /><TextField size="small" label="Minute" defaultValue="00" /><Select size="small" defaultValue="AM"><MenuItem value="AM">AM</MenuItem><MenuItem value="PM">PM</MenuItem></Select></Stack><Typography className="review-timezone">Scheduled using your workspace timezone (UTC+1).</Typography></Box> : <Typography className="review-note">Immediate campaigns start through the background delivery pipeline.</Typography>}</Paper>
          </Stack>
          <Paper className="campaign-review-card campaign-review-preview"><Stack direction="row" justifyContent="space-between" alignItems="center"><Box><Typography variant="h3">Email preview</Typography><Typography color="text.secondary" fontSize={12}>This is how your campaign will look.</Typography></Box><Button variant="outlined" onClick={onBack}>Edit content</Button></Stack><Paper className="review-email-frame" dangerouslySetInnerHTML={{ __html: `<h3>${subject || "Add a subject"}</h3>${content || "<p>Your email content will appear here.</p>"}` }} /></Paper>
        </Box>
        <Paper className="campaign-review-footer"><Box><Typography fontWeight={900}>Ready to send this campaign?</Typography><Typography color="text.secondary" fontSize={11}>The campaign is prepared locally and can be sent when you are ready.</Typography></Box><Button variant="contained" startIcon={<SendRounded />} onClick={() => onNotice("Campaign ready to send locally")}>Send campaign</Button></Paper>
      </Box>
    </Box>
  );
}

function ReviewPanel({ icon, title, copy, children }: { icon: React.ReactNode; title: string; copy: string; children: React.ReactNode }) {
  return <Paper className="campaign-review-card"><Stack direction="row" gap={1.5}><Box className="review-icon">{icon}</Box><Box><Typography variant="h3">{title}</Typography><Typography color="text.secondary" fontSize={12}>{copy}</Typography></Box></Stack><Box sx={{ mt: 2 }}>{children}</Box></Paper>;
}
