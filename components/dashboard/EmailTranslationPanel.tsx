"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
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
}: {
  mode: "simple" | "drag";
  onNotice: (message: string) => void;
}) {
  const [currentLanguage, setCurrentLanguage] = useState("English");
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [translatedLanguages, setTranslatedLanguages] = useState<string[]>([]);
  const dark = mode === "drag";
  const selected = useMemo(
    () => Array.from(new Set(["English", ...selectedLanguages, ...translatedLanguages])),
    [selectedLanguages, translatedLanguages],
  );
  const toggleLanguage = (language: string) => {
    setSelectedLanguages((current) => current.includes(language)
      ? current.filter((item) => item !== language)
      : [...current, language]);
  };
  const translate = () => {
    if (!selectedLanguages.length) {
      onNotice("Select at least one language to translate.");
      return;
    }
    setTranslatedLanguages(selectedLanguages);
    setCurrentLanguage(selectedLanguages[0]);
    onNotice(`Translated into ${selectedLanguages.length} selected language${selectedLanguages.length === 1 ? "" : "s"}.`);
  };
  return (
    <Box className={dark ? "email-translation-panel email-translation-panel-dark" : "email-translation-panel"}>
      <Stack direction="row" alignItems="center" gap={1.2}>
        <Image src={aiIcon} alt="AI translation" width={34} height={34} className="ai-translation-icon" />
        <Typography variant="h3">AI translation</Typography>
      </Stack>
      <Typography className={dark ? "admin-side-copy" : undefined} color={dark ? undefined : "text.secondary"} fontSize={12} sx={{ mt: 1 }}>
        Translate this {mode === "drag" ? "visual" : "simple"} email into selected languages, then switch between each version and edit it in the editor.
      </Typography>
      <Box className={dark ? "admin-side-card" : undefined} sx={dark ? undefined : { mt: 2 }}>
        <Typography fontSize={11} fontWeight={800} color={dark ? "rgba(255,255,255,.55)" : "text.secondary"}>
          Current editor language
        </Typography>
        <Select fullWidth size="small" value={currentLanguage} onChange={(event) => setCurrentLanguage(String(event.target.value))} sx={{ mt: 1, background: dark ? "#fff" : undefined }}>
          {selected.map((language) => <MenuItem key={language} value={language}>{language}</MenuItem>)}
        </Select>
        <Stack direction="row" gap={0.7} flexWrap="wrap" sx={{ mt: 1 }}>
          {selected.map((language) => <Chip key={language} label={language} size="small" color={language === currentLanguage ? "success" : "default"} icon={language !== "English" && translatedLanguages.includes(language) ? <CheckRounded /> : undefined} />)}
        </Stack>
      </Box>
      <Typography className={dark ? "admin-side-section" : undefined} fontWeight={900} sx={dark ? undefined : { mt: 3 }}>
        Translate into
      </Typography>
      {EMAIL_TRANSLATION_LANGUAGES.map((language) => (
        <Stack direction="row" justifyContent="space-between" key={language} className={dark ? "admin-language-row" : "language-row"}>
          <Typography fontSize={12}>{language}</Typography>
          <input type="checkbox" aria-label={language} checked={selectedLanguages.includes(language)} onChange={() => toggleLanguage(language)} />
        </Stack>
      ))}
      <Button fullWidth variant="contained" color="success" sx={{ mt: 2 }} onClick={translate}>
        Translate selected languages
      </Button>
      <Box className={dark ? "admin-side-card admin-editable-translations-card" : undefined} sx={dark ? undefined : { mt: 2 }}>
        <Typography fontWeight={900}>Editable translations</Typography>
        <Typography fontSize={12} color={dark ? "rgba(255,255,255,.62)" : "text.secondary"} sx={{ mt: 1, lineHeight: 1.55 }}>
          After translating, choose any language above and edit the visible subject, email content, footer, and links. Your edits stay saved for that language.
        </Typography>
      </Box>
    </Box>
  );
}
