'use client';

import {
  AddRounded,
  ArrowBackRounded,
  ArrowForwardRounded,
  AutoAwesomeRounded,
  CheckRounded,
  CodeRounded,
  ContentCopyRounded,
  DeleteOutlineRounded,
  DragIndicatorRounded,
  ExpandMoreRounded,
  GridViewRounded,
  ImageRounded,
  MobileFriendlyRounded,
  MoreHorizRounded,
  PlayArrowRounded,
  PreviewRounded,
  SearchRounded,
  SettingsBackupRestoreRounded,
  TextFieldsRounded,
  TuneRounded,
  ViewSidebarRounded,
  WidgetsRounded,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  Checkbox,
  Chip,
  Divider,
  FormControlLabel,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Radio,
  Stack,
  Slider,
  Switch,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type FormType = 'popup' | 'embedded' | 'promotion';
type Step = 'details' | 'audience' | 'design' | 'editor' | 'behaviour' | 'setup';

const typeOptions: Array<{ value: FormType; title: string; description: string; icon: typeof ViewSidebarRounded }> = [
  { value: 'popup', title: 'Pop-up', description: 'Convert website visitors into subscribers with a focused overlay.', icon: ViewSidebarRounded },
  { value: 'embedded', title: 'Embedded form', description: 'Add a signup form to a landing page, footer, or content block.', icon: GridViewRounded },
  { value: 'promotion', title: 'Promotion', description: 'Deliver a timely offer with a lightweight website message.', icon: AutoAwesomeRounded },
];

const groups = [
  { name: 'All subscribers', count: 1284, description: 'Everyone who signs up through PixlPush forms' },
  { name: 'Product updates', count: 312, description: 'People interested in product news and releases' },
  { name: 'Early access', count: 84, description: 'High-intent subscribers from launch campaigns' },
];

const templates = [
  { name: 'Clean newsletter', category: 'Lead generation', accent: 'var(--pp-accent)', kind: 'split' },
  { name: 'First order discount', category: 'Offers', accent: 'var(--pp-info)', kind: 'center' },
  { name: 'Event countdown', category: 'Event sign-up', accent: 'var(--pp-series-2)', kind: 'tall' },
  { name: 'Product waitlist', category: 'Lead generation', accent: 'var(--pp-series-3)', kind: 'split' },
];

export default function FormCreateWorkspace() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('details');
  const [name, setName] = useState('');
  const [formType, setFormType] = useState<FormType>('popup');
  const [selectedGroups, setSelectedGroups] = useState<string[]>(['All subscribers']);
  const [selectedTemplate, setSelectedTemplate] = useState('Clean newsletter');

  const stepIndex = ['details', 'audience', 'design', 'behaviour', 'setup'].indexOf(step === 'editor' ? 'design' : step);
  if (step === 'editor') {
    return <FormEditor formName={name || 'Untitled form'} formType={formType} onBack={() => setStep('design')} onDone={() => setStep('behaviour')} />;
  }
  if (step === 'setup') {
    return <FormSetup formName={name || 'Untitled form'} formType={formType} onBack={() => setStep('editor')} onFinish={() => router.push('/dashboard/forms')} />;
  }

  const next = () => {
    if (step === 'details') setStep('audience');
    else if (step === 'audience') setStep('design');
    else if (step === 'design') setStep('editor');
    else if (step === 'behaviour') setStep('setup');
  };

  const previous = step === 'audience' ? 'details' : step === 'design' ? 'audience' : step === 'behaviour' ? 'design' : 'details';

  return (
    <Box className="form-create-workspace" sx={{ pb: 5 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} gap={2} sx={{ mb: 2.5 }}>
        <Box><Stack direction="row" gap={.75} alignItems="center" sx={{ mb: .75 }}><Button component="a" href="/dashboard/forms" size="small" startIcon={<ArrowBackRounded />} sx={{ pl: 0 }}>Forms</Button><Typography color="text.disabled">/</Typography><Typography variant="body2" color="text.secondary">New form</Typography></Stack><Typography variant="h1" className="dashboard-title">Create a form</Typography><Typography color="text.secondary">Build an experience that feels native to your product.</Typography></Box>
        <Stack direction="row" gap={1} alignItems="center"><Typography variant="body2" color="text.secondary">Step {stepIndex + 1} of 5</Typography><Box sx={{ width: 118, height: 6, borderRadius: 3, background: 'var(--pp-border)' }}><Box sx={{ width: `${((stepIndex + 1) / 5) * 100}%`, height: '100%', borderRadius: 3, background: 'var(--pp-accent)', transition: 'width var(--pp-ease)' }} /></Box></Stack>
      </Stack>

      <Stepper current={step} />

      {step === 'details' && <DetailsStep name={name} setName={setName} formType={formType} setFormType={setFormType} />}
      {step === 'audience' && <AudienceStep selectedGroups={selectedGroups} setSelectedGroups={setSelectedGroups} />}
      {step === 'design' && <DesignStep selectedTemplate={selectedTemplate} setSelectedTemplate={setSelectedTemplate} formType={formType} />}
      {step === 'behaviour' && <BehaviourStep />}

      <Stack direction="row" justifyContent="space-between" sx={{ mt: 2.5 }}>
        <Button variant="text" onClick={() => step === 'details' ? router.push('/dashboard/forms') : setStep(previous)} startIcon={step !== 'details' ? <ArrowBackRounded /> : undefined}>{step === 'details' ? 'Cancel' : 'Back'}</Button>
        <Button variant="contained" disabled={step === 'details' && !name.trim()} onClick={next} endIcon={<ArrowForwardRounded />}>{step === 'design' ? 'Open editor' : step === 'behaviour' ? 'Save changes' : 'Save and continue'}</Button>
      </Stack>
    </Box>
  );
}

function Stepper({ current }: { current: Step }) {
  const steps: Array<{ id: Step; label: string }> = [{ id: 'details', label: 'Form details' }, { id: 'audience', label: 'Subscriber groups' }, { id: 'design', label: 'Content & design' }, { id: 'behaviour', label: 'Behaviour' }, { id: 'setup', label: 'Setup' }];
  const currentIndex = steps.findIndex((step) => step.id === current);
  return <Stack direction={{ xs: 'column', sm: 'row' }} gap={{ xs: .75, sm: 0 }} sx={{ mb: 2.5, p: .75, border: '1px solid var(--pp-border)', borderRadius: 2, background: 'var(--pp-surface)' }}>{steps.map((item, index) => <Stack key={item.id} direction="row" alignItems="center" gap={.85} sx={{ flex: 1, px: { xs: 1, sm: 1.25 }, py: .8, color: index <= currentIndex ? 'var(--pp-accent)' : 'var(--pp-text-3)', borderRadius: 1.25, background: index === currentIndex ? 'var(--pp-accent-soft)' : 'transparent' }}><Box sx={{ width: 24, height: 24, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: '50%', color: index < currentIndex || index === currentIndex ? 'var(--pp-surface)' : 'var(--pp-text-3)', background: index < currentIndex || index === currentIndex ? 'var(--pp-accent)' : 'var(--pp-subtle)', fontSize: 12, fontWeight: 600 }}>{index < currentIndex ? <CheckRounded sx={{ fontSize: 16 }} /> : index + 1}</Box><Typography variant="body2" sx={{ fontWeight: index === currentIndex ? 600 : 500, whiteSpace: { sm: 'nowrap' } }}>{item.label}</Typography></Stack>)}</Stack>;
}

function DetailsStep({ name, setName, formType, setFormType }: { name: string; setName: (value: string) => void; formType: FormType; setFormType: (value: FormType) => void }) {
  return <Paper sx={{ p: { xs: 2, md: 3.5 } }}><Typography variant="h2" sx={{ mb: .5 }}>Form details</Typography><Typography color="text.secondary" sx={{ mb: 3 }}>Start a new form by entering a name and choosing the form type.</Typography><TextField fullWidth label="Form name" placeholder="e.g. Spring product launch" value={name} onChange={(event) => setName(event.target.value)} helperText="This name is only visible to your team and can be changed later." sx={{ maxWidth: 680, mb: 3 }} /><Typography variant="subtitle2" sx={{ mb: 1 }}>Type</Typography><Stack gap={1}>{typeOptions.map((option) => { const selected = option.value === formType; const Icon = option.icon; return <Card key={option.value} onClick={() => setFormType(option.value)} sx={{ p: 1.7, cursor: 'pointer', border: selected ? '2px solid var(--pp-accent-line)' : '1px solid var(--pp-border)', background: selected ? 'var(--pp-accent-soft)' : 'var(--pp-surface)', transition: 'border var(--pp-ease), background var(--pp-ease)' }}><Stack direction="row" gap={1.5} alignItems="center"><Radio checked={selected} value={option.value} onChange={() => setFormType(option.value)} sx={{ p: 0, color: 'var(--pp-text-3)', '&.Mui-checked': { color: 'var(--pp-accent)' } }} /><Box sx={{ width: 38, height: 38, display: 'grid', placeItems: 'center', borderRadius: 1.25, color: selected ? 'var(--pp-accent)' : 'var(--pp-text-2)', background: selected ? 'var(--pp-surface)' : 'var(--pp-subtle)' }}><Icon fontSize="small" /></Box><Box><Typography sx={{ fontWeight: 600 }}>{option.title}</Typography><Typography variant="body2" color="text.secondary">{option.description}</Typography></Box></Stack></Card>; })}</Stack></Paper>;
}

function AudienceStep({ selectedGroups, setSelectedGroups }: { selectedGroups: string[]; setSelectedGroups: (value: string[]) => void }) {
  const allSelected = selectedGroups.length === groups.length;
  const toggle = (name: string) => setSelectedGroups(selectedGroups.includes(name) ? selectedGroups.filter((item) => item !== name) : [...selectedGroups, name]);
  return <Paper sx={{ p: { xs: 2, md: 3.5 } }}><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={1}><Box><Typography variant="h2" sx={{ mb: .5 }}>Subscriber groups</Typography><Typography color="text.secondary">Choose where new subscribers from this form should be added.</Typography></Box><Button variant="outlined" startIcon={<AddRounded />}>Add new group</Button></Stack><Divider sx={{ my: 2.5 }} /><FormControlLabel control={<Checkbox checked={allSelected} onChange={() => setSelectedGroups(allSelected ? [] : groups.map((group) => group.name))} />} label={<Typography sx={{ fontWeight: 600 }}>Select all groups</Typography>} /><Stack sx={{ mt: 1 }} gap={1}>{groups.map((group) => <Box key={group.name} onClick={() => toggle(group.name)} sx={{ display: 'flex', alignItems: 'center', gap: 1.25, p: 1.5, cursor: 'pointer', border: selectedGroups.includes(group.name) ? '1px solid var(--pp-accent-line)' : '1px solid var(--pp-border)', borderRadius: 1.25, background: selectedGroups.includes(group.name) ? 'var(--pp-accent-soft)' : 'var(--pp-surface)' }}><Checkbox checked={selectedGroups.includes(group.name)} onChange={() => toggle(group.name)} onClick={(event) => event.stopPropagation()} /><Box sx={{ flex: 1 }}><Typography sx={{ fontWeight: 600 }}>{group.name}</Typography><Typography variant="body2" color="text.secondary">{group.description}</Typography></Box><Chip label={`${group.count.toLocaleString()} subscribers`} size="small" sx={{ display: { xs: 'none', sm: 'flex' } }} /></Box>)}</Stack></Paper>;
}

function DesignStep({ selectedTemplate, setSelectedTemplate, formType }: { selectedTemplate: string; setSelectedTemplate: (value: string) => void; formType: FormType }) {
  const [category, setCategory] = useState('All templates');
  const [search, setSearch] = useState('');
  const categories = ['All templates', 'Event sign-up', 'Lead generation', 'Offers', 'Resource sharing', 'Spin to win'];
  const filtered = templates.filter((template) => (category === 'All templates' || template.category === category) && template.name.toLowerCase().includes(search.toLowerCase()));
  const formTypeLabel = formType === 'popup' ? 'pop-ups' : formType === 'embedded' ? 'embedded forms' : 'promotions';

  return <Paper sx={{ p: { xs: 2, md: 3.25 } }}>
    <Stack direction={{ xs: 'column', lg: 'row' }} gap={{ xs: 3, lg: 4 }}>
      <Box sx={{ width: { lg: 190 }, flexShrink: 0 }}>
        <Stack direction="row" gap={1.25} alignItems="center" sx={{ mb: 1.25 }}>
          <Box sx={{ width: 38, height: 38, display: 'grid', placeItems: 'center', borderRadius: 1.25, color: 'var(--pp-accent)', background: 'var(--pp-accent-soft)' }}><TuneRounded fontSize="small" /></Box>
          <Box><Typography variant="h2" sx={{ fontSize: 20 }}>Choose a design</Typography><Typography variant="caption" color="text.secondary">Step 3 of 5</Typography></Box>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.25 }}>Start with a ready-made layout or create a custom form from a blank canvas.</Typography>
        <Typography variant="overline" color="text.secondary">Browse templates</Typography>
        <Stack gap={.5} sx={{ mt: .65 }}>
          {categories.map((item) => <Button key={item} onClick={() => setCategory(item)} variant={category === item ? 'contained' : 'text'} size="small" sx={{ minHeight: 38, px: 1.25, justifyContent: 'flex-start', color: category === item ? 'var(--pp-surface)' : 'var(--pp-text-2)', background: category === item ? 'var(--pp-accent)' : 'transparent', '&:hover': { background: category === item ? 'var(--pp-accent-hover)' : 'var(--pp-subtle)' } }}>{item}<Typography component="span" sx={{ ml: 'auto', fontSize: 11, color: category === item ? 'inherit' : 'var(--pp-text-3)', opacity: .85 }}>{item === 'All templates' ? templates.length + 1 : item === 'Lead generation' ? 14 : 4}</Typography></Button>)}
        </Stack>
        <Box sx={{ mt: 2.5, p: 1.5, border: '1px solid var(--pp-accent-line)', borderRadius: 1.5, background: 'var(--pp-accent-soft)' }}><Typography variant="body2" sx={{ fontWeight: 600 }}>Need full control?</Typography><Typography variant="caption" color="text.secondary">Start from scratch and build every section yourself.</Typography></Box>
      </Box>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={1.5} sx={{ mb: 2.25 }}>
          <Box><Typography variant="h3" sx={{ fontSize: 17 }}>Templates for {formTypeLabel}</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: .35 }}>Pick a starting point and customise everything in the editor.</Typography></Box>
          <TextField value={search} onChange={(event) => setSearch(event.target.value)} size="small" placeholder="Search templates" aria-label="Search templates" sx={{ width: { xs: '100%', sm: 220 } }} InputProps={{ startAdornment: <InputAdornment position="start"><SearchRounded sx={{ color: 'var(--pp-text-3)', fontSize: 18 }} /></InputAdornment> }} />
        </Stack>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 1.75 }}>
          <TemplateCard blank selected={selectedTemplate === 'Blank canvas'} onClick={() => setSelectedTemplate('Blank canvas')} />
          {filtered.map((template) => <TemplateCard key={template.name} template={template} selected={selectedTemplate === template.name} onClick={() => setSelectedTemplate(template.name)} />)}
        </Box>
        {filtered.length === 0 && <Box sx={{ mt: 1.75, p: 4, textAlign: 'center', border: '1px dashed var(--pp-border-strong)', borderRadius: 1.5, background: 'var(--pp-subtle)' }}><Typography sx={{ fontWeight: 600 }}>No templates found</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: .5 }}>Try another search or choose a different category.</Typography></Box>}
      </Box>
    </Stack>
  </Paper>;
}

function TemplateCard({ blank, template, selected, onClick }: { blank?: boolean; template?: typeof templates[number]; selected: boolean; onClick: () => void }) {
  const accent = template?.accent ?? 'var(--pp-accent)';
  return <Box onClick={onClick} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onClick(); }} sx={{ cursor: 'pointer', border: selected ? '2px solid var(--pp-accent)' : '1px solid var(--pp-border)', borderRadius: 1.75, overflow: 'hidden', background: 'var(--pp-surface)', transition: 'border-color var(--pp-ease), background-color var(--pp-ease)', '&:hover': { borderColor: 'var(--pp-accent-line)', background: 'var(--pp-subtle)' }, '&:focus-visible': { outline: '2px solid var(--pp-accent)', outlineOffset: 2 } }}>
    <Box sx={{ height: { xs: 174, md: 188 }, display: 'grid', placeItems: 'center', background: blank ? 'var(--pp-accent-soft)' : 'var(--pp-subtle)', position: 'relative' }}>
      {blank ? <BlankCanvasPreview /> : <PreviewMockup accent={accent} tall={template?.kind === 'tall'} />}
      {selected && <Chip label="Selected" size="small" icon={<CheckRounded />} sx={{ position: 'absolute', top: 10, right: 10, color: 'var(--pp-accent)', background: 'var(--pp-surface)', '& .MuiChip-icon': { color: 'var(--pp-accent)' } }} />}
    </Box>
    <Box sx={{ px: 1.75, py: 1.5, borderTop: '1px solid var(--pp-border)' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}><Box><Typography sx={{ fontWeight: 600 }}>{blank ? 'Start from scratch' : template?.name}</Typography><Typography variant="caption" color="text.secondary">{blank ? 'Blank canvas · Custom layout' : template?.category}</Typography></Box><ArrowForwardRounded sx={{ mt: .25, fontSize: 18, color: selected ? 'var(--pp-accent)' : 'var(--pp-text-3)' }} /></Stack>
    </Box>
  </Box>;
}

function BlankCanvasPreview() {
  return <Box sx={{ width: '72%', maxWidth: 230, p: 1.4, border: '1px solid var(--pp-border-strong)', borderRadius: 1.5, background: 'var(--pp-surface)' }}><Stack alignItems="center" gap={.8}><Box sx={{ width: 42, height: 42, display: 'grid', placeItems: 'center', border: '1px dashed var(--pp-accent-line)', borderRadius: 1.25, color: 'var(--pp-accent)', background: 'var(--pp-accent-soft)' }}><AddRounded /></Box><Box sx={{ width: '48%', height: 7, borderRadius: 2, background: 'var(--pp-text)' }} /><Box sx={{ width: '74%', height: 4, borderRadius: 2, background: 'var(--pp-border-strong)' }} /><Box sx={{ width: '62%', height: 4, borderRadius: 2, background: 'var(--pp-border-strong)' }} /><Box sx={{ width: '82%', height: 22, mt: .25, border: '1px dashed var(--pp-border-strong)', borderRadius: .75, background: 'var(--pp-subtle)' }} /></Stack></Box>;
}

function PreviewMockup({ accent, tall }: { accent: string; tall?: boolean }) { return <Box sx={{ width: tall ? 92 : 206, height: tall ? 136 : 102, display: 'flex', gap: 1, p: 1.25, border: '1px solid var(--pp-border)', borderRadius: 1.25, background: 'var(--pp-surface)' }}>{!tall && <Box sx={{ width: '32%', borderRadius: .6, background: accent }} />}<Box sx={{ flex: 1, py: .6 }}><Box sx={{ width: '66%', height: 7, mb: .8, borderRadius: 2, background: 'var(--pp-text)' }} /><Box sx={{ width: '92%', height: 4, mb: .55, borderRadius: 2, background: 'var(--pp-border-strong)' }} /><Box sx={{ width: '76%', height: 4, mb: 1.2, borderRadius: 2, background: 'var(--pp-border-strong)' }} /><Box sx={{ width: '100%', height: 20, borderRadius: .6, background: 'var(--pp-subtle)' }} /><Box sx={{ width: '100%', height: 15, mt: .8, borderRadius: .6, background: accent }} /></Box></Box>; }

type FormElementType = 'Heading' | 'Text' | 'Image' | 'Image & text' | 'Button' | 'Divider' | 'Countdown' | 'Social icons' | 'Code';

type FormElement = {
  id: string;
  type: FormElementType;
  content: string;
};

type SelectedEditorTarget =
  | { kind: 'form' }
  | { kind: 'title' }
  | { kind: 'field'; name: string }
  | { kind: 'submit' }
  | { kind: 'element'; id: string };

type PopupType = 'centered' | 'left' | 'right' | 'top' | 'bottom';
type PopupStyle = 'default' | 'boxed';
type ImagePosition = 'fit' | 'fill';

const elementContent: Record<FormElementType, string> = {
  Heading: 'Your headline goes here',
  Text: 'Add supporting text to explain your offer or newsletter.',
  Image: 'Add an image',
  'Image & text': 'Tell your story with a visual and a short message.',
  Button: 'Learn more',
  Divider: '',
  Countdown: 'Offer ends in',
  'Social icons': 'Social links',
  Code: '<div>Your custom code</div>',
};

const editorElements: Array<{ label: FormElementType; icon: typeof TextFieldsRounded }> = [
  { label: 'Heading', icon: TextFieldsRounded },
  { label: 'Text', icon: TextFieldsRounded },
  { label: 'Image', icon: ImageRounded },
  { label: 'Image & text', icon: WidgetsRounded },
  { label: 'Button', icon: PlayArrowRounded },
  { label: 'Divider', icon: MoreHorizRounded },
  { label: 'Countdown', icon: TuneRounded },
  { label: 'Social icons', icon: MobileFriendlyRounded },
  { label: 'Code', icon: CodeRounded },
];

function FormEditor({ formName, formType, onBack, onDone }: { formName: string; formType: FormType; onBack: () => void; onDone: () => void }) {
  const [panel, setPanel] = useState<'design' | 'settings'>('design');
  const [activeTab, setActiveTab] = useState<'form' | 'success'>('form');
  const [titleText, setTitleText] = useState(formName);
  const [layout, setLayout] = useState<'centered' | 'split'>('centered');
  const [popupType, setPopupType] = useState<PopupType>('centered');
  const [popupStyle, setPopupStyle] = useState<PopupStyle>('default');
  const [formWidth, setFormWidth] = useState(420);
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [hasImage, setHasImage] = useState(false);
  const [sidebarBackground, setSidebarBackground] = useState('#eeeeee');
  const [sidebarImage, setSidebarImage] = useState<string | null>(null);
  const [sidebarImagePosition, setSidebarImagePosition] = useState<ImagePosition>('fit');
  const [includeSidebarText, setIncludeSidebarText] = useState(false);
  const [showOnMobile, setShowOnMobile] = useState(true);
  const [backdropColor, setBackdropColor] = useState('#0a0a0a');
  const [backdropOpacity, setBackdropOpacity] = useState(20);
  const [cornerRadius, setCornerRadius] = useState(8);
  const [rounded, setRounded] = useState(true);
  const [shadow, setShadow] = useState(true);
  const [elements, setElements] = useState<FormElement[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<SelectedEditorTarget>({ kind: 'form' });
  const [buttonLabel, setButtonLabel] = useState('Subscribe');
  const [formFields, setFormFields] = useState(['Email']);
  const [showLabels, setShowLabels] = useState(false);
  const [privacyPolicy, setPrivacyPolicy] = useState(false);
  const [confirmationCheckbox, setConfirmationCheckbox] = useState(false);
  const [hiddenSegmentation, setHiddenSegmentation] = useState(false);
  const [marketingPermissions, setMarketingPermissions] = useState(false);
  const [interestGroups, setInterestGroups] = useState(false);
  const [recaptcha, setRecaptcha] = useState(false);
  const [successAction, setSuccessAction] = useState<'view' | 'url'>('view');

  const addElement = (type: FormElementType) => {
    const id = `${type}-${Date.now()}-${elements.length}`;
    setElements((current) => [...current, { id, type, content: elementContent[type] }]);
    setSelectedTarget({ kind: 'element', id });
    setPanel('design');
  };

  const removeElement = (id: string) => {
    setElements((current) => current.filter((element) => element.id !== id));
    setSelectedTarget({ kind: 'form' });
  };

  const updateElement = (id: string, content: string) => {
    setElements((current) => current.map((element) => element.id === id ? { ...element, content } : element));
  };

  const selectedElement = selectedTarget.kind === 'element' ? elements.find((element) => element.id === selectedTarget.id) : undefined;
  const selectTarget = (target: SelectedEditorTarget) => {
    setSelectedTarget(target);
    setPanel('design');
  };

  return <Box className="form-editor-workspace" sx={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', flexDirection: 'column', background: 'var(--pp-canvas)' }}>
    <Box className="form-editor-topbar">
      <Stack className="form-editor-topbar-start" direction="row" alignItems="center" gap={{ xs: .75, md: 1.5 }}>
        <Button onClick={onBack} startIcon={<ArrowBackRounded />} sx={{ color: 'var(--pp-border-strong)', whiteSpace: 'nowrap' }}>Back to setup</Button>
        <Box className="form-editor-topbar-separator" />
        <Box className="form-editor-topbar-name" sx={{ minWidth: 0 }}><Typography variant="overline" sx={{ display: 'block', color: 'var(--pp-text-3)', fontSize: 9, lineHeight: 1.1, letterSpacing: '.12em' }}>FORM BUILDER</Typography><Typography variant="body2" noWrap sx={{ maxWidth: { xs: 100, md: 220 }, color: 'var(--pp-surface)', fontWeight: 600 }}>{formName}</Typography></Box>
      </Stack>
      <ToggleButtonGroup className="form-editor-mode-tabs" value={activeTab} exclusive onChange={(_, value) => value && setActiveTab(value)} size="small" aria-label="Form editor view"><ToggleButton value="form">Subscribe form</ToggleButton><ToggleButton value="success">Success message</ToggleButton></ToggleButtonGroup>
      <Stack className="form-editor-topbar-actions" direction="row" gap={{ xs: .5, md: 1 }} alignItems="center"><Button startIcon={<PreviewRounded />} sx={{ color: 'var(--pp-border-strong)' }}>Preview</Button><Button onClick={onDone} variant="contained">Done editing</Button></Stack>
    </Box>
    <Box sx={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: { xs: '72px 1fr 290px', md: '248px 1fr 320px' } }}>
      <Box sx={{ minWidth: 0, overflowY: 'auto', borderRight: '1px solid var(--pp-border)', background: 'var(--pp-surface)' }}><Box sx={{ p: 2, borderBottom: '1px solid var(--pp-border)' }}><Typography variant="h3">Elements</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: .4 }}>Click an element to add it to your form.</Typography></Box><Box sx={{ p: { xs: .75, md: 1.5 } }}>{editorElements.map(({ label, icon: Icon }) => <Button key={label} fullWidth onClick={() => addElement(label)} sx={{ justifyContent: { xs: 'center', md: 'flex-start' }, minHeight: 38, px: 1, color: 'var(--pp-text-2)', '&:hover': { background: 'var(--pp-subtle)' } }} startIcon={<Icon sx={{ fontSize: 17 }} />}><span className="form-editor-element-label">{label}</span><Box component="span" sx={{ ml: 'auto', display: { xs: 'none', md: 'inline-flex' }, alignItems: 'center', color: 'var(--pp-text-3)' }}><AddRounded sx={{ fontSize: 16 }} /></Box></Button>)}</Box><Box sx={{ display: { xs: 'none', md: 'block' }, p: 2, mt: 2, borderTop: '1px solid var(--pp-border)' }}><Typography variant="caption" color="text.secondary">Tip</Typography><Typography variant="body2" sx={{ mt: .5, lineHeight: 1.6 }}>Add blocks to the canvas, then select them to edit from the right panel.</Typography></Box></Box>
      <Box sx={{ minWidth: 0, overflow: 'auto', display: 'grid', placeItems: 'center', p: { xs: 2, md: 5 }, background: `linear-gradient(${backdropColor}${Math.round(backdropOpacity * 2.55).toString(16).padStart(2, '0')}, ${backdropColor}${Math.round(backdropOpacity * 2.55).toString(16).padStart(2, '0')}), var(--pp-subtle)` }}><Box onClick={() => selectTarget({ kind: 'form' })} sx={{ width: layout === 'split' ? Math.max(formWidth, 620) : formWidth, maxWidth: '96%', minHeight: 290, display: 'flex', flexDirection: popupType === 'right' ? 'row-reverse' : popupType === 'top' || popupType === 'bottom' ? 'column' : 'row', overflow: 'hidden', position: 'relative', borderRadius: rounded ? cornerRadius : 0, backgroundColor, backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center', boxShadow: shadow ? '0 20px 55px rgba(30,20,41,.12)' : 'none', outline: selectedTarget.kind === 'form' ? '2px solid var(--pp-accent)' : '2px solid transparent', outlineOffset: 3, transition: 'width var(--pp-ease), border-radius var(--pp-ease), outline-color var(--pp-ease)', opacity: showOnMobile ? 1 : .72, border: popupStyle === 'boxed' ? '1px solid var(--pp-border-strong)' : 'none' }}>{activeTab === 'success' ? <Box sx={{ width: '100%', display: 'grid', placeItems: 'center', p: 4 }}><Box><Typography variant="h2">Thank you!</Typography><Typography color="text.secondary" sx={{ mt: .75 }}>You have successfully joined our subscriber list.</Typography></Box></Box> : <>{(layout === 'split' || popupType === 'left' || popupType === 'right') && <Box onClick={(event) => { event.stopPropagation(); selectTarget({ kind: 'form' }); }} sx={{ width: { xs: '32%', sm: hasImage ? '38%' : '32%' }, minHeight: popupType === 'top' || popupType === 'bottom' ? 74 : '100%', display: { xs: 'none', sm: 'block' }, backgroundColor: sidebarBackground, backgroundImage: sidebarImage ? `url(${sidebarImage})` : 'none', backgroundSize: sidebarImagePosition === 'fill' ? 'cover' : 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center', cursor: 'pointer', transition: 'width var(--pp-ease)' }} />}{(popupType === 'top' || popupType === 'bottom') && <Box onClick={(event) => event.stopPropagation()} sx={{ height: 54, backgroundColor: sidebarBackground, backgroundImage: sidebarImage ? `url(${sidebarImage})` : 'none', backgroundSize: sidebarImagePosition === 'fill' ? 'cover' : 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center', order: popupType === 'bottom' ? 2 : 1 }} />}{hasImage && layout === 'centered' && popupType === 'centered' && <Box onClick={(event) => event.stopPropagation()} sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 42, backgroundColor: sidebarBackground, backgroundImage: sidebarImage ? `url(${sidebarImage})` : 'none', backgroundSize: sidebarImagePosition === 'fill' ? 'cover' : 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }} />}{includeSidebarText && <Typography variant="caption" sx={{ position: 'absolute', left: 12, bottom: 10, color: 'var(--pp-surface)', textShadow: '0 1px 3px rgba(0,0,0,.35)' }}>Join the community</Typography>}<Box sx={{ flex: 1, p: { xs: 2.5, md: 4 }, backgroundColor: `${backgroundColor}eF` }}><Box onClick={(event) => { event.stopPropagation(); selectTarget({ kind: 'title' }); }} sx={{ cursor: 'pointer', outline: selectedTarget.kind === 'title' ? '2px solid var(--pp-accent)' : '2px solid transparent', outlineOffset: 3, borderRadius: 1 }}><Typography variant="h2" sx={{ fontSize: { xs: 22, md: 24 } }}>{titleText}</Typography></Box><Typography color="text.secondary" sx={{ mt: .65, mb: elements.length ? 2 : 2.5 }}>Get product updates, helpful resources, and fresh ideas in your inbox.</Typography>{elements.length > 0 && <Stack gap={1.25} sx={{ mb: 2.5 }}>{elements.map((element) => <FormEditorElement key={element.id} element={element} selected={selectedTarget.kind === 'element' && selectedTarget.id === element.id} onSelect={() => selectTarget({ kind: 'element', id: element.id })} onRemove={() => removeElement(element.id)} />)}</Stack>}<Stack gap={1.25}>{formFields.map((field) => <Box key={field} onClick={(event) => { event.stopPropagation(); selectTarget({ kind: 'field', name: field }); }} sx={{ outline: selectedTarget.kind === 'field' && selectedTarget.name === field ? '2px solid var(--pp-accent)' : '2px solid transparent', outlineOffset: 3, borderRadius: 1, cursor: 'pointer' }}><TextField fullWidth placeholder={showLabels ? undefined : field === 'Email' ? 'Email address' : field} label={showLabels ? field : undefined} size="small" InputProps={{ readOnly: true }} /></Box>)}<Box onClick={(event) => { event.stopPropagation(); selectTarget({ kind: 'submit' }); }} sx={{ outline: selectedTarget.kind === 'submit' ? '2px solid var(--pp-accent)' : '2px solid transparent', outlineOffset: 3, borderRadius: 1, cursor: 'pointer' }}><Button fullWidth variant="contained" sx={{ minHeight: 42 }}>{buttonLabel}</Button></Box></Stack><Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1.5, textAlign: 'center' }}>By subscribing, you agree to receive updates from PixlPush.</Typography></Box></>}</Box></Box>
      <Box sx={{ minWidth: 0, overflowY: 'auto', borderLeft: '1px solid var(--pp-border)', background: 'var(--pp-surface)' }}><Tabs value={panel} onChange={(_, value) => setPanel(value)} variant="fullWidth"><Tab value="design" label="Design" /><Tab value="settings" label="Settings" /></Tabs>{panel === 'design' ? <EditorDesignPanel selectedTarget={selectedTarget} selectedElement={selectedElement} onSelectForm={() => selectTarget({ kind: 'form' })} onUpdateElement={updateElement} onRemoveElement={removeElement} titleText={titleText} setTitleText={setTitleText} formWidth={formWidth} setFormWidth={setFormWidth} backgroundColor={backgroundColor} setBackgroundColor={setBackgroundColor} backgroundImage={backgroundImage} setBackgroundImage={setBackgroundImage} hasImage={hasImage} setHasImage={setHasImage} popupType={popupType} setPopupType={setPopupType} popupStyle={popupStyle} setPopupStyle={setPopupStyle} sidebarBackground={sidebarBackground} setSidebarBackground={setSidebarBackground} sidebarImage={sidebarImage} setSidebarImage={setSidebarImage} sidebarImagePosition={sidebarImagePosition} setSidebarImagePosition={setSidebarImagePosition} includeSidebarText={includeSidebarText} setIncludeSidebarText={setIncludeSidebarText} showOnMobile={showOnMobile} setShowOnMobile={setShowOnMobile} backdropColor={backdropColor} setBackdropColor={setBackdropColor} backdropOpacity={backdropOpacity} setBackdropOpacity={setBackdropOpacity} cornerRadius={cornerRadius} setCornerRadius={setCornerRadius} layout={layout} setLayout={setLayout} rounded={rounded} setRounded={setRounded} shadow={shadow} setShadow={setShadow} buttonLabel={buttonLabel} setButtonLabel={setButtonLabel} /> : <EditorSettingsPanel formFields={formFields} setFormFields={setFormFields} showLabels={showLabels} setShowLabels={setShowLabels} privacyPolicy={privacyPolicy} setPrivacyPolicy={setPrivacyPolicy} confirmationCheckbox={confirmationCheckbox} setConfirmationCheckbox={setConfirmationCheckbox} hiddenSegmentation={hiddenSegmentation} setHiddenSegmentation={setHiddenSegmentation} marketingPermissions={marketingPermissions} setMarketingPermissions={setMarketingPermissions} interestGroups={interestGroups} setInterestGroups={setInterestGroups} recaptcha={recaptcha} setRecaptcha={setRecaptcha} successAction={successAction} setSuccessAction={setSuccessAction} />}</Box>
    </Box>
  </Box>;
}

function FormEditorElement({ element, selected, onSelect, onRemove }: { element: FormElement; selected: boolean; onSelect: () => void; onRemove: () => void }) {
  const removeButton = <IconButton size="small" onClick={(event) => { event.stopPropagation(); onRemove(); }} aria-label={`Remove ${element.type}`} sx={{ position: 'absolute', top: 3, right: 3, color: selected ? 'var(--pp-accent)' : 'var(--pp-text-3)', background: 'var(--pp-surface)', '&:hover': { color: 'var(--pp-error)', background: 'var(--pp-error-soft)' } }}><DeleteOutlineRounded fontSize="small" /></IconButton>;
  const block = (children: React.ReactNode, sx?: object) => <Box onClick={(event) => { event.stopPropagation(); onSelect(); }} sx={{ position: 'relative', cursor: 'pointer', outline: selected ? '2px solid var(--pp-accent)' : '2px solid transparent', outlineOffset: 3, borderRadius: 1, transition: 'outline-color var(--pp-ease)', ...sx }}>{children}{removeButton}</Box>;

  if (element.type === 'Divider') return block(<Divider />, { py: 1.25 });
  if (element.type === 'Image') return block(<Stack alignItems="center" gap={.5}><ImageRounded sx={{ color: 'var(--pp-text-3)' }} /><Typography variant="caption" color="text.secondary">{element.content}</Typography></Stack>, { minHeight: 104, display: 'grid', placeItems: 'center', border: '1px dashed var(--pp-border-strong)', borderRadius: 1.25, background: 'var(--pp-subtle)' });
  if (element.type === 'Image & text') return block(<Stack direction="row" gap={1.25} alignItems="center" sx={{ p: 1.25 }}><Box sx={{ width: 78, height: 64, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 1, background: 'var(--pp-plum-soft)' }}><ImageRounded sx={{ color: 'var(--pp-accent)' }} /></Box><Box sx={{ minWidth: 0, pr: 3 }}><Typography variant="body2" sx={{ fontWeight: 600 }}>Image and text</Typography><Typography variant="caption" color="text.secondary">{element.content}</Typography></Box></Stack>, { border: '1px solid var(--pp-border)', borderRadius: 1.25, background: 'var(--pp-subtle)' });
  if (element.type === 'Button') return block(<Button fullWidth variant="contained" sx={{ minHeight: 40 }}>{element.content}</Button>, { py: .25, pr: 4 });
  if (element.type === 'Countdown') return block(<><Typography variant="caption" color="text.secondary">{element.content}</Typography><Stack direction="row" gap={.75} sx={{ mt: .75 }}><Box sx={{ flex: 1, py: .65, textAlign: 'center', borderRadius: .75, background: 'var(--pp-surface)' }}><Typography sx={{ fontWeight: 600 }}>02</Typography><Typography variant="caption" color="text.secondary">Days</Typography></Box><Box sx={{ flex: 1, py: .65, textAlign: 'center', borderRadius: .75, background: 'var(--pp-surface)' }}><Typography sx={{ fontWeight: 600 }}>14</Typography><Typography variant="caption" color="text.secondary">Hours</Typography></Box><Box sx={{ flex: 1, py: .65, textAlign: 'center', borderRadius: .75, background: 'var(--pp-surface)' }}><Typography sx={{ fontWeight: 600 }}>36</Typography><Typography variant="caption" color="text.secondary">Minutes</Typography></Box></Stack></>, { p: 1.25, border: '1px solid var(--pp-accent-line)', borderRadius: 1.25, background: 'var(--pp-accent-soft)' });
  if (element.type === 'Social icons') return block(<Stack direction="row" justifyContent="center" gap={1}><Box sx={{ width: 28, height: 28, display: 'grid', placeItems: 'center', borderRadius: '50%', color: 'var(--pp-surface)', background: 'var(--pp-plum)' }}>f</Box><Box sx={{ width: 28, height: 28, display: 'grid', placeItems: 'center', borderRadius: '50%', color: 'var(--pp-surface)', background: 'var(--pp-plum)' }}>in</Box><Box sx={{ width: 28, height: 28, display: 'grid', placeItems: 'center', borderRadius: '50%', color: 'var(--pp-surface)', background: 'var(--pp-plum)' }}>◎</Box></Stack>, { py: .5, pr: 4 });
  if (element.type === 'Code') return block(<Box sx={{ p: 1.25, pr: 4, color: 'var(--pp-surface)', background: 'var(--pp-plum)', fontFamily: 'var(--pp-mono)', fontSize: 11, lineHeight: 1.6 }}>{element.content}</Box>, { borderRadius: 1.25, overflow: 'hidden' });
  if (element.type === 'Heading') return block(<Typography variant="h3">{element.content}</Typography>, { pr: 4 });
  return block(<Typography variant="body2" color="text.secondary">{element.content}</Typography>, { pr: 4 });
}

type EditorDesignPanelProps = {
  selectedTarget: SelectedEditorTarget;
  selectedElement?: FormElement;
  onSelectForm: () => void;
  onUpdateElement: (id: string, content: string) => void;
  onRemoveElement: (id: string) => void;
  titleText: string;
  setTitleText: (value: string) => void;
  formWidth: number;
  setFormWidth: (value: number) => void;
  backgroundColor: string;
  setBackgroundColor: (value: string) => void;
  backgroundImage: string | null;
  setBackgroundImage: (value: string | null) => void;
  hasImage: boolean;
  setHasImage: (value: boolean) => void;
  popupType: PopupType;
  setPopupType: (value: PopupType) => void;
  popupStyle: PopupStyle;
  setPopupStyle: (value: PopupStyle) => void;
  sidebarBackground: string;
  setSidebarBackground: (value: string) => void;
  sidebarImage: string | null;
  setSidebarImage: (value: string | null) => void;
  sidebarImagePosition: ImagePosition;
  setSidebarImagePosition: (value: ImagePosition) => void;
  includeSidebarText: boolean;
  setIncludeSidebarText: (value: boolean) => void;
  showOnMobile: boolean;
  setShowOnMobile: (value: boolean) => void;
  backdropColor: string;
  setBackdropColor: (value: string) => void;
  backdropOpacity: number;
  setBackdropOpacity: (value: number) => void;
  cornerRadius: number;
  setCornerRadius: (value: number) => void;
  layout: 'centered' | 'split';
  setLayout: (value: 'centered' | 'split') => void;
  rounded: boolean;
  setRounded: (value: boolean) => void;
  shadow: boolean;
  setShadow: (value: boolean) => void;
  buttonLabel: string;
  setButtonLabel: (value: string) => void;
};

function EditorDesignPanel({ selectedTarget, selectedElement, onSelectForm, onUpdateElement, onRemoveElement, titleText, setTitleText, formWidth, setFormWidth, backgroundColor, setBackgroundColor, backgroundImage, setBackgroundImage, hasImage, setHasImage, popupType, setPopupType, popupStyle, setPopupStyle, sidebarBackground, setSidebarBackground, sidebarImage, setSidebarImage, sidebarImagePosition, setSidebarImagePosition, includeSidebarText, setIncludeSidebarText, showOnMobile, setShowOnMobile, backdropColor, setBackdropColor, backdropOpacity, setBackdropOpacity, cornerRadius, setCornerRadius, layout, setLayout, rounded, setRounded, shadow, setShadow, buttonLabel, setButtonLabel }: EditorDesignPanelProps) {
  const isFormSelected = selectedTarget.kind === 'form';
  const selectedLabel = selectedTarget.kind === 'title' ? 'Heading' : selectedTarget.kind === 'field' ? `${selectedTarget.name} field` : selectedTarget.kind === 'submit' ? 'Submit button' : selectedElement?.type;

  const updatePopupType = (value: PopupType) => {
    setPopupType(value);
    if (value === 'left' || value === 'right') setLayout('split');
    if (value === 'centered' || value === 'top' || value === 'bottom') setLayout('centered');
  };

  return <Box sx={{ p: 2 }}>
    {!isFormSelected && <Box sx={{ mb: 2, p: 1.5, border: '1px solid var(--pp-accent-line)', borderRadius: 1.5, background: 'var(--pp-accent-soft)' }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1} sx={{ mb: 1.25 }}><Box><Typography variant="subtitle2">Selected {selectedLabel}</Typography><Typography variant="caption" color="text.secondary">Edit this section from the controls below.</Typography></Box><Button size="small" onClick={onSelectForm}>Form</Button></Stack>
      {selectedTarget.kind === 'title' && <TextField fullWidth size="small" label="Heading text" value={titleText} onChange={(event) => setTitleText(event.target.value)} />}
      {selectedTarget.kind === 'field' && <TextField fullWidth size="small" label="Field name" value={selectedTarget.name} disabled helperText="Manage fields from Settings." />}
      {selectedTarget.kind === 'submit' && <TextField fullWidth size="small" label="Button text" value={buttonLabel} onChange={(event) => setButtonLabel(event.target.value)} />}
      {selectedTarget.kind === 'element' && selectedElement && <><TextField fullWidth size="small" multiline={selectedElement.type === 'Text' || selectedElement.type === 'Code'} minRows={selectedElement.type === 'Text' || selectedElement.type === 'Code' ? 3 : undefined} label={`${selectedElement.type} content`} value={selectedElement.content} onChange={(event) => onUpdateElement(selectedElement.id, event.target.value)} /><Button color="error" size="small" startIcon={<DeleteOutlineRounded />} onClick={() => onRemoveElement(selectedElement.id)} sx={{ mt: 1 }}>Remove element</Button></>}
    </Box>}

    <Typography variant="overline" color="text.secondary">Form design</Typography>
    <DesignSection title="Pop-up type">
      <Stack direction="row" gap={.5} sx={{ flexWrap: 'wrap' }}>
        {(['centered', 'left', 'right', 'top', 'bottom'] as PopupType[]).map((type) => <IconButton key={type} size="small" aria-label={`Pop-up type ${type}`} onClick={() => updatePopupType(type)} sx={{ width: 38, height: 38, borderRadius: 1, color: popupType === type ? 'var(--pp-accent)' : 'var(--pp-text-3)', background: popupType === type ? 'var(--pp-accent-soft)' : 'var(--pp-subtle)', border: popupType === type ? '1px solid var(--pp-accent-line)' : '1px solid transparent' }}><PopupTypeGlyph type={type} /></IconButton>)}
      </Stack>
    </DesignSection>
    <DesignSection title="Width" value={`${formWidth}px`}>
      <Slider aria-label="Form width" min={360} max={620} step={10} value={formWidth} onChange={(_, value) => setFormWidth(Array.isArray(value) ? value[0] : value)} valueLabelDisplay="auto" sx={{ color: 'var(--pp-accent)' }} />
    </DesignSection>
    <DesignSection title="Background style">
      <ColorControl label="Color" value={backgroundColor} onChange={setBackgroundColor} />
      <ImageControl label="Image" value={backgroundImage} onChange={(value) => { setBackgroundImage(value); setHasImage(Boolean(value) || Boolean(sidebarImage)); }} />
    </DesignSection>
    <DesignSection title="Corners" value={`${cornerRadius}px`}>
      <Slider aria-label="Corner radius" min={0} max={24} step={1} value={cornerRadius} onChange={(_, value) => { const next = Array.isArray(value) ? value[0] : value; setCornerRadius(next); setRounded(next > 0); }} valueLabelDisplay="auto" sx={{ color: 'var(--pp-accent)' }} />
    </DesignSection>
    <DesignSection title="Shadow"><Switch checked={shadow} onChange={(event) => setShadow(event.target.checked)} size="small" /></DesignSection>
    <Divider sx={{ my: 1.5 }} />
    <Typography variant="subtitle2" sx={{ mb: .5 }}>Pop-up layout</Typography>
    <DesignSection title="Layout"><LayoutGlyphs value={layout} onChange={(value) => { setLayout(value); if (value === 'split' && popupType === 'centered') setPopupType('left'); if (value === 'centered' && (popupType === 'left' || popupType === 'right')) setPopupType('centered'); }} /></DesignSection>
    <DesignSection title="Style"><ToggleButtonGroup exclusive size="small" value={popupStyle} onChange={(_, value) => value && setPopupStyle(value)}><ToggleButton value="default">Default</ToggleButton><ToggleButton value="boxed">Boxed</ToggleButton></ToggleButtonGroup></DesignSection>
    <Typography variant="subtitle2" sx={{ mt: 1.5, mb: .5 }}>Sidebar style</Typography>
    <DesignSection title="Background"><ColorControl label="Sidebar background" value={sidebarBackground} onChange={setSidebarBackground} /></DesignSection>
    <DesignSection title="Image"><ImageControl label="Sidebar image" value={sidebarImage} onChange={(value) => { setSidebarImage(value); setHasImage(Boolean(value) || Boolean(backgroundImage)); }} /></DesignSection>
    <DesignSection title="Position"><ToggleButtonGroup exclusive size="small" value={sidebarImagePosition} onChange={(_, value) => value && setSidebarImagePosition(value)}><ToggleButton value="fit">Fit</ToggleButton><ToggleButton value="fill">Fill</ToggleButton></ToggleButtonGroup></DesignSection>
    <ControlRow label="Include text"><Switch checked={includeSidebarText} onChange={(event) => setIncludeSidebarText(event.target.checked)} size="small" /></ControlRow>
    <ControlRow label="Show on mobile"><Switch checked={showOnMobile} onChange={(event) => setShowOnMobile(event.target.checked)} size="small" /></ControlRow>
    <Typography variant="subtitle2" sx={{ mt: 1.5, mb: .5 }}>Backdrop style</Typography>
    <DesignSection title="Color"><ColorControl label="Backdrop color" value={backdropColor} onChange={setBackdropColor} /></DesignSection>
    <DesignSection title="Opacity" value={`${backdropOpacity}%`}><Slider aria-label="Backdrop opacity" min={0} max={70} step={1} value={backdropOpacity} onChange={(_, value) => setBackdropOpacity(Array.isArray(value) ? value[0] : value)} valueLabelDisplay="auto" sx={{ color: 'var(--pp-accent)' }} /></DesignSection>
    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5, lineHeight: 1.6 }}>Select any block in the preview to edit its content and settings here.</Typography>
  </Box>;
}

function ControlRow({ label, children }: { label: string; children: React.ReactNode }) { return <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ py: 1.25 }}><Typography variant="body2" sx={{ fontWeight: 600 }}>{label}</Typography>{children}</Stack>; }

function DesignSection({ title, value, children }: { title: string; value?: string; children: React.ReactNode }) { return <Box sx={{ py: 1.35, borderBottom: '1px solid var(--pp-border)' }}><Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: children ? .85 : 0 }}><Typography variant="body2" sx={{ fontWeight: 600 }}>{title}</Typography>{value && <Typography variant="caption" color="text.secondary">{value}</Typography>}</Stack>{children}</Box>; }

function ColorControl({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1} sx={{ py: .55 }}><Typography variant="caption" color="text.secondary">{value.toUpperCase()}</Typography><Box component="label" sx={{ width: 30, height: 30, display: 'block', border: '1px solid var(--pp-border-strong)', borderRadius: 1, p: .35, cursor: 'pointer' }}><Box sx={{ width: '100%', height: '100%', borderRadius: .5, background: value }} /><input aria-label={label} type="color" value={value} onChange={(event) => onChange(event.target.value)} style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }} /></Box></Stack>; }

function ImageControl({ label, value, onChange }: { label: string; value: string | null; onChange: (value: string | null) => void }) {
  const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange(typeof reader.result === 'string' ? reader.result : null);
    reader.readAsDataURL(file);
    event.target.value = '';
  };
  return <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1} sx={{ py: .55 }}><Typography variant="caption" color="text.secondary">{value ? 'Image selected' : label}</Typography><Stack direction="row" gap={.5} alignItems="center"><Button component="label" size="small" variant="outlined" startIcon={<ImageRounded />} sx={{ minWidth: 0 }}>{value ? 'Change' : 'Add image'}<input hidden type="file" accept="image/*" aria-label={`Upload ${label}`} onChange={handleFile} /></Button>{value && <IconButton size="small" aria-label={`Remove ${label}`} onClick={() => onChange(null)}><DeleteOutlineRounded fontSize="small" /></IconButton>}</Stack></Stack>;
}

function PopupTypeGlyph({ type }: { type: PopupType }) { if (type === 'left') return <Box sx={{ width: 22, height: 20, border: '2px solid currentColor', borderRadius: .4, '&::before': { content: '""', display: 'block', width: 6, height: '100%', background: 'currentColor' } }} />; if (type === 'right') return <Box sx={{ width: 22, height: 20, border: '2px solid currentColor', borderRadius: .4, '&::after': { content: '""', display: 'block', ml: 'auto', width: 6, height: '100%', background: 'currentColor' } }} />; if (type === 'top') return <Box sx={{ width: 22, height: 20, border: '2px solid currentColor', borderRadius: .4, '&::before': { content: '""', display: 'block', width: '100%', height: 5, background: 'currentColor' } }} />; if (type === 'bottom') return <Box sx={{ width: 22, height: 20, border: '2px solid currentColor', borderRadius: .4, '&::after': { content: '""', display: 'block', mt: 1.1, width: '100%', height: 5, background: 'currentColor' } }} />; return <Box sx={{ width: 22, height: 20, border: '2px solid currentColor', borderRadius: .4 }} />; }

function LayoutGlyphs({ value, onChange }: { value: 'centered' | 'split'; onChange: (value: 'centered' | 'split') => void }) { return <Stack direction="row" gap={.5}>{(['centered', 'split'] as const).map((item) => <IconButton key={item} size="small" aria-label={`${item} layout`} onClick={() => onChange(item)} sx={{ color: value === item ? 'var(--pp-accent)' : 'var(--pp-text-3)', background: value === item ? 'var(--pp-accent-soft)' : 'transparent' }}>{item === 'centered' ? <SettingsBackupRestoreRounded fontSize="small" /> : <ViewSidebarRounded fontSize="small" />}</IconButton>)}</Stack>; }

type SettingsPanelProps = {
  formFields: string[];
  setFormFields: (value: string[]) => void;
  showLabels: boolean;
  setShowLabels: (value: boolean) => void;
  privacyPolicy: boolean;
  setPrivacyPolicy: (value: boolean) => void;
  confirmationCheckbox: boolean;
  setConfirmationCheckbox: (value: boolean) => void;
  hiddenSegmentation: boolean;
  setHiddenSegmentation: (value: boolean) => void;
  marketingPermissions: boolean;
  setMarketingPermissions: (value: boolean) => void;
  interestGroups: boolean;
  setInterestGroups: (value: boolean) => void;
  recaptcha: boolean;
  setRecaptcha: (value: boolean) => void;
  successAction: 'view' | 'url';
  setSuccessAction: (value: 'view' | 'url') => void;
};

function EditorSettingsPanel({
  formFields,
  setFormFields,
  showLabels,
  setShowLabels,
  privacyPolicy,
  setPrivacyPolicy,
  confirmationCheckbox,
  setConfirmationCheckbox,
  hiddenSegmentation,
  setHiddenSegmentation,
  marketingPermissions,
  setMarketingPermissions,
  interestGroups,
  setInterestGroups,
  recaptcha,
  setRecaptcha,
  successAction,
  setSuccessAction,
}: SettingsPanelProps) {
  const addField = () => {
    const nextField = formFields.includes('First name') ? 'Company' : 'First name';
    if (!formFields.includes(nextField)) setFormFields([...formFields, nextField]);
  };

  return (
    <Box className="form-editor-settings-panel" sx={{ p: 1.25 }}>
      <Typography variant="overline" color="text.secondary" sx={{ px: .75, letterSpacing: '.08em' }}>Form settings</Typography>

      <SettingsAccordion title="Form" subtitle="Fields and input labels" defaultExpanded>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: .75 }}>Fields</Typography>
        <Stack gap={.5}>
          {formFields.map((field) => (
            <Stack key={field} direction="row" alignItems="center" gap={.75} sx={{ minHeight: 34, px: .25 }}>
              <DragIndicatorRounded sx={{ fontSize: 17, color: 'var(--pp-text-3)' }} />
              <Typography variant="body2" sx={{ flex: 1 }}>{field}</Typography>
              {field !== 'Email' && <IconButton size="small" aria-label={`Remove ${field} field`} onClick={() => setFormFields(formFields.filter((item) => item !== field))} sx={{ color: 'var(--pp-text-3)' }}><DeleteOutlineRounded sx={{ fontSize: 16 }} /></IconButton>}
            </Stack>
          ))}
        </Stack>
        <Button size="small" variant="contained" onClick={addField} startIcon={<AddRounded />} sx={{ mt: 1.25 }}>Add field</Button>
        <SettingsSwitchRow label="Show labels above inputs" checked={showLabels} onChange={setShowLabels} sx={{ mt: 1.25 }} />
      </SettingsAccordion>

      <SettingsAccordion title="Options" subtitle="Consent, privacy, and subscriber preferences">
        <SettingsOption title="Privacy policy" description="Add a privacy statement." checked={privacyPolicy} onChange={setPrivacyPolicy}>
          <TextField fullWidth size="small" label="Privacy statement" placeholder="Read our privacy policy" multiline minRows={2} />
        </SettingsOption>
        <SettingsOption title="Confirmation checkbox" description="Add user consent to your signup form." checked={confirmationCheckbox} onChange={setConfirmationCheckbox}>
          <TextField fullWidth size="small" label="Consent text" defaultValue="I agree to receive updates from PixlPush." />
        </SettingsOption>
        <SettingsOption title="Marketing permissions" description="Customize your signup form to include marketing permissions." checked={marketingPermissions} onChange={setMarketingPermissions}>
          <Typography variant="caption" color="text.secondary">Subscribers can choose which types of marketing messages they want to receive.</Typography>
        </SettingsOption>
        <SettingsOption title="Interest groups" description="Let subscribers choose their own interest groups." checked={interestGroups} onChange={setInterestGroups}>
          <TextField fullWidth select size="small" label="Interest group" defaultValue="Product updates">
            <MenuItem value="Product updates">Product updates</MenuItem>
            <MenuItem value="Early access">Early access</MenuItem>
            <MenuItem value="Offers">Offers</MenuItem>
          </TextField>
        </SettingsOption>
        <SettingsOption title="Hidden segmentation field" description="Add a hidden field to segment your subscribers." checked={hiddenSegmentation} onChange={setHiddenSegmentation}>
          <TextField fullWidth size="small" label="Field value" placeholder="campaign_source" />
        </SettingsOption>
        <SettingsOption title="reCAPTCHA" description="Help prevent spam signups." checked={recaptcha} onChange={setRecaptcha}>
          <Alert severity="info" icon={false} sx={{ py: .5 }}>reCAPTCHA will appear on the published form.</Alert>
        </SettingsOption>
      </SettingsAccordion>

      <SettingsAccordion title="Success" subtitle="Choose what subscribers see after signup">
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: .75 }}>Action</Typography>
        <ToggleButtonGroup exclusive fullWidth value={successAction} onChange={(_, value) => value && setSuccessAction(value)} size="small" aria-label="Success action">
          <ToggleButton value="view">Success view</ToggleButton>
          <ToggleButton value="url">URL</ToggleButton>
        </ToggleButtonGroup>
        {successAction === 'view' ? (
          <Box sx={{ mt: 1.25, p: 1.25, border: '1px solid var(--pp-border)', borderRadius: 1.25, background: 'var(--pp-subtle)' }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>Edit the success view</Typography>
            <Typography variant="caption" color="text.secondary">Customize the confirmation message shown after a successful signup.</Typography>
          </Box>
        ) : <TextField fullWidth size="small" label="Redirect URL" placeholder="https://example.com/thanks" sx={{ mt: 1.25 }} />}
      </SettingsAccordion>
    </Box>
  );
}

function SettingsAccordion({ title, subtitle, children, defaultExpanded = false }: { title: string; subtitle: string; children: React.ReactNode; defaultExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <Box className="form-editor-settings-accordion">
      <Button
        fullWidth
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        aria-controls={`${title.toLowerCase()}-settings-content`}
        endIcon={<ExpandMoreRounded sx={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform var(--pp-ease)' }} />}
        sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: 58, px: 1.5, py: 1.1, textAlign: 'left', color: 'var(--pp-text)', borderRadius: 0, '&:hover': { background: 'var(--pp-subtle)' }, '& .MuiButton-endIcon': { marginLeft: 'auto', marginRight: 0, color: 'var(--pp-text-2)' } }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>{title}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subtitle}</Typography>
        </Box>
      </Button>
      {expanded && <Box id={`${title.toLowerCase()}-settings-content`} sx={{ px: 1.5, pb: 1.5, borderTop: '1px solid var(--pp-border)' }}>{children}</Box>}
    </Box>
  );
}

function SettingsSwitchRow({ label, checked, onChange, sx }: { label: string; checked: boolean; onChange: (value: boolean) => void; sx?: object }) {
  return <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1} sx={sx}><Typography variant="body2">{label}</Typography><Switch size="small" checked={checked} onChange={(event) => onChange(event.target.checked)} /></Stack>;
}

function SettingsOption({ title, description, checked, onChange, children }: { title: string; description: string; checked: boolean; onChange: (value: boolean) => void; children: React.ReactNode }) {
  return (
    <Box className="form-editor-settings-option" sx={{ py: 1.25 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
        <Box sx={{ minWidth: 0 }}><Typography variant="body2" sx={{ fontWeight: 600 }}>{title}</Typography><Typography variant="caption" color="text.secondary">{description}</Typography></Box>
        <Switch size="small" checked={checked} onChange={(event) => onChange(event.target.checked)} sx={{ mt: -.45, mr: -.5 }} />
      </Stack>
      {checked && <Box sx={{ pt: 1.25 }}>{children}</Box>}
    </Box>
  );
}

function BehaviourStep() {
  const [wait, setWait] = useState(true);
  const [scroll, setScroll] = useState(false);
  const [exitIntent, setExitIntent] = useState(false);
  const [frequency, setFrequency] = useState('1');
  const [frequencyUnit, setFrequencyUnit] = useState('months');
  const [schedule, setSchedule] = useState('immediately');
  const [visibility, setVisibility] = useState('always');

  return <Paper sx={{ p: { xs: 2, md: 3.5 } }}>
    <Typography variant="h2" sx={{ mb: .5 }}>Behaviour</Typography>
    <Typography color="text.secondary" sx={{ mb: 2.5 }}>Choose when your form should appear and who should see it.</Typography>
    <Typography variant="h3" sx={{ mb: .25 }}>Trigger</Typography>
    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25 }}>Choose when you want to show the form.</Typography>
    <Stack gap={.5}>
      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} gap={1}><FormControlLabel control={<Switch checked={wait} onChange={(event) => setWait(event.target.checked)} />} label="Wait" /><TextField size="small" value="5" disabled={!wait} sx={{ width: 72 }} inputProps={{ 'aria-label': 'Seconds before showing' }} /><Typography variant="body2" color="text.secondary">seconds before showing the form</Typography></Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} gap={1}><FormControlLabel control={<Switch checked={scroll} onChange={(event) => setScroll(event.target.checked)} />} label="Show when user scrolls" /><TextField select size="small" defaultValue="50%" disabled={!scroll} sx={{ width: 90 }} aria-label="Scroll percentage"><MenuItem value="25%">25%</MenuItem><MenuItem value="50%">50%</MenuItem><MenuItem value="75%">75%</MenuItem></TextField></Stack>
      <FormControlLabel control={<Switch checked={exitIntent} onChange={(event) => setExitIntent(event.target.checked)} />} label="Show before closing page (desktop only)" />
    </Stack>
    <Divider sx={{ my: 2.25 }} />
    <Typography variant="h3" sx={{ mb: .25 }}>Frequency</Typography>
    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25 }}>Set how often the same person should see this form again.</Typography>
    <Stack direction="row" gap={1}><TextField size="small" value={frequency} onChange={(event) => setFrequency(event.target.value)} sx={{ width: 72 }} aria-label="Frequency amount" /><TextField select size="small" value={frequencyUnit} onChange={(event) => setFrequencyUnit(event.target.value)} sx={{ width: 125 }} aria-label="Frequency unit"><MenuItem value="days">days</MenuItem><MenuItem value="weeks">weeks</MenuItem><MenuItem value="months">months</MenuItem></TextField></Stack>
    <Divider sx={{ my: 2.25 }} />
    <Typography variant="h3" sx={{ mb: .25 }}>Schedule</Typography>
    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25 }}>Set the timing of your form in advance.</Typography>
    <Stack gap={1}>{[['immediately', 'None', 'Form activates immediately.'], ['specific', 'Specific time', 'Schedule a start and end time.']].map(([value, title, description]) => <Box key={value} onClick={() => setSchedule(value)} sx={{ display: 'flex', alignItems: 'center', gap: 1.2, p: 1.35, cursor: 'pointer', border: schedule === value ? '1px solid var(--pp-accent-line)' : '1px solid var(--pp-border)', borderRadius: 1.25, background: schedule === value ? 'var(--pp-accent-soft)' : 'var(--pp-surface)' }}><Radio checked={schedule === value} onChange={() => setSchedule(value)} sx={{ p: 0, color: 'var(--pp-text-3)', '&.Mui-checked': { color: 'var(--pp-accent)' } }} /><Box><Typography variant="body2" sx={{ fontWeight: 600 }}>{title}</Typography><Typography variant="caption" color="text.secondary">{description}</Typography></Box></Box>)}</Stack>
    <Divider sx={{ my: 2.25 }} />
    <Typography variant="h3" sx={{ mb: .25 }}>Visibility</Typography>
    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25 }}>Choose where and on which devices this form should appear.</Typography>
    <Stack direction={{ xs: 'column', md: 'row' }} gap={3}><Stack gap={.5}>{[['always', 'Always show'], ['hide-pages', 'Hide on specific pages'], ['show-pages', 'Show on specific pages']].map(([value, label]) => <FormControlLabel key={value} control={<Radio checked={visibility === value} onChange={() => setVisibility(value)} />} label={label} />)}</Stack><Stack gap={.5}><FormControlLabel control={<Checkbox />} label="Hide on desktop devices" /><FormControlLabel control={<Checkbox />} label="Hide on mobile devices" /><FormControlLabel control={<Checkbox />} label="Hide on tablet devices" /></Stack></Stack>
  </Paper>;
}

function FormSetup({ formName, formType, onBack, onFinish }: { formName: string; formType: FormType; onBack: () => void; onFinish: () => void }) {
  const [copied, setCopied] = useState(false);
  const snippet = `<!-- PixlPush form: ${formName} -->\n<script src="https://cdn.pixlpush.com/forms.js" data-form="new-form"></script>`;
  const copySnippet = async () => { await navigator.clipboard?.writeText(snippet); setCopied(true); window.setTimeout(() => setCopied(false), 1800); };
  return <Box className="form-create-workspace" sx={{ pb: 5 }}><Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1 }}><Button onClick={onBack} startIcon={<ArrowBackRounded />} sx={{ pl: 0 }}>Back to editor</Button></Stack><Typography variant="h1" className="dashboard-title">Publish your form</Typography><Typography color="text.secondary" sx={{ mb: 2.5 }}>One last step: add PixlPush to your website so {formName} can start collecting subscribers.</Typography><Paper sx={{ p: { xs: 2, md: 3 } }}><Stack direction="row" gap={1.5} alignItems="flex-start"><Box sx={{ width: 42, height: 42, display: 'grid', placeItems: 'center', flexShrink: 0, borderRadius: 1.5, color: 'var(--pp-success)', background: 'var(--pp-success-soft)' }}><CheckRounded /></Box><Box><Typography variant="h2">Your {formType === 'popup' ? 'pop-up' : formType === 'embedded' ? 'embedded form' : 'promotion'} is ready</Typography><Typography color="text.secondary" sx={{ mt: .5 }}>Copy the tracking snippet below and paste it before the closing <code>&lt;/head&gt;</code> tag on every page where this form should appear.</Typography></Box></Stack><Box sx={{ position: 'relative', mt: 3, p: 2, pr: 7, overflow: 'auto', borderRadius: 1.25, background: 'var(--pp-plum)', color: 'var(--pp-surface)', fontFamily: 'var(--pp-mono)', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{snippet}<IconButton onClick={copySnippet} aria-label="Copy tracking snippet" sx={{ position: 'absolute', top: 8, right: 8, color: 'var(--pp-border-strong)', background: 'var(--pp-plum-soft)', '&:hover': { background: 'var(--pp-plum-line)' } }}>{copied ? <CheckRounded fontSize="small" /> : <ContentCopyRounded fontSize="small" />}</IconButton></Box><Alert severity="info" sx={{ mt: 2 }}>This frontend preview saves your form as a draft. Connect the Forms API to publish it across your project.</Alert></Paper><Stack direction="row" justifyContent="space-between" sx={{ mt: 2.5 }}><Button onClick={onBack} startIcon={<ArrowBackRounded />}>Back</Button><Button variant="contained" onClick={onFinish} endIcon={<ArrowForwardRounded />}>Return to forms</Button></Stack></Box>;
}
