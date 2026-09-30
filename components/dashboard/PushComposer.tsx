"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowBackRounded,
  BatteryFullRounded,
  CameraAltRounded,
  CalendarTodayRounded,
  CheckRounded,
  ChevronRightRounded,
  CloseRounded,
  DeleteOutlineRounded,
  EditRounded,
  FlashlightOnRounded,
  LanguageRounded,
  LinkRounded,
  NotificationsActiveRounded,
  PeopleAltRounded,
  PhoneIphoneRounded,
  SignalCellularAltRounded,
  TrendingUpRounded,
  WifiRounded,
  SaveRounded,
  SendRounded,
  TranslateRounded,
} from "@mui/icons-material";
import {
  Box,
  Button,
  Card,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import {
  audienceGroupsApi,
  lifecycleSegmentsApi,
  pushApi,
  type PushAudience,
  type PushTranslation,
} from "@/lib/projects/api";
import { useActiveProject } from "@/hooks/projects/use-active-project";
import { Toast } from "@/components/auth/AuthFeedback";
import DeleteConfirmDialog from "@/components/dashboard/DeleteConfirmDialog";

type Mode = "campaign" | "template";
type SaveTarget = "send" | "drafts" | "templates";

const languages = [
  "English",
  "Arabic",
  "French",
  "Korean",
  "Japanese",
  "Italian",
  "Indonesian",
  "German",
  "Persian",
  "Portuguese",
  "Russian",
  "Spanish",
  "Thai",
  "Turkish",
  "Vietnamese",
];
const languageCodes: Record<string, string> = {
  English: "en",
  Arabic: "ar",
  French: "fr",
  Korean: "ko",
  Japanese: "ja",
  Italian: "it",
  Indonesian: "id",
  German: "de",
  Persian: "fa",
  Portuguese: "pt",
  Russian: "ru",
  Spanish: "es",
  Thai: "th",
  Turkish: "tr",
  Vietnamese: "vi",
};
const countries = [
  "All Countries",
  "United States",
  "United Kingdom",
  "Germany",
  "France",
  "Italy",
];
export default function PushComposer({
  mode,
  onBack,
  onSaved,
}: {
  mode: Mode;
  onBack: () => void;
  onSaved: (target: SaveTarget) => void;
}) {
  const { active } = useActiveProject();
  const queryClient = useQueryClient();
  const [currentMode, setCurrentMode] = useState<Mode>(mode);
  const isTemplate = currentMode === "template";
  const [name, setName] = useState("");
  const [country, setCountry] = useState("All Countries");
  const [group, setGroup] = useState("Select group");
  const [selectedLanguages, setSelectedLanguages] = useState(["English"]);
  const [activeLanguage, setActiveLanguage] = useState("English");
  const [translations, setTranslations] = useState<
    Record<string, PushTranslation>
  >({});
  const [title, setTitle] = useState("Welcome to PixlPush 🎉");
  const [message, setMessage] = useState(
    "Start your first match now — exciting profiles are waiting for you! ❤️",
  );
  const [deepLink, setDeepLink] = useState("");
  const [deepLinkDialogOpen, setDeepLinkDialogOpen] = useState(false);
  const [newDeepLink, setNewDeepLink] = useState("");
  const [ios, setIos] = useState(true);
  const [android, setAndroid] = useState(false);
  const [delivery, setDelivery] = useState("immediately");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [timezone, setTimezone] = useState("user");
  const [testOpen, setTestOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [translationNotice, setTranslationNotice] = useState("");
  const [toast, setToast] = useState<{ message: string; severity: "success" | "error" } | null>(null);
  const [deepLinkDeleteTarget, setDeepLinkDeleteTarget] = useState<{ id: string; url: string } | null>(null);
  const [testUserId, setTestUserId] = useState("");
  const [error, setError] = useState("");
  const groupsQuery = useQuery({
    queryKey: ["projects", "audience-groups", active?.id],
    queryFn: () => audienceGroupsApi.list(active!.id),
    enabled: Boolean(active?.id),
  });
  const segmentsQuery = useQuery({
    queryKey: ["projects", "lifecycle-segments", active?.id],
    queryFn: () => lifecycleSegmentsApi.list(active!.id),
    enabled: Boolean(active?.id),
  });
  const deepLinksQuery = useQuery({
    queryKey: ["projects", "push-deeplinks", active?.id],
    queryFn: () => pushApi.deepLinks.list(active!.id),
    enabled: Boolean(active?.id),
  });
  const deepLinkCreateMutation = useMutation({
    mutationFn: async (url: string) => {
      if (!active?.id)
        throw new Error("Select a project before creating a deeplink.");
      return pushApi.deepLinks.create(active.id, url);
    },
    onSuccess: (createdLink) => {
      setDeepLink(createdLink.url);
      setNewDeepLink("");
      setDeepLinkDialogOpen(false);
      setToast({ message: "Deeplink created successfully.", severity: "success" });
      queryClient.invalidateQueries({
        queryKey: ["projects", "push-deeplinks", active?.id],
      });
    },
    onError: (cause: Error) => {
      const message = cause.message || "Could not create the deeplink.";
      setError(message);
      setToast({ message, severity: "error" });
    },
  });
  const deepLinkDeleteMutation = useMutation({
    mutationFn: async (deepLinkId: string) => {
      if (!active?.id)
        throw new Error("Select a project before deleting a deeplink.");
      return pushApi.deepLinks.delete(active.id, deepLinkId);
    },
    onSuccess: (_, deepLinkId) => {
      if (
        deepLinksQuery.data?.find((item) => item.id === deepLinkId)?.url ===
        deepLink
      )
        setDeepLink("");
      setDeepLinkDeleteTarget(null);
      setToast({ message: "Deeplink deleted successfully.", severity: "success" });
      queryClient.invalidateQueries({
        queryKey: ["projects", "push-deeplinks", active?.id],
      });
    },
    onError: (cause: Error) => {
      const message = cause.message || "Could not delete the deeplink.";
      setError(message);
      setToast({ message, severity: "error" });
    },
  });
  const translateMutation = useMutation({
    mutationFn: async () => {
      if (!active?.id) throw new Error("Select a project before translating.");
      if (!title.trim() || !message.trim())
        throw new Error(
          "Enter an English title and message before translating.",
        );
      const languages = selectedLanguages
        .map((language) => languageCodes[language])
        .filter((code): code is string => Boolean(code));
      return pushApi.templates.translate(active.id, {
        title: title.trim(),
        body: message.trim(),
        languages,
      });
    },
    onSuccess: (result) => {
      const selectedCodes = new Set(
        selectedLanguages
          .map((language) => languageCodes[language])
          .filter((code) => code && code !== "en"),
      );
      const nextTranslations: Record<string, PushTranslation> = {};
      Object.entries(result.translations ?? {}).forEach(([code, value]) => {
        if (code === "en" || selectedCodes.has(code))
          nextTranslations[code] = value;
      });
      setTranslations(nextTranslations);
      const message = `Translated into ${selectedCodes.size} selected language${selectedCodes.size === 1 ? "" : "s"}. Click a language tab to review it.`;
      setTranslationNotice(message);
      setToast({ message, severity: "success" });
    },
    onError: (cause: Error) => {
      const message = cause.message || "Could not translate the notification.";
      setError(message);
      setToast({ message, severity: "error" });
    },
  });
  const previewMutation = useMutation({
    mutationFn: async () => {
      if (!active?.id)
        throw new Error("Select a project before previewing the audience.");
      const audience: PushAudience = group.startsWith("segment:")
        ? { lifecycleSegmentIds: [group.slice(8)] }
        : group.startsWith("group:")
          ? { audienceGroupIds: [group.slice(6)] }
          : { allUsers: true };
      return pushApi.campaigns.audiencePreview(active.id, audience);
    },
    onSuccess: (result) =>
      setNotice(
        `${result.matching.toLocaleString()} users match this audience · ${result.reachable.toLocaleString()} are reachable.`,
      ),
    onError: (cause: Error) =>
      setError(cause.message || "Could not preview the audience."),
  });
  const saveMutation = useMutation({
    mutationFn: async ({ target }: { target: SaveTarget }) => {
      if (!active?.id)
        throw new Error("Select a project before saving a notification.");
      if (!name.trim()) throw new Error("Enter a notification name.");
      if (
        !isTemplate &&
        country !== "All Countries" &&
        group === "Select group"
      )
        throw new Error(
          "Select an audience group for country targeting before sending.",
        );
      if (
        target === "send" &&
        delivery === "specific" &&
        (!scheduledDate || !scheduledTime)
      )
        throw new Error(
          "Choose a date and time for the scheduled notification.",
        );
      const content = {
        title,
        body: message,
        deepLink: deepLink || null,
        imageUrl: null,
        data: {},
        translations: Object.keys(translations).length ? translations : null,
      };
      if (target === "templates") {
        const template = await pushApi.templates.create(active.id, {
          name: name.trim(),
          ...content,
          category: "template",
        });
        return { target: "templates" as const, template };
      }
      const audience: PushAudience = group.startsWith("segment:")
        ? { lifecycleSegmentIds: [group.slice(8)] }
        : group.startsWith("group:")
          ? { audienceGroupIds: [group.slice(6)] }
          : { allUsers: true };
      const scheduledAt =
        target === "send" && delivery === "specific"
          ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
          : undefined;
      const campaign = await pushApi.campaigns.create(active.id, {
        name: name.trim(),
        content,
        category: isTemplate ? "template" : "push_notification",
        audience,
        sendNow: target === "send" && delivery === "immediately",
        scheduledAt,
      });
      return { target, campaign };
    },
    onSuccess: ({ target }) => {
      queryClient.invalidateQueries({ queryKey: ["push"] });
      setNotice(
        target === "send"
          ? "Notification scheduled successfully."
          : target === "drafts"
            ? "Saved as a draft."
            : "Saved as a template.",
      );
      window.setTimeout(() => onSaved(target), 500);
    },
    onError: (cause: Error) =>
      setError(cause.message || "Could not save the notification."),
  });
  const testMutation = useMutation({
    mutationFn: async () => {
      if (!active?.id)
        throw new Error("Select a project before sending a test.");
      if (!testUserId.trim())
        throw new Error("Enter an end-user ID for the test device.");
      const template = await pushApi.templates.create(active.id, {
        name: `${name || "Test notification"} · test`,
        title,
        body: message,
        deepLink: deepLink || null,
        imageUrl: null,
        data: {},
        translations: Object.keys(translations).length ? translations : null,
        category: "push_notification",
      });
      return pushApi.templates.test(active.id, template.id, testUserId.trim());
    },
    onSuccess: (result) => {
      setTestOpen(false);
      setNotice(
        result.delivered
          ? "Test notification delivered."
          : result.error || "Test notification could not be delivered.",
      );
    },
    onError: (cause: Error) =>
      setError(cause.message || "Could not send the test notification."),
  });

  const toggleLanguage = (language: string) => {
    setSelectedLanguages((current) => {
      const next = current.includes(language)
        ? current.filter((item) => item !== language)
        : [...current, language];
      if (!next.includes(activeLanguage)) setActiveLanguage("English");
      return next;
    });
  };
  const activeCode = languageCodes[activeLanguage] ?? "en";
  const activeTranslation =
    activeCode === "en"
      ? { title, body: message }
      : (translations[activeCode] ?? { title: "", body: "" });
  const updateActiveTitle = (value: string) => {
    if (activeCode === "en") {
      setTitle(value);
      setTranslations({});
    } else
      setTranslations((current) => ({
        ...current,
        [activeCode]: {
          ...(current[activeCode] ?? { title: "", body: "" }),
          title: value,
        },
      }));
  };
  const updateActiveBody = (value: string) => {
    if (activeCode === "en") {
      setMessage(value);
      setTranslations({});
    } else
      setTranslations((current) => ({
        ...current,
        [activeCode]: {
          ...(current[activeCode] ?? { title: "", body: "" }),
          body: value,
        },
      }));
  };
  const disabled = isTemplate;
  const action = (target: SaveTarget) => {
    setError("");
    saveMutation.mutate({ target });
  };
  const previewAudience = () => {
    setError("");
    previewMutation.mutate();
  };
  const groupOptions = groupsQuery.data ?? [];
  const segmentOptions = segmentsQuery.data ?? [];
  const deepLinks = deepLinksQuery.data ?? [];
  const saveDeepLink = () => {
    const value = newDeepLink.trim();
    if (!value) return;
    const existing = deepLinks.find(
      (item) => item.url.toLowerCase() === value.toLowerCase(),
    );
    if (existing) {
      setDeepLink(existing.url);
      setNewDeepLink("");
      setDeepLinkDialogOpen(false);
      return;
    }
    setError("");
    deepLinkCreateMutation.mutate(value);
  };
  const deleteDeepLink = (item: { id: string; url: string }) => {
    setDeepLinkDeleteTarget(item);
  };

  return (
    <Stack className="push-composer" gap={2.5}>
      {error && (
        <Typography color="error" fontSize={12}>
          {error}
        </Typography>
      )}
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ md: "center" }}
        gap={1.5}
      >
        <Stack direction="row" alignItems="center" gap={1.5} flexWrap="wrap">
          <Button
            startIcon={<ArrowBackRounded />}
            onClick={onBack}
            className="group-back-button"
            aria-label="Back to push notifications"
          >
            Back to push notifications
          </Button>
        </Stack>
        <Button
          variant="outlined"
          startIcon={<NotificationsActiveRounded />}
          onClick={() => setTestOpen(true)}
        >
          Test notification
        </Button>
      </Stack>

      <Card className="push-type-card">
        <Typography fontSize={12} fontWeight={900} color="text.secondary">
          Notification type
        </Typography>
        <Stack direction="row" className="push-type-toggle">
          <Button
            onClick={() => setCurrentMode("campaign")}
            className={!isTemplate ? "active" : ""}
            startIcon={<SendRounded />}
          >
            Push notification
          </Button>
          <Button
            onClick={() => setCurrentMode("template")}
            className={isTemplate ? "active" : ""}
            startIcon={<SaveRounded />}
          >
            Templates
          </Button>
        </Stack>
      </Card>

      <Grid container spacing={2.5} alignItems="flex-start">
        <Grid item xs={12} lg={7}>
          <Card className="push-form-card">
            <PushHeading number="N" color="#477fe4" title="Name" />
            <TextField
              fullWidth
              required
              label="Push notification name"
              placeholder="Enter push notification name..."
              value={name}
              onChange={(event) => setName(event.target.value)}
              sx={{ mb: 3 }}
            />

            <Box className={disabled ? "push-disabled-section" : ""}>
              <PushHeading
                number="1"
                color="#477fe4"
                title="Audience"
                disabled={disabled}
              />
              <Grid container spacing={1.5}>
                <Grid item xs={12} sm={6}>
                  <Select
                    fullWidth
                    size="small"
                    value={country}
                    onChange={(event) => setCountry(event.target.value)}
                    disabled={disabled}
                  >
                    {countries.map((item) => (
                      <MenuItem key={item} value={item}>
                        {item}
                      </MenuItem>
                    ))}
                  </Select>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Select
                    fullWidth
                    size="small"
                    value={group}
                    onChange={(event) => setGroup(event.target.value)}
                    disabled={disabled}
                  >
                    {
                      <MenuItem value="Select group">
                        {groupsQuery.isLoading
                          ? "Loading audience groups…"
                          : "Select group"}
                      </MenuItem>
                    }
                    {groupOptions.map((item) => (
                      <MenuItem key={item.id} value={`group:${item.id}`}>
                        {item.name}{" "}
                        {item.memberCount !== undefined
                          ? `(${item.memberCount})`
                          : ""}
                      </MenuItem>
                    ))}
                    {segmentOptions.map((item) => (
                      <MenuItem
                        key={`segment-${item.id}`}
                        value={`segment:${item.id}`}
                      >
                        {item.name} · lifecycle segment
                      </MenuItem>
                    ))}
                  </Select>
                </Grid>
              </Grid>
              {!disabled && (
                <Button
                  size="small"
                  variant="text"
                  onClick={previewAudience}
                  disabled={previewMutation.isPending}
                >
                  {previewMutation.isPending
                    ? "Checking audience…"
                    : "Preview audience"}
                </Button>
              )}
              {country !== "All Countries" && (
                <Typography color="text.secondary" fontSize={11} sx={{ mt: 1 }}>
                  Country targeting is managed through an audience group. Select
                  a group that contains this country before sending.
                </Typography>
              )}
            </Box>

            <Divider sx={{ my: 3 }} />
            <PushHeading number="2" color="#9c43e8" title="Message" />
            <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mb: 1.5 }}>
              {selectedLanguages.map((language) => (
                <Button
                  key={language}
                  size="small"
                  className={`push-language ${activeLanguage === language ? "active" : ""}`}
                  onClick={() => setActiveLanguage(language)}
                >
                  {language}
                </Button>
              ))}
              <Button
                size="small"
                startIcon={<EditRounded />}
                onClick={() => setLanguageOpen(true)}
              >
                Add language
              </Button>
            </Stack>
            {translationNotice && (
              <Typography className="push-form-notice push-translation-notice">
                {translationNotice}
              </Typography>
            )}
            <Button
              fullWidth
              startIcon={<TranslateRounded />}
              className="push-translate-button"
              onClick={() => {
                setError("");
                translateMutation.mutate();
              }}
              disabled={
                translateMutation.isPending || selectedLanguages.length < 2
              }
            >
              {translateMutation.isPending
                ? "Translating selected languages…"
                : "Auto translate to all selected languages"}
            </Button>
            <TextField
              fullWidth
              label={`Title (${activeLanguage})`}
              required
              value={activeTranslation.title}
              onChange={(event) => updateActiveTitle(event.target.value)}
              sx={{ mt: 2 }}
            />
            <TextField
              fullWidth
              multiline
              minRows={3}
              label={`Message (${activeLanguage})`}
              required
              value={activeTranslation.body}
              onChange={(event) => updateActiveBody(event.target.value)}
              sx={{ mt: 2 }}
            />
            <TextField
              fullWidth
              select
              label="Deep link"
              value={deepLink}
              onChange={(event) => setDeepLink(event.target.value)}
              sx={{ mt: 2 }}
              InputLabelProps={{ shrink: true }}
              SelectProps={{
                displayEmpty: true,
                renderValue: (value) =>
                  typeof value === "string" && value ? (
                    value
                  ) : (
                    <Typography color="text.secondary">
                      Select a deeplink...
                    </Typography>
                  ),
              }}
            >
              <MenuItem value="">Select a deeplink...</MenuItem>
              {deepLinks.map((item) => (
                <MenuItem key={item.id} value={item.url} sx={{ pr: 1 }}>
                  <Box
                    sx={{
                      flex: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.url}
                  </Box>
                  <IconButton
                    size="small"
                    color="error"
                    aria-label={`Delete ${item.url}`}
                    onMouseDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation();
                      deleteDeepLink(item);
                    }}
                    sx={{ ml: 1 }}
                  >
                    <DeleteOutlineRounded fontSize="small" />
                  </IconButton>
                </MenuItem>
              ))}
              <Divider />
              <MenuItem
                component="div"
                disableRipple
                onClick={(event) => {
                  event.stopPropagation();
                  setDeepLinkDialogOpen(true);
                }}
                sx={{
                  color: "primary.main",
                  fontWeight: 700,
                  justifyContent: "center",
                }}
              >
                Create deeplink
              </MenuItem>
            </TextField>

            <Divider sx={{ my: 3 }} />
            <Box className={disabled ? "push-disabled-section" : ""}>
              <PushHeading
                number="▣"
                color="#ef7049"
                title="Platforms"
                disabled={disabled}
              />
              <Typography color="text.secondary" fontSize={12} sx={{ mb: 1.5 }}>
                Select which platforms to send this notification to.
              </Typography>
              <Grid container spacing={1.5}>
                <Grid item xs={12} sm={6}>
                  <PlatformCard
                    icon={<PhoneIphoneRounded />}
                    title="Apple iOS"
                    subtitle="iPhone & iPad users"
                    checked={ios}
                    onChange={setIos}
                    disabled={disabled}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <PlatformCard
                    icon={<PhoneIphoneRounded />}
                    title="Google Android"
                    subtitle="Android phone users"
                    checked={android}
                    onChange={setAndroid}
                    disabled={disabled}
                  />
                </Grid>
              </Grid>
            </Box>

            <Divider sx={{ my: 3 }} />
            <Box className={disabled ? "push-disabled-section" : ""}>
              <PushHeading
                number="3"
                color="#1eac5f"
                title="Delivery schedule"
                disabled={disabled}
              />
              <RadioGroup
                value={delivery}
                onChange={(event) => setDelivery(event.target.value)}
              >
                <FormControlLabel
                  disabled={disabled}
                  value="immediately"
                  control={<Radio />}
                  label="Immediately"
                />
                <FormControlLabel
                  disabled={disabled}
                  value="specific"
                  control={<Radio />}
                  label="Specific date"
                />
              </RadioGroup>
              {delivery === "specific" && (
                <Box className="push-schedule-card">
                  <RadioGroup
                    row
                    value={timezone}
                    onChange={(event) => setTimezone(event.target.value)}
                  >
                    <FormControlLabel
                      disabled={disabled}
                      value="global"
                      control={<Radio />}
                      label="Global time (UTC+1)"
                    />
                    <FormControlLabel
                      disabled={disabled}
                      value="user"
                      control={<Radio />}
                      label="User time zone"
                    />
                  </RadioGroup>
                  <Grid container spacing={1.5}>
                    <Grid item xs={12} sm={7}>
                      <TextField
                        fullWidth
                        type="date"
                        label="Select date"
                        value={scheduledDate}
                        onChange={(event) =>
                          setScheduledDate(event.target.value)
                        }
                        InputLabelProps={{ shrink: true }}
                        disabled={disabled}
                      />
                    </Grid>
                    <Grid item xs={12} sm={5}>
                      <TextField
                        fullWidth
                        type="time"
                        label="Time"
                        value={scheduledTime}
                        onChange={(event) =>
                          setScheduledTime(event.target.value)
                        }
                        InputLabelProps={{ shrink: true }}
                        disabled={disabled}
                      />
                    </Grid>
                  </Grid>
                </Box>
              )}
            </Box>

            <Divider sx={{ my: 3 }} />
            <Stack
              direction={{ xs: "column", sm: "row" }}
              gap={1.2}
              className="push-action-row"
            >
              {!isTemplate && (
                <Button
                  variant="contained"
                  startIcon={<SendRounded />}
                  disabled={saveMutation.isPending}
                  onClick={() => action("send")}
                >
                  {saveMutation.isPending ? "Sending…" : "Send notification"}
                </Button>
              )}
              <Button
                variant={isTemplate ? "contained" : "outlined"}
                startIcon={<SaveRounded />}
                disabled={saveMutation.isPending}
                onClick={() => action("templates")}
              >
                Save as template
              </Button>
              <Button
                variant="outlined"
                startIcon={<SaveRounded />}
                disabled={saveMutation.isPending}
                onClick={() => action("drafts")}
              >
                Save as draft
              </Button>
            </Stack>
            {notice && (
              <Typography className="push-form-notice">{notice}</Typography>
            )}
          </Card>
        </Grid>
        <Grid item xs={12} lg={5}>
          <Box className="push-preview-panel">
            <Stack
              className="push-preview-header"
              direction="row"
              justifyContent="space-between"
              alignItems="center"
            >
              <Box>
                <Typography className="push-preview-title" variant="h3">
                  Live preview
                </Typography>
                <Typography color="text.secondary" fontSize={12}>
                  Previewing {activeLanguage}
                </Typography>
              </Box>
              <Button
                className="push-preview-test-button"
                onClick={() => setTestOpen(true)}
                startIcon={<NotificationsActiveRounded />}
              >
                Test notification
              </Button>
            </Stack>
            <Box className="ios-device">
              <i className="ios-btn ios-btn-action" />
              <i className="ios-btn ios-btn-vol-up" />
              <i className="ios-btn ios-btn-vol-down" />
              <i className="ios-btn ios-btn-power" />
              <Box className="ios-screen">
                <Box className="ios-island" />
                <Box className="ios-status">
                  <span className="ios-carrier">9:41</span>
                  <Box className="ios-status-icons">
                    <SignalCellularAltRounded />
                    <WifiRounded />
                    <span className="ios-battery">
                      <i />
                    </span>
                  </Box>
                </Box>
                <Box className="ios-lock-icon">
                  <svg viewBox="0 0 24 24" width="14" height="14">
                    <path
                      fill="currentColor"
                      d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5Zm-3 8V7a3 3 0 1 1 6 0v3H9Z"
                    />
                  </svg>
                </Box>
                <Box className="ios-date">Tuesday, September 30</Box>
                <Box className="ios-time">9:41</Box>
                <Box className="ios-stack">
                  <Box className="ios-notif">
                    <Box className="ios-app-icon">
                      <img src="/assets/site-icon.png" alt="PixlPush" />
                    </Box>
                    <Box className="ios-notif-body">
                      <Box className="ios-notif-head">
                        <b>{activeTranslation.title || "Your notification title"}</b>
                        <span>now</span>
                      </Box>
                      <p>
                        {activeTranslation.body ||
                          "Your notification message will appear here."}
                      </p>
                    </Box>
                  </Box>
                </Box>
                <Box className="ios-lock-controls">
                  <Box className="ios-lock-control">
                    <FlashlightOnRounded />
                  </Box>
                  <Box className="ios-lock-control">
                    <CameraAltRounded />
                  </Box>
                </Box>
                <Box className="ios-home-indicator" />
              </Box>
            </Box>
          </Box>
        </Grid>
      </Grid>

      <Dialog
        open={testOpen}
        onClose={() => setTestOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          Send test notification
          <IconButton
            onClick={() => setTestOpen(false)}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseRounded />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography color="text.secondary" fontSize={12} sx={{ mb: 1 }}>
            The backend sends the test to an end user with an active push
            subscription.
          </Typography>
          <Stack gap={2} sx={{ pt: 1 }}>
            <TextField
              label="End-user ID"
              placeholder="customer_123"
              value={testUserId}
              onChange={(event) => setTestUserId(event.target.value)}
              fullWidth
            />
            <TextField
              label="Title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              fullWidth
            />
            <TextField
              label="Message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              multiline
              minRows={3}
              fullWidth
            />
            <TextField
              fullWidth
              select
              label="Deep link"
              value={deepLink}
              onChange={(event) => setDeepLink(event.target.value)}
              InputLabelProps={{ shrink: true }}
              SelectProps={{
                displayEmpty: true,
                renderValue: (value) =>
                  typeof value === "string" && value ? (
                    value
                  ) : (
                    <Typography color="text.secondary">
                      Select a deeplink...
                    </Typography>
                  ),
              }}
            >
              <MenuItem value="">Select a deeplink...</MenuItem>
              {deepLinks.map((item) => (
                <MenuItem
                  key={`test-${item.id}`}
                  value={item.url}
                  sx={{ pr: 1 }}
                >
                  <Box
                    sx={{
                      flex: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.url}
                  </Box>
                  <IconButton
                    size="small"
                    color="error"
                    aria-label={`Delete ${item.url}`}
                    onMouseDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation();
                      deleteDeepLink(item);
                    }}
                    sx={{ ml: 1 }}
                  >
                    <DeleteOutlineRounded fontSize="small" />
                  </IconButton>
                </MenuItem>
              ))}
              <Divider />
              <MenuItem
                component="div"
                disableRipple
                onClick={(event) => {
                  event.stopPropagation();
                  setDeepLinkDialogOpen(true);
                }}
                sx={{
                  color: "primary.main",
                  fontWeight: 700,
                  justifyContent: "center",
                }}
              >
                Create deeplink
              </MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={testMutation.isPending}
            onClick={() => {
              setError("");
              testMutation.mutate();
            }}
          >
            {testMutation.isPending ? "Sending…" : "Send test"}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={deepLinkDialogOpen}
        onClose={() => {
          setDeepLinkDialogOpen(false);
          setNewDeepLink("");
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          Create deeplink
          <IconButton
            onClick={() => {
              setDeepLinkDialogOpen(false);
              setNewDeepLink("");
            }}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseRounded />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Deep link URL"
            placeholder="myapp://screen"
            value={newDeepLink}
            onChange={(event) => setNewDeepLink(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") saveDeepLink();
            }}
            helperText="Enter the URL users should open from this notification."
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDeepLinkDialogOpen(false);
              setNewDeepLink("");
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={saveDeepLink}
            disabled={!newDeepLink.trim()}
          >
            Save deeplink
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={languageOpen}
        onClose={() => setLanguageOpen(false)}
        maxWidth="md"
        fullWidth
        className="push-language-dialog"
      >
        <DialogTitle>
          Add languages
          <IconButton
            onClick={() => setLanguageOpen(false)}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseRounded />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography color="text.secondary" fontSize={13} sx={{ mb: 2 }}>
            English is the default language. Add translations for the languages
            your audience uses.
          </Typography>
          <Grid container spacing={1}>
            {languages.map((language) => (
              <Grid item xs={12} sm={6} md={4} key={language}>
                <Card variant="outlined" className="push-language-option" sx={{ p: 0.5 }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={selectedLanguages.includes(language)}
                        onChange={() => toggleLanguage(language)}
                        disabled={language === "English"}
                      />
                    }
                    label={language}
                  />
                </Card>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions className="push-language-dialog-actions">
          <Button onClick={() => setLanguageOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => setLanguageOpen(false)}>
            Select languages
          </Button>
        </DialogActions>
      </Dialog>
      <DeleteConfirmDialog
        open={Boolean(deepLinkDeleteTarget)}
        onClose={() => setDeepLinkDeleteTarget(null)}
        loading={deepLinkDeleteMutation.isPending}
        onConfirm={() => {
          if (deepLinkDeleteTarget) {
            setError("");
            deepLinkDeleteMutation.mutate(deepLinkDeleteTarget.id);
          }
        }}
        title="Are you sure you want to delete this deeplink?"
        description="This deeplink will be removed from the project and cannot be used in future notifications."
      />
      <Toast message={toast?.message ?? null} severity={toast?.severity} onClose={() => setToast(null)} />
    </Stack>
  );
}

function PushHeading({
  number,
  color,
  title,
  disabled,
}: {
  number: string;
  color: string;
  title: string;
  disabled?: boolean;
}) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      gap={1}
      sx={{ mb: 1.5, opacity: disabled ? 0.5 : 1 }}
    >
      <Box className="push-number-badge" sx={{ bgcolor: color }}>
        {number}
      </Box>
      <Typography fontSize={20} fontWeight={900}>
        {title}
      </Typography>
      {disabled && (
        <Typography fontSize={11} color="text.secondary">
          (disabled for templates)
        </Typography>
      )}
    </Stack>
  );
}
function PlatformCard({
  icon,
  title,
  subtitle,
  checked,
  onChange,
  disabled,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled: boolean;
}) {
  return (
    <Card className="push-platform-card" variant="outlined">
      <Stack direction="row" alignItems="center" gap={1.2}>
        <Box className="push-platform-icon">{icon}</Box>
        <Box sx={{ flex: 1 }}>
          <Typography fontWeight={900} fontSize={13}>
            {title}
          </Typography>
          <Typography color="text.secondary" fontSize={11}>
            {subtitle}
          </Typography>
        </Box>
        <Switch
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
        />
      </Stack>
      {checked && (
        <Typography color="#477fe4" fontSize={10} sx={{ mt: 1 }}>
          ✓ Enabled for this platform
        </Typography>
      )}
    </Card>
  );
}
