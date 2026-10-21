'use client';

import { useEffect, useState } from 'react';
import { Alert, Box, Button, Card, Dialog, DialogContent, DialogTitle, Skeleton, Stack, TextField, Typography } from '@mui/material';
import { EditOutlined, DownloadRounded, OpenInNewRounded, ContentCopyRounded } from '@mui/icons-material';
import { jsPDF } from 'jspdf';
import { useQuery } from '@tanstack/react-query';
import { useActiveProject } from '@/hooks/projects/use-active-project';
import { useProject, useUpdateProject } from '@/hooks/projects/use-projects';
import SubmitButton from '@/components/auth/SubmitButton';
import type { ApiError } from '@/types/auth';
import AccountProfile from '@/components/auth/AccountProfile';
import { aiApi } from '@/lib/projects/ai';

function BusinessContextPanel({ projectId }: { projectId?: string }) {
  const contextQuery = useQuery({
    queryKey: ['projects', projectId, 'ai', 'business-context'],
    queryFn: () => aiApi.businessContext(projectId!),
    enabled: Boolean(projectId),
  });
  const context = contextQuery.data;
  const analysis = context?.businessAnalysis;
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const humanize = (value: string) => value.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').replace(/^./, (character) => character.toUpperCase());

  const downloadAnalysis = async () => {
    if (!context || !analysis) return;
    const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 46;
    const contentWidth = pageWidth - margin * 2;
    let y = 46;
    const date = new Date();
    const dateLabel = `${date.toLocaleDateString('en-GB')}, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const logoData = await fetch('/assets/logo.webp').then((response) => response.blob()).then((blob) => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    })).catch(() => undefined);
    const ensureSpace = (height: number) => {
      if (y + height > pageHeight - 42) {
        pdf.addPage();
        y = 46;
      }
    };
    const addText = (value: unknown, size = 10, color: [number, number, number] = [38, 21, 54], bold = false, gap = 6) => {
      const text = String(value ?? '');
      pdf.setFont('helvetica', bold ? 'bold' : 'normal');
      pdf.setFontSize(size);
      pdf.setTextColor(...color);
      const lines = pdf.splitTextToSize(text, contentWidth);
      ensureSpace(lines.length * (size + 3) + gap);
      pdf.text(lines, margin, y);
      y += lines.length * (size + 3) + gap;
    };
    const addSection = (title: string) => {
      ensureSpace(42);
      y += 10;
      pdf.setDrawColor(229, 221, 242);
      pdf.line(margin, y + 5, pageWidth - margin, y + 5);
      addText(title, 15, [85, 32, 168], true, 12);
    };
    const addList = (values: string[]) => values.forEach((value) => addText(`• ${value}`, 10, [38, 21, 54], false, 3));

    pdf.setFillColor(12, 3, 27);
    pdf.roundedRect(0, 0, pageWidth, 194, 16, 16, 'F');
    pdf.setFillColor(132, 60, 255);
    pdf.rect(0, 191, pageWidth, 3, 'F');
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(233, 221, 255);
    pdf.text(dateLabel, margin, 30);
    pdf.text('PixlPush Business Analysis', pageWidth - margin - 92, 30);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(176, 107, 255);
    pdf.text('BUSINESS INTELLIGENCE REPORT', margin, 78);
    pdf.setFontSize(29);
    pdf.setTextColor(255, 255, 255);
    pdf.text('Business analysis', margin, 113);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    pdf.setTextColor(215, 203, 234);
    pdf.text('Prepared from the saved PixlPush business context', margin, 137);
    if (logoData) pdf.addImage(logoData, 'PNG', pageWidth - margin - 126, 76, 126, 45, undefined, 'FAST');
    y = 232;
    addSection('30-second elevator pitch');
    addText(analysis.elevatorPitch, 12, [38, 21, 54], false, 10);
    addSection('Sources');
    addText(`Website: ${context.websiteUrl || 'Not provided'}`, 10);
    if (context.appStoreUrl) addText(`App Store: ${context.appStoreUrl}`, 10);
    if (context.googlePlayUrl) addText(`Google Play: ${context.googlePlayUrl}`, 10);
    addSection('Business profile');
    addText(`Business model: ${analysis.businessModel.classification} — ${analysis.businessModel.reasoning}`, 10);
    addText(`Business/product stage: ${analysis.businessStage.classification} — ${analysis.businessStage.reasoning}`, 10);
    addText(`Core product or service: ${analysis.coreProductOrService}`, 10);
    addSection('Ideal customer profile');
    Object.entries(analysis.idealCustomerProfile).forEach(([key, value]) => addText(`${humanize(key)}: ${value}`, 10));
    addSection('ICP pain points');
    Object.entries(analysis.icpPainPoints).forEach(([key, values]) => { addText(humanize(key), 10, [128, 107, 152], true, 3); addList(values); });
    addSection('Customer goals');
    addList(analysis.customerGoals);
    addSection('Value proposition');
    addList(analysis.valueProposition);
    addSection('Objections and barriers');
    addList(analysis.objectionsAndBarriers);
    addSection('Messaging recommendations');
    Object.entries(analysis.messagingRecommendations).forEach(([key, values]) => { addText(humanize(key), 10, [128, 107, 152], true, 3); addList(values); });
    y = Math.min(y + 12, pageHeight - 28);
    pdf.setDrawColor(229, 221, 242);
    pdf.line(margin, y, pageWidth - margin, y);
    addText('Generated with PixlPush · Business context for marketing, lifecycle journeys and campaign content', 8, [118, 107, 131], false, 0);
    pdf.save('pixlpush-business-analysis.pdf');
  };

  if (contextQuery.isPending) return <Box sx={{ mt: 3 }}><Skeleton variant="rounded" height={120} /></Box>;
  if (!context || (!analysis && !context.websiteUrl && !context.appStoreUrl && !context.googlePlayUrl)) return null;
  return <Box className="business-context-settings" sx={{ mt: 3, pt: 3, borderTop: '1px solid #eeeaf3' }}>
    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={2}>
      <Box><Typography variant="h4">Business context</Typography><Typography color="text.secondary" fontSize="var(--fs-12)" sx={{ mt: .5 }}>Information collected by Max for future journeys and campaign content.</Typography></Box>
      {analysis && <Stack direction="row" alignItems="center" gap={1}><Button type="button" size="small" startIcon={<DownloadRounded />} onClick={downloadAnalysis}>Download</Button><Button type="button" size="small" startIcon={<EditOutlined />} href="/dashboard">Edit analysis</Button></Stack>}
    </Stack>
    <Stack gap={1.25} sx={{ mt: 2 }}>
      {context.websiteUrl && <Box className="business-context-source"><Typography className="business-context-label">Website</Typography><Typography fontSize="var(--fs-13)">{context.websiteUrl}</Typography></Box>}
      {(context.appStoreUrl || context.googlePlayUrl) && <Box className="business-context-source"><Typography className="business-context-label">App links</Typography>{context.appStoreUrl && <Typography fontSize="var(--fs-13)"><a href={context.appStoreUrl} target="_blank" rel="noreferrer">App Store <OpenInNewRounded sx={{ fontSize: 13, verticalAlign: 'middle' }} /></a></Typography>}{context.googlePlayUrl && <Typography fontSize="var(--fs-13)"><a href={context.googlePlayUrl} target="_blank" rel="noreferrer">Google Play <OpenInNewRounded sx={{ fontSize: 13, verticalAlign: 'middle' }} /></a></Typography>}</Box>}
      {analysis && <Box className="business-context-source"><Typography className="business-context-label">Business analysis</Typography><Typography fontSize="var(--fs-13)" sx={{ mt: .5 }}>{analysis.elevatorPitch}</Typography><Button type="button" size="small" sx={{ mt: 1, px: 0, minWidth: 0 }} onClick={() => setAnalysisOpen(true)}>View more</Button></Box>}
    </Stack>
    {analysis && <Dialog open={analysisOpen} onClose={() => setAnalysisOpen(false)} maxWidth="md" fullWidth><DialogTitle sx={{ borderBottom: '1px solid #eeeaf3', pb: 1.5 }}><Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}><Typography component="span" variant="h6" fontWeight={600}>Business analysis</Typography><Button type="button" size="small" startIcon={<DownloadRounded />} onClick={downloadAnalysis}>Download PDF</Button></Stack></DialogTitle><DialogContent dividers sx={{ bgcolor: '#fbfaff' }}><Stack gap={1.25} sx={{ py: .5 }}>
      <Box className="business-analysis-dialog-section"><Typography className="business-context-label">30-second elevator pitch</Typography><Typography fontSize="var(--fs-14)" lineHeight={1.7}>{analysis.elevatorPitch}</Typography></Box>
      <Box className="business-analysis-dialog-section"><Typography className="business-context-label">Business model</Typography><Typography fontSize="var(--fs-14)" lineHeight={1.7}><strong>{analysis.businessModel.classification}</strong> — {analysis.businessModel.reasoning}</Typography></Box>
      <Box className="business-analysis-dialog-section"><Typography className="business-context-label">Business/product stage</Typography><Typography fontSize="var(--fs-14)" lineHeight={1.7}><strong>{analysis.businessStage.classification}</strong> — {analysis.businessStage.reasoning}</Typography></Box>
      <Box className="business-analysis-dialog-section"><Typography className="business-context-label">Core product or service</Typography><Typography fontSize="var(--fs-14)" lineHeight={1.7}>{analysis.coreProductOrService}</Typography></Box>
      <Box className="business-analysis-dialog-section"><Typography className="business-context-label">Ideal customer profile</Typography>{Object.entries(analysis.idealCustomerProfile).map(([key, value]) => <Typography key={key} fontSize="var(--fs-14)" lineHeight={1.7}><strong>{humanize(key)}:</strong> {value}</Typography>)}</Box>
      <Box className="business-analysis-dialog-section"><Typography className="business-context-label">ICP pain points</Typography>{Object.entries(analysis.icpPainPoints).map(([key, values]) => <Box key={key} sx={{ mt: .75 }}><Typography className="business-context-sub-label">{humanize(key)}</Typography>{Array.isArray(values) && values.map((value) => <Typography key={value} className="business-analysis-bullet" fontSize="var(--fs-14)">{value}</Typography>)}</Box>)}</Box>
      <Box className="business-analysis-dialog-section"><Typography className="business-context-label">Customer goals</Typography>{analysis.customerGoals.map((value) => <Typography key={value} className="business-analysis-bullet" fontSize="var(--fs-14)">{value}</Typography>)}</Box>
      <Box className="business-analysis-dialog-section"><Typography className="business-context-label">Value proposition</Typography>{analysis.valueProposition.map((value) => <Typography key={value} className="business-analysis-bullet" fontSize="var(--fs-14)">{value}</Typography>)}</Box>
      <Box className="business-analysis-dialog-section"><Typography className="business-context-label">Objections and barriers</Typography>{analysis.objectionsAndBarriers.map((value) => <Typography key={value} className="business-analysis-bullet" fontSize="var(--fs-14)">{value}</Typography>)}</Box>
      <Box className="business-analysis-dialog-section"><Typography className="business-context-label">Messaging recommendations</Typography>{Object.entries(analysis.messagingRecommendations).map(([key, values]) => <Box key={key} sx={{ mt: .75 }}><Typography className="business-context-sub-label">{humanize(key)}</Typography>{values.map((value) => <Typography key={value} className="business-analysis-bullet" fontSize="var(--fs-14)">{value}</Typography>)}</Box>)}</Box>
    </Stack></DialogContent></Dialog>}
  </Box>;
}

/** Identity and environment for the active Project. */
export default function ProjectDetailsPanel({ showHeading = true }: { showHeading?: boolean } = {}) {
  const { active } = useActiveProject();
  const { data: project, isPending } = useProject(active?.id);
  const updateProject = useUpdateProject(active?.id);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saved, setSaved] = useState(false);
  const [idCopied, setIdCopied] = useState(false);
  const [error, setError] = useState<string>();

  // Load the server's values once they arrive, and again when the Project
  // changes, so switching Projects never leaves the previous one's text behind.
  useEffect(() => {
    if (!project) return;
    setName(project.name);
    setDescription(project.description ?? '');
    setSaved(false);
    setError(undefined);
  }, [project]);

  // Only an owner or admin may change these; the backend enforces it too.
  const canEdit = project?.role === 'owner' || project?.role === 'admin';
  // Loading is not a reason to disable: until the Project arrives the fields are placeholders of the same size.
  const disabled = updateProject.isPending || !canEdit;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(undefined);
    setSaved(false);

    try {
      await updateProject.mutateAsync({
        name: name.trim(),
        // Empty means "no note", which the backend stores as null.
        description: description.trim() || null,
      });
      setSaved(true);
    } catch (cause) {
      setError((cause as ApiError).message ?? 'Could not save. Please try again.');
    }
  };

  return (
    <Stack gap={2.5}>
      {showHeading && <Box>
        <Typography variant="h3">Project details</Typography>
        <Typography color="text.secondary" fontSize="var(--fs-12)">Basic identity and environment settings for the active Project.</Typography>
      </Box>}
      <Card className="saas-card">
        <Box component="form" onSubmit={submit}>
          <Stack gap={3}>
            {error && <Alert severity="error">{error}</Alert>}
            {saved && <Alert severity="success">Project updated.</Alert>}
            {project && !canEdit && (
              <Alert severity="info">Your role on this Project does not allow changing these settings.</Alert>
            )}

            {isPending ? (
              <>
                <Skeleton variant="rounded" height={40} />
                <Skeleton variant="rounded" height={40} />
                <Skeleton variant="rounded" height={88} />
                <Skeleton variant="rounded" width={128} height={40} />
              </>
            ) : (
              <>
            <TextField label="Project name" value={name} onChange={(e) => setName(e.target.value)} disabled={disabled} />
            {/* The slug is assigned at creation and is not editable. */}
            <Stack direction="row" gap={1} alignItems="center">
              <TextField label="Project ID" value={project?.slug ?? ''} fullWidth InputProps={{ readOnly: true }} />
              <Button
                startIcon={<ContentCopyRounded />}
                disabled={!project?.slug}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(project?.slug ?? '');
                    setIdCopied(true);
                    window.setTimeout(() => setIdCopied(false), 2000);
                  } catch { /* clipboard blocked: nothing copied */ }
                }}
              >
                {idCopied ? 'Copied' : 'Copy'}
              </Button>
            </Stack>
            <TextField label="Description" value={description} onChange={(e) => setDescription(e.target.value)} disabled={disabled} multiline minRows={3} />
            <SubmitButton type="submit" variant="contained" pending={updateProject.isPending} disabled={disabled || !name.trim()} sx={{ alignSelf: 'flex-start' }}>
              Save changes
            </SubmitButton>
            <AccountProfile section="company" embedded showCompanyHeading={false} />
            <BusinessContextPanel projectId={active?.id} />
              </>
            )}
          </Stack>
        </Box>
      </Card>
    </Stack>
  );
}
