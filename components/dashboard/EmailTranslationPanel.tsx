"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { CheckRounded } from "@mui/icons-material";
import {
  Box,
  Button,
  Chip,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import aiIcon from "../../assets/ai.png";
import { emailApi } from "@/lib/projects/api";

export const EMAIL_TRANSLATION_LANGUAGES = [
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
] as const;

export default function EmailTranslationPanel({
  mode,
  onNotice,
  projectId,
  subject,
  html,
  sourceLanguage = "en",
  initialTranslations,
  onLanguageChange,
  onApplyTranslation,
  onTranslationsChange,
}: {
  mode: "simple" | "drag";
  onNotice: (message: string) => void;
  projectId?: string;
  subject?: string;
  html?: string;
  sourceLanguage?: string;
  initialTranslations?: Record<string, { subject: string; html: string }>;
  onLanguageChange?: (language: string) => void;
  onApplyTranslation?: (language: string, translation: { subject: string; html: string }) => void;
  onTranslationsChange?: (translations: Record<string, { subject: string; html: string }>) => void;
}) {
  const [currentLanguage, setCurrentLanguage] = useState(sourceLanguage);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [translatedLanguages, setTranslatedLanguages] = useState<string[]>(() => Object.keys(initialTranslations || {}).filter((code) => code !== sourceLanguage));
  const [translations, setTranslations] = useState<Record<string, { subject: string; html: string }>>(initialTranslations || {});
  const [sourceTranslation, setSourceTranslation] = useState(initialTranslations?.[sourceLanguage] || { subject: subject || "", html: html || "" });
  const [loading, setLoading] = useState(false);
  const languageCodes: Record<string, string> = {
    Arabic: "ar", French: "fr", German: "de", Spanish: "es", Indonesian: "id",
    Russian: "ru", Turkish: "tr", Portuguese: "pt", Korean: "ko", Japanese: "ja",
    Persian: "fa", Thai: "th", Vietnamese: "vi", Italian: "it",
  };
  const languageNames: Record<string, string> = {
    en: "English", ...Object.fromEntries(Object.entries(languageCodes).map(([name, code]) => [code, name])),
  };
  useEffect(() => {
    if (!initialTranslations || !Object.keys(initialTranslations).length) return;
    setTranslations(initialTranslations);
    setTranslatedLanguages(Object.keys(initialTranslations).filter((code) => code !== sourceLanguage));
    setSourceTranslation(initialTranslations[sourceLanguage] || { subject: "", html: "" });
  }, [initialTranslations, sourceLanguage]);
  const selected = useMemo(
    () => Array.from(new Set([sourceLanguage, ...selectedLanguages, ...translatedLanguages])),
    [selectedLanguages, translatedLanguages, sourceLanguage],
  );
  const toggleLanguage = (name: string) => {
    const code = languageCodes[name];
    setSelectedLanguages((current) => current.includes(code)
      ? current.filter((item) => item !== code)
      : [...current, code]);
  };
  const chooseLanguage = (code: string) => {
    setCurrentLanguage(code);
    onLanguageChange?.(code);
    const translation = translations[code];
    if (code === sourceLanguage && (sourceTranslation.subject || sourceTranslation.html)) onApplyTranslation?.(code, sourceTranslation);
    else if (translation) onApplyTranslation?.(code, translation);
  };
  const translate = async () => {
    if (!selectedLanguages.length) {
      onNotice("Select at least one language to translate.");
      return;
    }
    if (!projectId || subject === undefined || html === undefined) {
      setTranslatedLanguages(selectedLanguages);
      setCurrentLanguage(selectedLanguages[0]);
      onNotice(`Translated into ${selectedLanguages.length} selected language${selectedLanguages.length === 1 ? "" : "s"}.`);
      return;
    }
    if (!subject.trim() || !html.trim()) {
      onNotice("Add a subject and email content before translating.");
      return;
    }
    setLoading(true);
    try {
      setSourceTranslation({ subject, html });
      const result = await emailApi.translate(projectId, {
        subject,
        html,
        sourceLanguage,
        languages: selectedLanguages,
      });
      const nextTranslations = Object.fromEntries(
        Object.entries(result.translations).map(([code, value]) => [code, { subject: value.subject, html: value.html }]),
      );
      const allTranslations = {
        [sourceLanguage]: { subject, html },
        ...nextTranslations,
      };
      setTranslations((current) => ({ ...current, ...nextTranslations }));
      onTranslationsChange?.(allTranslations);
      const completed = Object.keys(nextTranslations);
      setTranslatedLanguages((current) => Array.from(new Set([...current, ...completed])));
      if (completed[0]) {
        setCurrentLanguage(completed[0]);
        onApplyTranslation?.(completed[0], nextTranslations[completed[0]]);
      }
      onNotice(`Translated into ${completed.length} selected language${completed.length === 1 ? "" : "s"}.`);
    } catch (error) {
      onNotice(error && typeof error === "object" && "message" in error
        ? String((error as { message?: unknown }).message)
        : "Translation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <Box className="email-translation-panel">
      <Stack direction="row" alignItems="center" gap={1.2}>
        <Image src={aiIcon} alt="" width={34} height={34} className="ai-translation-icon" />
        <Typography component="h3" className="admin-side-title">AI translation</Typography>
      </Stack>
      <Typography className="admin-side-copy">
        Translate this {mode === "drag" ? "visual" : "simple"} email into selected languages, then switch between each version and edit it in the editor.
      </Typography>
      <Box className="admin-side-card">
        <Typography className="translation-field-label">Current editor language</Typography>
        <Select fullWidth size="small" value={currentLanguage} onChange={(event) => chooseLanguage(String(event.target.value))} sx={{ mt: 1 }}>
          {selected.map((code) => <MenuItem key={code} value={code}>{languageNames[code] || code}</MenuItem>)}
        </Select>
        <Stack direction="row" gap={0.7} flexWrap="wrap" sx={{ mt: 1 }}>
          {selected.map((code) => <Chip key={code} label={languageNames[code] || code} size="small" onClick={() => chooseLanguage(code)} sx={{ cursor: "pointer", color: "#fff", backgroundColor: code === currentLanguage ? "#249b57" : "#36373d", border: "1px solid rgba(255,255,255,.16)", "& .MuiChip-label": { color: "#fff" }, "& .MuiChip-icon": { color: "#fff" } }} icon={code !== sourceLanguage && translatedLanguages.includes(code) ? <CheckRounded /> : undefined} />)}
        </Stack>
      </Box>
      <Typography className="admin-side-section">Translate into</Typography>
      <Box className="translation-language-list">
        {EMAIL_TRANSLATION_LANGUAGES.map((language) => (
          <label key={language} className="admin-language-row">
            <span>{language}</span>
            <input type="checkbox" checked={selectedLanguages.includes(languageCodes[language])} onChange={() => toggleLanguage(language)} />
          </label>
        ))}
      </Box>
      <Button fullWidth variant="contained" color="success" sx={{ mt: 2 }} onClick={translate} disabled={loading}>
        {loading ? "Translating…" : "Translate selected languages"}
      </Button>
      <Box className="admin-side-card">
        <Typography className="translation-field-label">Editable translations</Typography>
        <Typography className="admin-side-copy">
          After translating, choose any language above and edit the visible subject, email content, footer, and links. Your edits stay saved for that language.
        </Typography>
      </Box>
    </Box>
  );
}
