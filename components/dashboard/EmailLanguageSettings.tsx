"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Skeleton, Stack, Switch, Typography } from "@mui/material";
import { emailApi } from "@/lib/projects/api";

export const EMAIL_LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  ar: "Arabic",
  fr: "French",
  de: "German",
  es: "Spanish",
  id: "Indonesian",
  ru: "Russian",
  tr: "Turkish",
  pt: "Portuguese",
  ko: "Korean",
  ja: "Japanese",
  fa: "Persian",
  th: "Thai",
  vi: "Vietnamese",
  it: "Italian",
};

export function languageName(code: string | null | undefined) {
  return code ? EMAIL_LANGUAGE_NAMES[code] || code : "Not set";
}

export default function EmailLanguageSettings({
  projectId,
  currentLanguage,
  dark = false,
  onNotice,
}: {
  projectId: string;
  currentLanguage: string;
  dark?: boolean;
  onNotice: (message: string) => void;
}) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const languagesQuery = useQuery({
    queryKey: ["email", "languages", projectId],
    queryFn: () => emailApi.languages.get(projectId),
    enabled: Boolean(projectId),
  });
  const settings = languagesQuery.data;
  const textColor = dark ? "#fff" : "text.primary";
  const secondaryColor = dark ? "rgba(255,255,255,.62)" : "text.secondary";

  const toggleDefault = async () => {
    if (!settings || saving) return;
    setSaving(true);
    try {
      const enabled = !settings.defaultLanguageEnabled;
      const result = await emailApi.languages.setDefault(
        projectId,
        enabled ? { enabled: true, language: currentLanguage } : { enabled: false },
      );
      queryClient.setQueryData(["email", "languages", projectId], (current: typeof settings) => ({
        ...current,
        defaultLanguageEnabled: result.enabled,
        defaultLanguage: result.defaultLanguage,
      }));
      onNotice(enabled ? `Default language set to ${languageName(currentLanguage)}` : "Default language disabled");
    } catch (error) {
      onNotice((error as { message?: string })?.message || "Could not update the default language.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack className="email-language-settings" gap={1.2}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <div>
          <Typography fontWeight={600} color={textColor}>Default creation language</Typography>
          <Typography fontSize={12} color={secondaryColor} sx={{ mt: 0.5 }}>
            Skip the language chooser for new emails when this is on.
          </Typography>
        </div>
        {languagesQuery.isLoading ? <Skeleton variant="rounded" width={48} height={28} /> : (
          <Switch checked={Boolean(settings?.defaultLanguageEnabled)} onChange={toggleDefault} disabled={saving} color="success" />
        )}
      </Stack>
      <Stack direction="row" justifyContent="space-between" className="email-language-saved-row">
        <Typography fontSize={12} color={secondaryColor}>Saved language</Typography>
        {languagesQuery.isLoading ? <Skeleton width={70} /> : <Typography fontWeight={600} color={textColor}>{languageName(settings?.defaultLanguage)}</Typography>}
      </Stack>
      <Typography fontSize={11} color={secondaryColor}>
        {settings?.defaultLanguageEnabled
          ? `New editors will open in ${languageName(settings.defaultLanguage)}.`
          : "The language chooser will appear for each new email."}
      </Typography>
    </Stack>
  );
}
