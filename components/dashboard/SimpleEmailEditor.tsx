"use client";

import CloseEmailEditor from "./CloseEmailEditor";

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
  CloseRounded,
  EmailRounded,
  FormatBoldRounded,
  FormatItalicRounded,
  FormatUnderlinedRounded,
  ImageRounded,
  InsertEmoticonRounded,
  KeyboardArrowDownRounded,
  LinkRounded,
  RedoRounded,
  SettingsRounded,
  StrikethroughSRounded,
  TextFieldsRounded,
  UndoRounded,
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
  onClose: () => void;
  onSave: (item: EditorItem, message: string) => void;
  onNotice: (message: string) => void;
};

const DEFAULT_SIGNATURE_HTML = `Viele Grüße,<br>&nbsp;<br>&nbsp;<br><table style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.35;color:#333;width:520px;max-width:100%;border-collapse:collapse;border-spacing:0;white-space:normal"><tbody><tr><td style="width:205px;padding:0 14px 0 0;text-align:center;vertical-align:top"><div style="width:120px;height:120px;border-radius:50%;margin:0 auto 10px;background:linear-gradient(135deg,#2d3261,#0aa971)"></div><div style="height:16px;width:160px;margin:10px auto;background:#0aa971;border-radius:3px"></div></td><td style="width:315px;border-left:1px solid #0AA971;padding:0 0 0 14px;text-align:left;vertical-align:top"><p style="margin:0;font-weight:bold;color:#2d3261;font-size:16px;line-height:20px">Emilija Schneidermann</p><p style="margin:0;font-size:14px;line-height:18px;color:#666">Sales Development Representative</p><p style="margin:0;font-size:14px;line-height:18px;color:#666">heyData GmbH</p><p style="margin:8px 0 4px;font-size:14px;line-height:18px;color:#0aa971;font-weight:700">Schedule a meeting</p><p style="margin:0;font-size:14px;line-height:18px;color:#666">Emilija@tryheydata.io</p><p style="margin:0;font-size:14px;line-height:18px;color:#666">+49 30 31196418</p><p style="margin:0;font-size:14px;line-height:18px;color:#666">Schützenstr. 5, 10117 Berlin</p><p style="margin:0;font-size:14px;line-height:18px;color:#0aa971;font-weight:700">heydata.eu</p></td></tr><tr><td colspan="2" style="padding:14px 0 0;font-size:12px;color:#888;line-height:16px">Managing Directors: Daniel Deutsch, Miloš Djurdjevic · Privacy policy</td></tr></tbody></table>`;

const TOKEN_OPTIONS = [
  ["First name", "{{first_name}}"],
  ["Last name", "{{last_name}}"],
  ["Email", "{{email}}"],
  ["City", "{{city}}"],
  ["Phone number", "{{phone}}"],
];
const TRANSLATION_LANGUAGES = [
  "Arabic",
  "French",
  "German",
  "Spanish",
  "Indonesian",
  "Russian",
  "Turkish",
  "Portuguese",
  "Korean",
  "Japanese",
  "Persian",
  "Thai",
  "Vietnamese",
  "Italian",
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
  onClose,
  onSave,
  onNotice,
}: Props) {
  const [name, setName] = useState(
    item?.name ||
      (kind === "templates" ? "New email template" : "New email campaign"),
  );
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
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkText, setLinkText] = useState("");
  const [linkUrl, setLinkUrl] = useState("https://");
  const [insertAnchor, setInsertAnchor] = useState<null | HTMLElement>(null);
  const [tokenAnchor, setTokenAnchor] = useState<null | HTMLElement>(null);
  const [signatureOpen, setSignatureOpen] = useState(false);
  const [footerOpen, setFooterOpen] = useState(false);
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
    const editor = contentRef.current;
    if (!editor || document.activeElement === editor) return;
    if (editor.innerHTML !== content) editor.innerHTML = content;
  }, [content]);

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
  const saveAs = (destination: EmailKind) =>
    onSave(
      {
        id,
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
  const save = () => saveAs(kind);
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
    if (!resizeHandle || !contentRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    const wrapper = resizeHandle.closest(
      "[data-simple-image-wrapper]",
    ) as HTMLElement | null;
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
  const generateAiSuggestion = () => {
    const prompt = aiPrompt.trim();
    setAiResult({
      subject: prompt.toLowerCase().includes("subject")
        ? "A quick follow-up for you"
        : "Quick follow-up",
      content: prompt
        ? `Hi,\n\nI wanted to follow up quickly — ${prompt}.\n\nThanks,\nThe PixlPush team`
        : "Hi,\n\nHere is a clearer, more engaging message for your audience.\n\nThanks,\nThe PixlPush team",
    });
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
            value="English"
            sx={{
              color: "#fff",
              ".MuiOutlinedInput-notchedOutline": {
                borderColor: "rgba(255,255,255,.14)",
              },
            }}
          >
            <MenuItem value="English">English</MenuItem>
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
            <MenuItem onClick={() => { onNotice("Template saved locally"); setSaveAnchor(null); }}>Save as template</MenuItem>
            <MenuItem onClick={() => { setReviewOpen(true); setSaveAnchor(null); }}>Prepare to send campaign</MenuItem>
          </Menu>
          <CloseEmailEditor onDiscard={onClose} onSaveDraft={() => saveAs("drafts")} />
        </Stack>
      </Box>
      <Box className="admin-simple-layout">
        <Box className="admin-editor-rail">
          <IconButton
            className={panel === "ai" ? "active" : ""}
            onClick={() => setPanel("ai")}
            aria-label="AI translation"
          >
            <AutoAwesomeRounded />
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
            <>
              <Typography className="admin-side-title">
                AI translation
              </Typography>
              <Typography className="admin-side-copy">
                Translate this simple email into selected languages, then switch
                between each version and edit it in the editor.
              </Typography>
              <Box className="admin-side-card">
                <Typography
                  fontSize={11}
                  fontWeight={800}
                  color="rgba(255,255,255,.55)"
                >
                  Current editor language
                </Typography>
                <Select
                  fullWidth
                  size="small"
                  value="English"
                  sx={{ mt: 1, background: "#fff" }}
                >
                  <MenuItem value="English">English</MenuItem>
                </Select>
                <Chip
                  label="English"
                  size="small"
                  color="success"
                  sx={{ mt: 1 }}
                />
              </Box>
              <Typography className="admin-side-section">
                Translate into
              </Typography>
              {TRANSLATION_LANGUAGES.map((language) => (
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  key={language}
                  className="admin-language-row"
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
              <Box className="admin-side-card admin-editable-translations-card">
                <Typography fontWeight={900}>Editable translations</Typography>
                <Typography
                  fontSize={12}
                  color="rgba(255,255,255,.62)"
                  sx={{ mt: 1, lineHeight: 1.55 }}
                >
                  After translating, choose any language above and edit the
                  visible subject, email content, footer, and links. Your edits
                  stay saved for that language.
                </Typography>
              </Box>
            </>
          ) : (
            <>
              <Typography className="admin-side-title">Settings</Typography>
              <Typography className="admin-side-copy">
                Choose how new campaigns should start in the editor.
              </Typography>
              <Box className="admin-side-card">
                <Typography fontWeight={800}>
                  Default creation language
                </Typography>
                <Typography
                  fontSize={12}
                  color="rgba(255,255,255,.55)"
                  sx={{ mt: 1 }}
                >
                  New campaigns open directly in English.
                </Typography>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  sx={{ mt: 2 }}
                >
                  <Typography fontSize={12}>Saved language</Typography>
                  <Typography fontWeight={800}>English</Typography>
                </Stack>
              </Box>
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
              appendHtml(`<span>${token}</span>`);
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
          <Button variant="contained" onClick={generateAiSuggestion}>
            Generate suggestion ✨
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
                  `<p><img src="${data}" alt="Handwritten signature" style="max-width:320px" /></p>`,
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
            dangerouslySetInnerHTML={{ __html: signatureHtml }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSignatureOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              appendHtml(`<p>${signatureHtml}</p>`);
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
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Choose a footer</DialogTitle>
        <DialogContent>
          <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
            {[
              "Basic footer",
              "Social footer",
              "App download",
              "Social + app download",
            ].map((footer) => (
              <Card
                key={footer}
                className="footer-choice"
                onClick={() => {
                  appendHtml(
                    `<hr/><p><strong>PixlPush</strong><br/>You received this email because you signed up on our website.<br/><a href="#">Unsubscribe</a></p>`,
                  );
                  setFooterOpen(false);
                }}
              >
                <Typography fontWeight={900}>{footer}</Typography>
                <Typography color="text.secondary" fontSize={12} sx={{ mt: 1 }}>
                  Company details and unsubscribe
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Typography color="text.secondary" fontSize={12}>
                  PixlPush
                  <br />
                  Your footer content will appear here.
                </Typography>
              </Card>
            ))}
          </Stack>
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
            <TextField size="small" placeholder="test@example.com" />
            <Button
              variant="contained"
              startIcon={<SendRounded />}
              onClick={() => {
                onNotice("Test email prepared locally");
                setPreview(false);
              }}
            >
              Send test
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
