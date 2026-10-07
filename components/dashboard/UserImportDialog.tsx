"use client";

import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowBackRounded,
  ArrowForwardRounded,
  CheckCircleRounded,
  CloseRounded,
  CloudUploadRounded,
  DeleteOutlineRounded,
  FileUploadRounded,
  KeyRounded,
} from "@mui/icons-material";
import {
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  FormControlLabel,
  IconButton,
  LinearProgress,
  MenuItem,
  Select,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useActiveProject } from "@/hooks/projects/use-active-project";
import { userImportApi } from "@/lib/projects/api";
import type { ApiError } from "@/types/auth";
import type {
  CustomPropertyDef,
  ImportMappingInput,
  ImportPreview,
  UserImport,
} from "@/types/project";

/** A backend target field (`email`, `properties.phone`, …) or `ignore`. */
type Field = string;
/** Languages the backend's mapping suggestions support: [label, code]. */
const headerLanguages: [string, string][] = [
  ["English", "en"],
  ["German", "de"],
  ["French", "fr"],
  ["Spanish", "es"],
  ["Italian", "it"],
  ["Portuguese", "pt"],
  ["Arabic", "ar"],
  ["Turkish", "tr"],
  ["Russian", "ru"],
  ["Indonesian", "id"],
  ["Japanese", "ja"],
  ["Korean", "ko"],
  ["Persian", "fa"],
  ["Thai", "th"],
  ["Vietnamese", "vi"],
];

const fields: { value: Field; label: string }[] = [
  { value: "ignore", label: "Do not import" },
  { value: "externalUserId", label: "User ID" },
  { value: "email", label: "Email address" },
  { value: "name", label: "Name" },
  { value: "country", label: "Country" },
  { value: "region", label: "Region" },
  { value: "preferredLanguage", label: "Language" },
  { value: "timezone", label: "Time zone" },
  { value: "accountStatus", label: "Account status" },
  { value: "userType", label: "User type" },
  { value: "emailConsent", label: "Email consent" },
  { value: "lastActiveAt", label: "Last active" },
  { value: "properties.phone", label: "Phone number" },
];
const sources: {
  id: "csv";
  label: string;
  description: string;
  icon: typeof FileUploadRounded;
}[] = [
  {
    id: "csv",
    label: "CSV file",
    description: "Upload a list of users and map the columns.",
    icon: FileUploadRounded,
  },
];

export default function UserImportDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { active } = useActiveProject();
  const projectId = active?.id ?? "";
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(0);
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, Field>>({});
  const [overwrite, setOverwrite] = useState<Record<string, boolean>>({});
  const [uniqueField, setUniqueField] = useState("");
  const [uniqueMatchingEnabled, setUniqueMatchingEnabled] = useState(true);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [createAndUpdate, setCreateAndUpdate] = useState(true);
  const [addToAudienceGroup, setAddToAudienceGroup] = useState(false);
  const [audienceGroupName, setAudienceGroupName] = useState("");
  const [headerLanguage, setHeaderLanguage] = useState("en");
  const [importHistory, setImportHistory] = useState<UserImport[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [importJob, setImportJob] = useState<UserImport | null>(null);
  const [propertyDefs, setPropertyDefs] = useState<
    Record<string, CustomPropertyDef>
  >({});
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const totalRows = importJob?.totalRows ?? 0;
  const options = [
    ...fields,
    ...Object.values(propertyDefs)
      .filter(
        (def) =>
          !fields.some((field) => field.value === `properties.${def.key}`),
      )
      .map((def) => ({
        value: `properties.${def.key}`,
        label: `Custom property · ${def.label}`,
      })),
  ];

  const loadHistory = useCallback(() => {
    if (!open || !projectId) return;
    setHistoryLoading(true);
    userImportApi
      .list(projectId)
      .then((page) => setImportHistory(page.items))
      .catch(() => {
        /* History is optional. */
      })
      .finally(() => setHistoryLoading(false));
  }, [open, projectId]);
  useEffect(loadHistory, [loadHistory]);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const deleteImportedUsers = async (record: UserImport) => {
    if (
      !projectId ||
      !window.confirm(
        record.status === "completed"
          ? `Permanently delete the users created by "${record.fileName}"? Their events and activity are deleted too. Users this import only updated are kept.`
          : `Delete the unfinished import "${record.fileName}"? No users were imported from it.`,
      )
    )
      return;
    setDeletingId(record.id);
    setNotice("");
    try {
      const { deletedUsers } = await userImportApi.deleteUsers(
        projectId,
        record.id,
      );
      setNotice(
        `${deletedUsers} user${deletedUsers === 1 ? "" : "s"} deleted from "${record.fileName}".`,
      );
      queryClient.invalidateQueries({ queryKey: ["projects", "users"] });
      loadHistory();
    } catch (e) {
      setNotice(
        (e as ApiError).message ?? "Could not delete the imported users.",
      );
    } finally {
      setDeletingId(null);
    }
  };

  // The worker applies a committed import in the background; poll until it finishes.
  useEffect(() => {
    if (step !== 3 || !importJob || importJob.status !== "committing") return;
    const timer = window.setTimeout(
      () =>
        userImportApi
          .get(projectId, importJob.id)
          .then((job) => {
            setImportJob(job);
            if (job.status === "completed") {
              queryClient.invalidateQueries({
                queryKey: ["projects", "users"],
              });
              queryClient.invalidateQueries({
                queryKey: ["projects", "audience-groups"],
              });
              loadHistory();
            }
          })
          .catch(() => setImportJob({ ...importJob })),
      2000,
    );
    return () => window.clearTimeout(timer);
  }, [step, importJob, projectId, queryClient, loadHistory]);

  const reset = () => {
    setStep(0);
    setFileName("");
    setFileSize("");
    setHeaders([]);
    setRows([]);
    setMapping({});
    setOverwrite({});
    setUniqueField("");
    setUniqueMatchingEnabled(true);
    setUploadProgress(0);
    setIsUploading(false);
    setCreateAndUpdate(true);
    setAddToAudienceGroup(false);
    setAudienceGroupName("");
    setHeaderLanguage("en");
    setImportJob(null);
    setPropertyDefs({});
    setPreview(null);
    setError("");
  };
  const close = () => {
    reset();
    onClose();
  };
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (cause) {
      setError(
        (cause as ApiError).message ??
          "Something went wrong. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  const parseCsv = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !projectId) return;
    setFileName(file.name);
    setFileSize(`${(file.size / 1024).toFixed(1)} KB`);
    setUploadProgress(0);
    setIsUploading(true);
    setError("");
    const progressTimer = window.setInterval(
      () => setUploadProgress((current) => Math.min(current + 8, 88)),
      80,
    );
    try {
      const job = await userImportApi.upload(
        projectId,
        file.name,
        await file.text(),
      );
      setImportJob(job);
      setHeaders(job.headers);
      setRows(
        (job.sampleRows ?? []).map((row) =>
          job.headers.map((header) => row[header] ?? ""),
        ),
      );
      setUploadProgress(100);
    } catch (cause) {
      setError(
        (cause as ApiError).message ?? "Upload failed. Please try again.",
      );
      setImportJob(null);
      setFileName("");
      setUploadProgress(0);
    } finally {
      window.clearInterval(progressTimer);
      window.setTimeout(() => setIsUploading(false), 450);
    }
  };

  /** Upload -> Map fields: the backend suggests a mapping for the file's header language. */
  const loadSuggestions = () =>
    run(async () => {
      const result = await userImportApi.suggestions(
        projectId,
        importJob!.id,
        headerLanguage,
      );
      const defs: Record<string, CustomPropertyDef> = {};
      result.customProperties.forEach((def) => {
        defs[def.key] = def;
      });
      const nextMapping: Record<string, Field> = {};
      result.suggestions.forEach((suggestion) => {
        nextMapping[suggestion.sourceColumn] =
          suggestion.targetField ?? "ignore";
        if (suggestion.newCustomProperty)
          defs[suggestion.newCustomProperty.key] = suggestion.newCustomProperty;
      });
      setPropertyDefs(defs);
      setMapping(nextMapping);
      setOverwrite({});
      setUniqueField(
        result.suggestions.find((suggestion) => suggestion.isMatchKey)
          ?.sourceColumn ?? "",
      );
      setStep(1);
    });

  /** Map fields -> Review: save the mapping, then dry-run it. */
  const mapAndPreview = () =>
    run(async () => {
      const mappings: ImportMappingInput["mappings"] = headers.map((column) => {
        const target = mapping[column] ?? "ignore";
        if (target === "ignore")
          return { sourceColumn: column, targetField: null };
        return {
          sourceColumn: column,
          targetField: target,
          isMatchKey: column === uniqueField,
          overwriteMode: !createAndUpdate
            ? "do_not_overwrite"
            : overwrite[column]
              ? "overwrite"
              : "fill_empty_only",
          ...(target === "properties.phone"
            ? { normalization: "phone" as const }
            : {}),
        };
      });
      // Every mapped custom property needs a definition; the backend creates missing ones.
      const customProperties = Array.from(
        new Set(
          mappings
            .map((item) => item.targetField)
            .filter((target): target is string =>
              Boolean(target?.startsWith("properties.")),
            ),
        ),
      )
        .map((target) => target.slice("properties.".length))
        .map(
          (key) =>
            propertyDefs[key] ?? { key, label: key, type: "string" as const },
        );
      await userImportApi.map(projectId, importJob!.id, {
        sourceLanguage: headerLanguage,
        mappings,
        customProperties,
        saveMatchRule: uniqueMatchingEnabled,
      });
      setPreview(await userImportApi.preview(projectId, importJob!.id));
      setStep(2);
    });

  const completeImport = () =>
    run(async () => {
      setImportJob(
        await userImportApi.commit(
          projectId,
          importJob!.id,
          addToAudienceGroup ? audienceGroupName.trim() : undefined,
        ),
      );
      setStep(3);
    });

  const canContinue = busy
    ? false
    : step === 0
      ? Boolean(importJob) && !isUploading
      : step === 1
        ? Boolean(uniqueField) &&
          (mapping[uniqueField] ?? "ignore") !== "ignore"
        : Boolean(preview) &&
          (!addToAudienceGroup || Boolean(audienceGroupName.trim()));
  const summary = preview?.summary;
  const results = importJob?.results;
  return (
    <Dialog
      open={open}
      onClose={close}
      fullWidth
      maxWidth="xl"
      className="user-import-dialog"
    >
      <Box className="user-import-header">
        <Box>
          <Typography className="user-import-eyebrow">USER IMPORT</Typography>
          <Typography className="user-import-title">Import users</Typography>
        </Box>
        <IconButton onClick={close} aria-label="Close">
          <CloseRounded />
        </IconButton>
      </Box>
      <DialogContent className="user-import-content">
        <Stack
          direction={{ xs: "column", md: "row" }}
          alignItems={{ md: "center" }}
          className="user-import-steps"
        >
          {["Upload", "Map fields", "Review", "Finish"].map((label, index) => (
            <Stack
              key={label}
              direction="row"
              alignItems="center"
              className={
                index <= step ? "user-import-step active" : "user-import-step"
              }
            >
              <Box className="user-import-step-number">
                {index < step ? (
                  <CheckCircleRounded fontSize="small" />
                ) : (
                  index + 1
                )}
              </Box>
              <Typography>{label}</Typography>
              {index < 3 && <Box className="user-import-step-line" />}
            </Stack>
          ))}
        </Stack>
        {step === 0 && (
          <Stack gap={2.5}>
            <Box>
              <Typography variant="h3">Choose how to import users</Typography>
              <Typography color="text.secondary" fontSize={13}>
                Upload a CSV list of users and map the columns before importing
                them into PixlPush.
              </Typography>
            </Box>
            <Box className="import-source-grid">
              {sources.map(({ id, label, description, icon: Icon }) => (
                <Box key={id} className="import-source-card active">
                  <Box className="import-source-icon">
                    <Icon />
                  </Box>
                  <Typography fontWeight={600}>{label}</Typography>
                  <Typography color="text.secondary" fontSize={11}>
                    {description}
                  </Typography>
                </Box>
              ))}
            </Box>
            <Box
              className={
                isUploading ? "csv-upload-panel uploading" : "csv-upload-panel"
              }
              onClick={() => !isUploading && inputRef.current?.click()}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".csv,.tsv,.txt,text/csv"
                hidden
                onChange={parseCsv}
              />
              <CloudUploadRounded />
              <Typography fontWeight={600}>
                {isUploading
                  ? "Uploading and reading your CSV…"
                  : fileName || "Upload a CSV file"}
              </Typography>
              {isUploading ? (
                <Stack className="csv-upload-progress" gap={0.7}>
                  <LinearProgress
                    variant="determinate"
                    value={uploadProgress}
                  />
                  <Typography color="text.secondary" fontSize={12}>
                    {uploadProgress}% complete · Preparing import settings
                  </Typography>
                </Stack>
              ) : (
                <>
                  <Typography color="text.secondary" fontSize={12}>
                    {fileName
                      ? `${totalRows} user rows detected · ${fileSize}`
                      : "Drag and drop your file here, or browse from your computer"}
                  </Typography>
                  <Button
                    variant="outlined"
                    onClick={(event) => {
                      event.stopPropagation();
                      inputRef.current?.click();
                    }}
                  >
                    {fileName ? "Replace CSV file" : "Choose CSV file"}
                  </Button>
                </>
              )}
            </Box>
            {fileName && !isUploading ? (
              <Box className="import-upload-settings">
                <Stack direction="row" alignItems="center" gap={1.5}>
                  <Box className="import-file-icon">
                    <FileUploadRounded />
                  </Box>
                  <Box>
                    <Typography fontWeight={600}>{fileName}</Typography>
                    <Typography color="text.secondary" fontSize={12}>
                      {fileSize} · {totalRows} records detected
                    </Typography>
                  </Box>
                  <CheckCircleRounded className="import-file-check" />
                </Stack>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={createAndUpdate}
                      onChange={(event) =>
                        setCreateAndUpdate(event.target.checked)
                      }
                    />
                  }
                  label={
                    <Box>
                      <Typography fontWeight={600}>
                        Create and update users
                      </Typography>
                      <Typography color="text.secondary" fontSize={12}>
                        Update existing users with this import. In the next
                        step, you can select a unique field—such as a customer
                        ID, email address, phone number, or CRM ID—to match
                        imported records to existing PixlPush users. Matching
                        users will be updated, while unmatched records will be
                        created as new users.
                      </Typography>
                    </Box>
                  }
                />
                <Stack gap={0.8}>
                  <Typography fontWeight={600}>
                    Select the language of column headers in your file
                  </Typography>
                  <Typography color="text.secondary" fontSize={12}>
                    Choose the language used by your CSV headers so PixlPush can
                    map them accurately.
                  </Typography>
                  <Select
                    size="small"
                    value={headerLanguage}
                    onChange={(event) => setHeaderLanguage(event.target.value)}
                  >
                    {headerLanguages.map(([label, code]) => (
                      <MenuItem key={code} value={code}>
                        {label}
                      </MenuItem>
                    ))}
                  </Select>
                </Stack>
              </Box>
            ) : (
              <Box className="import-history">
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="flex-end"
                >
                  <Box>
                    <Typography variant="h3">Previous imports</Typography>
                    <Typography color="text.secondary" fontSize={12}>
                      Review files imported into this project.
                    </Typography>
                  </Box>
                  <Typography color="text.secondary" fontSize={11}>
                    {importHistory.length} import
                    {importHistory.length === 1 ? "" : "s"}
                  </Typography>
                </Stack>
                <Box className="import-history-table">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>File name</TableCell>
                        <TableCell>Data</TableCell>
                        <TableCell>Uploaded</TableCell>
                        <TableCell>Uploaded by</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {historyLoading ? (
                        Array.from({ length: 3 }, (_, index) => (
                          <TableRow key={`history-skeleton-${index}`}>
                            {Array.from({ length: 6 }, (_, cellIndex) => (
                              <TableCell key={cellIndex}>
                                <Skeleton
                                  variant="text"
                                  width={cellIndex === 0 ? "78%" : "62%"}
                                />
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      ) : importHistory.length ? (
                        importHistory.map((record) => (
                          <TableRow key={record.id}>
                            <TableCell>
                              <Typography fontWeight={600}>
                                {record.fileName}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {record.totalRows} rows · {record.headers.length}{" "}
                              fields
                            </TableCell>
                            <TableCell>
                              {new Date(record.createdAt).toLocaleString()}
                            </TableCell>
                            <TableCell>—</TableCell>
                            <TableCell>
                              <Chip
                                label={record.status}
                                size="small"
                                className={
                                  record.status === "completed"
                                    ? "active-chip"
                                    : "paused-chip"
                                }
                              />
                            </TableCell>
                            <TableCell align="right">
                              {["completed", "uploaded", "mapped", "previewed"].includes(record.status) && (
                                <Tooltip title={record.status === "completed" ? "Delete the users this import created" : "Delete this unfinished import"}>
                                  <span>
                                    <IconButton
                                      size="small"
                                      color="error"
                                      className="delete-action"
                                      aria-label={`Delete users imported from ${record.fileName}`}
                                      disabled={deletingId !== null}
                                      onClick={() =>
                                        deleteImportedUsers(record)
                                      }
                                    >
                                      <DeleteOutlineRounded fontSize="small" />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} align="center">
                            <Typography
                              color="text.secondary"
                              fontSize={12}
                              sx={{ py: 2 }}
                            >
                              No previous imports yet.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </Box>
                {notice && (
                  <Typography
                    fontSize={12}
                    color="text.secondary"
                    sx={{ mt: 1 }}
                    role="status"
                  >
                    {notice}
                  </Typography>
                )}
              </Box>
            )}
          </Stack>
        )}
        {step === 1 && (
          <Stack gap={2}>
            <Box>
              <Typography variant="h3">Map CSV fields</Typography>
              <Typography color="text.secondary" fontSize={13}>
                Match each column from your file to a PixlPush user field.
                Choose which fields can overwrite existing values and select one
                unique identifier.
              </Typography>
            </Box>
            <Box className="import-map-toolbar">
              <Typography fontWeight={600}>{fileName}</Typography>
              <Typography color="text.secondary" fontSize={12}>
                {totalRows} rows · {headers.length} columns
              </Typography>
            </Box>
            <Box className="unique-matching-panel">
              <Typography className="unique-matching-title">
                Select a unique field for matching users
              </Typography>
              <Typography color="text.secondary" fontSize={13}>
                Choose the field that contains a unique value for each user,
                such as a customer ID, email address, phone number, CRM ID, or
                another custom property. PixlPush will use this field to match
                future imports with existing users, update their data, and
                prevent duplicate users from being created.
              </Typography>
              <Select
                size="small"
                value={uniqueField}
                onChange={(event) => setUniqueField(event.target.value)}
                displayEmpty
              >
                <MenuItem value="" disabled>
                  Select a field
                </MenuItem>
                {headers.map((header) => (
                  <MenuItem key={header} value={header}>
                    {header}
                    {(mapping[header] ?? "ignore") !== "ignore"
                      ? ` · ${options.find((field) => field.value === mapping[header])?.label}`
                      : ""}
                  </MenuItem>
                ))}
              </Select>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={uniqueMatchingEnabled}
                    onChange={(event) =>
                      setUniqueMatchingEnabled(event.target.checked)
                    }
                  />
                }
                label={
                  <Box>
                    <Typography fontWeight={600}>
                      Use this field as the unique identifier for future imports
                    </Typography>
                    <Typography color="text.secondary" fontSize={12}>
                      When enabled, matching users will be updated instead of
                      imported as duplicates. Users without a matching value
                      will receive a new PixlPush ID.
                    </Typography>
                  </Box>
                }
              />
            </Box>
            <Box className="import-map-table">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Column from file</TableCell>
                    <TableCell>Data preview</TableCell>
                    <TableCell align="center">Unique identifier</TableCell>
                    <TableCell>Import as</TableCell>
                    <TableCell align="center">Overwrite</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {headers.map((header, index) => (
                    <TableRow key={header}>
                      <TableCell>
                        <Typography fontWeight={600}>{header}</Typography>
                      </TableCell>
                      <TableCell>
                        <Stack>
                          {rows.slice(0, 3).map((row, rowIndex) => (
                            <Typography key={rowIndex} fontSize={12}>
                              {row[index] || "—"}
                            </Typography>
                          ))}
                        </Stack>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip
                          title={
                            uniqueField === header && uniqueMatchingEnabled
                              ? `${header} — unique identifier. This field can be used to find and update existing users.`
                              : "Not a unique identifier"
                          }
                          arrow
                          placement="top"
                        >
                          <Box
                            className={
                              uniqueField === header && uniqueMatchingEnabled
                                ? "unique-key-display active"
                                : "unique-key-display"
                            }
                            aria-label={
                              uniqueField === header
                                ? `${header} is the unique identifier`
                                : "Not the unique identifier"
                            }
                          >
                            {uniqueField === header && uniqueMatchingEnabled ? (
                              <KeyRounded />
                            ) : (
                              "—"
                            )}
                          </Box>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Select
                          fullWidth
                          size="small"
                          value={mapping[header] || "ignore"}
                          onChange={(event) =>
                            setMapping((current) => ({
                              ...current,
                              [header]: event.target.value,
                            }))
                          }
                        >
                          {options.map((field) => (
                            <MenuItem key={field.value} value={field.value}>
                              {field.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </TableCell>
                      <TableCell align="center">
                        <Checkbox
                          size="small"
                          checked={Boolean(overwrite[header])}
                          onChange={(event) =>
                            setOverwrite((current) => ({
                              ...current,
                              [header]: event.target.checked,
                            }))
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
            {!canContinue && !busy && (
              <Typography color="#d95b63" fontSize={12} fontWeight={500}>
                Select a unique identifier column that is mapped to a field
                before continuing.
              </Typography>
            )}
            <Typography className="unique-field-help">
              The gold key marks the field used to match imported records with
              existing users.
            </Typography>
          </Stack>
        )}
        {step === 2 && (
          <Stack gap={2.5}>
            <Box>
              <Typography variant="h3">Review import</Typography>
              <Typography color="text.secondary" fontSize={13}>
                Check the import summary before adding these users to PixlPush.
              </Typography>
            </Box>
            <Box className="import-review-summary">
              <Box>
                <Typography color="text.secondary" fontSize={12}>
                  File
                </Typography>
                <Typography fontWeight={600}>{fileName}</Typography>
              </Box>
              <Box>
                <Typography color="text.secondary" fontSize={12}>
                  Users to import
                </Typography>
                <Typography fontSize={24} fontWeight={600}>
                  {summary?.total ?? totalRows}
                </Typography>
              </Box>
              <Box>
                <Typography color="text.secondary" fontSize={12}>
                  Mapped fields
                </Typography>
                <Typography fontSize={24} fontWeight={600}>
                  {
                    Object.values(mapping).filter((value) => value !== "ignore")
                      .length
                  }
                </Typography>
              </Box>
            </Box>
            {summary && (
              <Typography color="text.secondary" fontSize={13}>
                {summary.newUsers} new · {summary.existingUsers} existing (
                {summary.unchanged} unchanged) · {summary.conflicts} conflicts ·{" "}
                {summary.invalid} invalid · {summary.skipped} skipped
              </Typography>
            )}
            <Box className="import-review-card">
              <FormControlLabel
                control={
                  <Checkbox
                    checked={addToAudienceGroup}
                    onChange={(event) =>
                      setAddToAudienceGroup(event.target.checked)
                    }
                  />
                }
                label={
                  <Box>
                    <Typography fontWeight={600}>
                      Add all imported users to a new audience group
                    </Typography>
                    <Typography color="text.secondary" fontSize={12}>
                      When selected, PixlPush will create a new audience group
                      and add all users from this import to it.
                    </Typography>
                  </Box>
                }
              />
              <TextField
                fullWidth
                size="small"
                label="New audience group name"
                placeholder="e.g. September CSV import"
                value={audienceGroupName}
                onChange={(event) => setAudienceGroupName(event.target.value)}
                disabled={!addToAudienceGroup || busy}
                required={addToAudienceGroup}
                helperText={
                  addToAudienceGroup
                    ? "Enter a name for the audience group that will contain these imported users."
                    : "Enable the checkbox to create an audience group for this import."
                }
              />
            </Box>
            {addToAudienceGroup && !audienceGroupName.trim() && (
              <Typography color="#d95b63" fontSize={12} fontWeight={500}>
                Enter an audience group name to continue.
              </Typography>
            )}
            <Box className="import-review-card">
              <Typography fontWeight={600}>Mapped fields</Typography>
              <Typography color="text.secondary" fontSize={12}>
                Column header language:{" "}
                {headerLanguages.find(([, code]) => code === headerLanguage)?.[0] ?? headerLanguage}
              </Typography>
              {headers
                .filter((header) => (mapping[header] ?? "ignore") !== "ignore")
                .map((header) => (
                  <Stack
                    key={header}
                    direction="row"
                    justifyContent="space-between"
                    className="import-review-row"
                  >
                    <Typography>{header}</Typography>
                    <Chip
                      label={
                        options.find((field) => field.value === mapping[header])
                          ?.label
                      }
                      size="small"
                    />
                  </Stack>
                ))}
            </Box>
          </Stack>
        )}
        {step === 3 && (
          <Stack
            alignItems="center"
            textAlign="center"
            gap={1.5}
            className="import-finish"
          >
            <CheckCircleRounded className="import-finish-icon" />
            <Typography variant="h3">
              {importJob?.status === "completed"
                ? "Import complete"
                : importJob?.status === "failed"
                  ? "Import failed"
                  : "Importing users…"}
            </Typography>
            <Typography color="text.secondary">
              {importJob?.status === "completed" && results
                ? `${results.created} created · ${results.updated} updated · ${results.unchanged} unchanged · ${results.conflicts} conflicts · ${results.errors} invalid · ${results.skipped} skipped`
                : importJob?.status === "failed"
                  ? (importJob.errorMessage ??
                    "The import could not be applied.")
                  : `${importJob?.processedRows ?? 0} of ${totalRows} rows processed from ${fileName || "your import"}.`}
            </Typography>
            {importJob?.status !== "completed" &&
              importJob?.status !== "failed" && (
                <Box sx={{ width: "100%", maxWidth: 420 }}>
                  <LinearProgress
                    variant={totalRows ? "determinate" : "indeterminate"}
                    value={
                      totalRows
                        ? Math.min(
                            100,
                            Math.round(
                              ((importJob?.processedRows ?? 0) / totalRows) *
                                100,
                            ),
                          )
                        : undefined
                    }
                    aria-label="Import progress"
                  />
                  <Typography
                    color="text.secondary"
                    fontSize={11}
                    sx={{ mt: 0.5 }}
                  >
                    {totalRows
                      ? `${Math.min(100, Math.round(((importJob?.processedRows ?? 0) / totalRows) * 100))}%`
                      : "Starting…"}{" "}
                    · you can close this window, the import keeps running.
                  </Typography>
                </Box>
              )}
            <Chip label="PixlPush users" />
          </Stack>
        )}
        {error && (
          <Typography color="#d95b63" fontSize={12} fontWeight={500}>
            {error}
          </Typography>
        )}
        <Stack
          direction="row"
          justifyContent="space-between"
          className="user-import-actions"
        >
          <Button
            startIcon={<ArrowBackRounded />}
            disabled={busy}
            onClick={() =>
              step === 0 ? close() : setStep((value) => value - 1)
            }
          >
            {step === 0 ? "Cancel" : "Back"}
          </Button>
          {step < 3 ? (
            <Button
              variant="contained"
              startIcon={
                busy ? <CircularProgress size={17} color="inherit" /> : undefined
              }
              endIcon={busy ? undefined : <ArrowForwardRounded />}
              disabled={!canContinue}
              onClick={
                step === 0
                  ? loadSuggestions
                  : step === 1
                    ? mapAndPreview
                    : completeImport
              }
            >
              {busy ? "Loading…" : step === 2 ? "Finish import" : "Continue"}
            </Button>
          ) : (
            <Button variant="contained" onClick={close}>
              Done
            </Button>
          )}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
