'use client';

import {
  AddRounded,
  ArrowBackRounded,
  ArrowForwardRounded,
  AutoAwesomeRounded,
  CheckRounded,
  ChevronLeftRounded,
  CodeRounded,
  ContentCopyRounded,
  DesktopWindowsRounded,
  DragIndicatorRounded,
  FormatColorFillRounded,
  GridViewRounded,
  ImageRounded,
  MobileFriendlyRounded,
  MoreHorizRounded,
  PlayArrowRounded,
  PreviewRounded,
  RedoRounded,
  SettingsRounded,
  SmartphoneRounded,
  TextFieldsRounded,
  TuneRounded,
  UndoRounded,
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
  MenuItem,
  Paper,
  Radio,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

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
  { name: 'Clean newsletter', category: 'Lead generation', accent: '#7339db', kind: 'split' },
  { name: 'First order discount', category: 'Offers', accent: '#0ea5e9', kind: 'center' },
  { name: 'Event countdown', category: 'Event sign-up', accent: '#f97316', kind: 'tall' },
  { name: 'Product waitlist', category: 'Lead generation', accent: '#10b981', kind: 'split' },
];

export default function FormCreateWorkspace() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('details');
  const [name, setName] = useState('');
  const [formType, setFormType] = useState<FormType>('popup');
  const [selectedGroups, setSelectedGroups] = useState<string[]>(['All subscribers']);
  const [selectedTemplate, setSelectedTemplate] = useState('Clean newsletter');

  const stepIndex = ['details', 'audience', 'design', 'behaviour', 'setup'].indexOf(step === 'editor' ? 'design' : step);
  const selectedType = useMemo(() => typeOptions.find((option) => option.value === formType)!, [formType]);

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
        <Box><Stack direction="row" gap={.75} alignItems="center" sx={{ mb: .75 }}><Button component="a" href="/dashboard/forms" size="small" startIcon={<ArrowBackRounded />} sx={{ pl: 0 }}>Forms</Button><Typography color="text.disabled">/</Typography><Typography variant="body2" color="text.secondary">New form</Typography></Stack><Typography variant="h1" className="dashboard-title" sx={{ fontSize: '30px !important' }}>Create a form</Typography><Typography color="text.secondary">Build an experience that feels native to your product.</Typography></Box>
        <Stack direction="row" gap={1} alignItems="center"><Typography variant="body2" color="text.secondary">Step {stepIndex + 1} of 5</Typography><Box sx={{ width: 118, height: 6, borderRadius: 3, background: '#e8e1f2' }}><Box sx={{ width: `${((stepIndex + 1) / 5) * 100}%`, height: '100%', borderRadius: 3, background: '#6e3cc8', transition: 'width .2s' }} /></Box></Stack>
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
  return <Stack direction={{ xs: 'column', sm: 'row' }} gap={{ xs: .75, sm: 0 }} sx={{ mb: 2.5, p: .75, border: '1px solid #eae6ef', borderRadius: 2, background: '#fff' }}>{steps.map((item, index) => <Stack key={item.id} direction="row" alignItems="center" gap={.85} sx={{ flex: 1, px: { xs: 1, sm: 1.25 }, py: .8, color: index <= currentIndex ? '#5126a2' : '#938a9f', borderRadius: 1.25, background: index === currentIndex ? '#f3edfc' : 'transparent' }}><Box sx={{ width: 24, height: 24, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: '50%', color: index < currentIndex ? '#fff' : index === currentIndex ? '#fff' : '#8b8199', background: index < currentIndex ? '#7444df' : index === currentIndex ? '#7444df' : '#eeeaf3', fontSize: 12, fontWeight: 700 }}>{index < currentIndex ? <CheckRounded sx={{ fontSize: 16 }} /> : index + 1}</Box><Typography variant="body2" sx={{ fontWeight: index === currentIndex ? 700 : 500, whiteSpace: { sm: 'nowrap' } }}>{item.label}</Typography></Stack>)}</Stack>;
}

function DetailsStep({ name, setName, formType, setFormType }: { name: string; setName: (value: string) => void; formType: FormType; setFormType: (value: FormType) => void }) {
  return <Paper sx={{ p: { xs: 2, md: 3.5 }, border: '1px solid #eae6ef', borderRadius: 2, background: '#fff' }}><Typography variant="h2" sx={{ mb: .5 }}>Form details</Typography><Typography color="text.secondary" sx={{ mb: 3 }}>Start a new form by entering a name and choosing the form type.</Typography><TextField fullWidth label="Form name" placeholder="e.g. Spring product launch" value={name} onChange={(event) => setName(event.target.value)} helperText="This name is only visible to your team and can be changed later." sx={{ maxWidth: 680, mb: 3 }} /><Typography variant="subtitle2" sx={{ mb: 1 }}>Type</Typography><Stack gap={1}>{typeOptions.map((option) => { const selected = option.value === formType; const Icon = option.icon; return <Card key={option.value} onClick={() => setFormType(option.value)} sx={{ p: 1.7, cursor: 'pointer', border: selected ? '2px solid #8eddbc' : '1px solid #ded8e7', background: selected ? '#edfbf5' : '#fff', transition: 'border .15s, background .15s' }}><Stack direction="row" gap={1.5} alignItems="center"><Radio checked={selected} value={option.value} onChange={() => setFormType(option.value)} sx={{ p: 0, color: '#b9b1c1', '&.Mui-checked': { color: '#14b878' } }} /><Box sx={{ width: 38, height: 38, display: 'grid', placeItems: 'center', borderRadius: 1.25, color: selected ? '#11865c' : '#695d76', background: selected ? '#d5f4e5' : '#f3f0f6' }}><Icon fontSize="small" /></Box><Box><Typography sx={{ fontWeight: 700 }}>{option.title}</Typography><Typography variant="body2" color="text.secondary">{option.description}</Typography></Box></Stack></Card>; })}</Stack></Paper>;
}

function AudienceStep({ selectedGroups, setSelectedGroups }: { selectedGroups: string[]; setSelectedGroups: (value: string[]) => void }) {
  const allSelected = selectedGroups.length === groups.length;
  const toggle = (name: string) => setSelectedGroups(selectedGroups.includes(name) ? selectedGroups.filter((item) => item !== name) : [...selectedGroups, name]);
  return <Paper sx={{ p: { xs: 2, md: 3.5 }, border: '1px solid #eae6ef', borderRadius: 2, background: '#fff' }}><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={1}><Box><Typography variant="h2" sx={{ mb: .5 }}>Subscriber groups</Typography><Typography color="text.secondary">Choose where new subscribers from this form should be added.</Typography></Box><Button variant="outlined" startIcon={<AddRounded />}>Add new group</Button></Stack><Divider sx={{ my: 2.5 }} /><FormControlLabel control={<Checkbox checked={allSelected} onChange={() => setSelectedGroups(allSelected ? [] : groups.map((group) => group.name))} />} label={<Typography sx={{ fontWeight: 700 }}>Select all groups</Typography>} /><Stack sx={{ mt: 1 }} gap={1}>{groups.map((group) => <Box key={group.name} onClick={() => toggle(group.name)} sx={{ display: 'flex', alignItems: 'center', gap: 1.25, p: 1.5, cursor: 'pointer', border: selectedGroups.includes(group.name) ? '1px solid #bda8e7' : '1px solid #eae6ef', borderRadius: 1.25, background: selectedGroups.includes(group.name) ? '#faf8ff' : '#fff' }}><Checkbox checked={selectedGroups.includes(group.name)} onChange={() => toggle(group.name)} onClick={(event) => event.stopPropagation()} /><Box sx={{ flex: 1 }}><Typography sx={{ fontWeight: 700 }}>{group.name}</Typography><Typography variant="body2" color="text.secondary">{group.description}</Typography></Box><Chip label={`${group.count.toLocaleString()} subscribers`} size="small" sx={{ display: { xs: 'none', sm: 'flex' }, background: '#f3f0f7', color: '#655a71' }} /></Box>)}</Stack></Paper>;
}

function DesignStep({ selectedTemplate, setSelectedTemplate, formType }: { selectedTemplate: string; setSelectedTemplate: (value: string) => void; formType: FormType }) {
  const [category, setCategory] = useState('All templates');
  const categories = ['All templates', 'Event sign-up', 'Lead generation', 'Offers', 'Resource sharing', 'Spin to win'];
  const filtered = templates.filter((template) => category === 'All templates' || template.category === category);
  return <Paper sx={{ p: { xs: 2, md: 3 }, border: '1px solid #eae6ef', borderRadius: 2, background: '#fff' }}><Stack direction={{ xs: 'column', lg: 'row' }} gap={3}><Box sx={{ width: { lg: 175 }, flexShrink: 0 }}><Typography variant="h2" sx={{ mb: .5 }}>Choose a design</Typography><Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Start from scratch or use a ready-made template.</Typography><Stack gap={.5}>{categories.map((item) => <Button key={item} onClick={() => setCategory(item)} variant={category === item ? 'contained' : 'text'} size="small" sx={{ justifyContent: 'flex-start', color: category === item ? '#fff' : '#625a6e' }}>{item}<Typography component="span" sx={{ ml: 'auto', fontSize: 11, opacity: .7 }}>{item === 'All templates' ? templates.length + 1 : item === 'Lead generation' ? 14 : 4}</Typography></Button>)}</Stack></Box><Box sx={{ flex: 1 }}><Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}><Box><Typography sx={{ fontWeight: 750 }}>Templates for {formType === 'popup' ? 'pop-ups' : formType === 'embedded' ? 'embedded forms' : 'promotions'}</Typography><Typography variant="body2" color="text.secondary">Pick a starting point and customise everything in the editor.</Typography></Box><TextField size="small" placeholder="Search templates" sx={{ display: { xs: 'none', md: 'block' }, width: 190 }} /></Stack><Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5 }}><TemplateCard blank selected={selectedTemplate === 'Blank canvas'} onClick={() => setSelectedTemplate('Blank canvas')} />{filtered.map((template) => <TemplateCard key={template.name} template={template} selected={selectedTemplate === template.name} onClick={() => setSelectedTemplate(template.name)} />)}</Box></Box></Stack></Paper>;
}

function TemplateCard({ blank, template, selected, onClick }: { blank?: boolean; template?: typeof templates[number]; selected: boolean; onClick: () => void }) {
  const accent = template?.accent ?? '#7550c9';
  return <Box onClick={onClick} sx={{ cursor: 'pointer', border: selected ? '2px solid #7444df' : '1px solid #eae6ef', borderRadius: 1.5, overflow: 'hidden', background: '#fff', '&:hover': { borderColor: '#b79ee8' } }}><Box sx={{ height: 164, display: 'grid', placeItems: 'center', background: blank ? '#faf9fb' : `${accent}18`, position: 'relative' }}>{blank ? <Stack alignItems="center" gap={1}><Box sx={{ width: 46, height: 46, display: 'grid', placeItems: 'center', borderRadius: 1.5, border: '1px dashed #bbb0c8', color: '#8b7a99' }}><AddRounded /></Box><Typography variant="body2" sx={{ fontWeight: 700 }}>Start from scratch</Typography><Typography variant="caption" color="text.secondary">Blank canvas</Typography></Stack> : <PreviewMockup accent={accent} tall={template?.kind === 'tall'} />}{selected && <Chip label="Selected" size="small" icon={<CheckRounded />} sx={{ position: 'absolute', top: 10, right: 10, color: '#4c2695', background: '#f0e9ff', fontWeight: 700 }} />}</Box><Box sx={{ px: 1.5, py: 1.25 }}><Typography sx={{ fontWeight: 700 }}>{blank ? 'Blank canvas' : template?.name}</Typography>{!blank && <Typography variant="caption" color="text.secondary">{template?.category}</Typography>}</Box></Box>;
}

function PreviewMockup({ accent, tall }: { accent: string; tall?: boolean }) { return <Box sx={{ width: tall ? 88 : 190, height: tall ? 126 : 88, display: 'flex', gap: 1, p: 1.1, borderRadius: .75, background: '#fff', boxShadow: '0 8px 20px rgba(37,19,55,.12)' }}>{!tall && <Box sx={{ width: '34%', borderRadius: .4, background: `linear-gradient(145deg, ${accent}, #241438)` }} />}<Box sx={{ flex: 1, py: .6 }}><Box sx={{ width: '68%', height: 7, mb: .8, borderRadius: 2, background: '#241438' }} /><Box sx={{ width: '92%', height: 4, mb: .55, borderRadius: 2, background: '#ded9e5' }} /><Box sx={{ width: '80%', height: 4, mb: 1.2, borderRadius: 2, background: '#ded9e5' }} /><Box sx={{ width: '100%', height: 17, borderRadius: .5, background: '#f3f0f6' }} /><Box sx={{ width: '100%', height: 14, mt: .8, borderRadius: .5, background: accent }} /></Box></Box>; }

function FormEditor({ formName, formType, onBack, onDone }: { formName: string; formType: FormType; onBack: () => void; onDone: () => void }) {
  const [panel, setPanel] = useState<'design' | 'settings'>('design');
  const [activeTab, setActiveTab] = useState<'form' | 'success'>('form');
  const [showMobile, setShowMobile] = useState(true);
  const [rounded, setRounded] = useState(true);
  const [shadow, setShadow] = useState(true);
  const [added, setAdded] = useState<string[]>([]);
  const elements = [{ label: 'Heading', icon: TextFieldsRounded }, { label: 'Text', icon: TextFieldsRounded }, { label: 'Image', icon: ImageRounded }, { label: 'Image & text', icon: WidgetsRounded }, { label: 'Button', icon: PlayArrowRounded }, { label: 'Divider', icon: MoreHorizRounded }, { label: 'Countdown', icon: TuneRounded }, { label: 'Social icons', icon: MobileFriendlyRounded }, { label: 'Code', icon: CodeRounded }];
  return <Box sx={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', flexDirection: 'column', background: '#f3f1f5' }}><Box sx={{ height: 58, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: { xs: 1.5, md: 2.5 }, background: '#241d2f', color: '#fff' }}><Button onClick={onBack} startIcon={<ArrowBackRounded />} sx={{ color: '#ddd4e8' }}>Back to setup</Button><Stack direction="row" gap={.5}><ToggleButtonGroup value={activeTab} exclusive onChange={(_, value) => value && setActiveTab(value)} size="small" sx={{ '& .MuiToggleButton-root': { color: '#bdb1cc', borderColor: '#544860', px: 1.5, '&.Mui-selected': { color: '#fff', background: '#5c4c6e' } } }}><ToggleButton value="form">{formType === 'popup' ? 'Pop-up' : 'Form'}</ToggleButton><ToggleButton value="success">Success message</ToggleButton></ToggleButtonGroup></Stack><Stack direction="row" gap={1}><Button startIcon={<PreviewRounded />} sx={{ color: '#ded5e8' }}>Preview</Button><Button onClick={onDone} variant="contained" sx={{ background: '#10c779', '&:hover': { background: '#0daa68' } }}>Done editing</Button></Stack></Box><Box sx={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: { xs: '72px 1fr 260px', md: '248px 1fr 290px' } }}><Box sx={{ minWidth: 0, overflowY: 'auto', borderRight: '1px solid #e3dde9', background: '#fff' }}><Box sx={{ p: 2, borderBottom: '1px solid #ece7f0' }}><Typography variant="h3">Elements</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: .4 }}>Combine blocks to build your form.</Typography></Box><Box sx={{ p: { xs: .75, md: 1.5 } }}>{elements.map(({ label, icon: Icon }) => <Button key={label} fullWidth onClick={() => setAdded((current) => current.includes(label) ? current : [...current, label])} sx={{ justifyContent: { xs: 'center', md: 'flex-start' }, minHeight: 38, px: 1, color: '#44374f', '&:hover': { background: '#f5f1fa' } }} startIcon={<Icon sx={{ fontSize: 17 }} />}>{<span className="form-editor-element-label">{label}</span>}</Button>)}</Box><Box sx={{ display: { xs: 'none', md: 'block' }, p: 2, mt: 2, borderTop: '1px solid #ece7f0' }}><Typography variant="caption" color="text.secondary">Tip</Typography><Typography variant="body2" sx={{ mt: .5, lineHeight: 1.6 }}>Keep your headline clear and ask for only the information you need.</Typography></Box></Box><Box sx={{ minWidth: 0, overflow: 'auto', display: 'grid', placeItems: 'center', p: { xs: 2, md: 5 }, background: 'linear-gradient(145deg, #dedbe0 0%, #f6f5f7 55%, #d9d7dc 100%)' }}><Box sx={{ width: showMobile ? 420 : 620, maxWidth: '96%', minHeight: 290, display: 'flex', overflow: 'hidden', borderRadius: rounded ? 2 : 0, background: '#fff', boxShadow: shadow ? '0 20px 55px rgba(40,27,56,.23)' : 'none', transition: 'width .2s, border-radius .2s' }}>{activeTab === 'success' ? <Box sx={{ width: '100%', display: 'grid', placeItems: 'center', p: 4 }}><Box><Typography variant="h2">Thank you!</Typography><Typography color="text.secondary" sx={{ mt: .75 }}>You have successfully joined our subscriber list.</Typography></Box></Box> : <><Box sx={{ width: showMobile ? 0 : '38%', display: { xs: 'none', sm: showMobile ? 'none' : 'block' }, background: 'linear-gradient(145deg,#281b3d,#8058c9)' }} /><Box sx={{ flex: 1, p: { xs: 2.5, md: 4 } }}><Typography variant="h2" sx={{ fontSize: { xs: 22, md: 28 } }}>{formName}</Typography><Typography color="text.secondary" sx={{ mt: .65, mb: 2.5 }}>Get product updates, helpful resources, and fresh ideas in your inbox.</Typography>{added.includes('Text') && <Typography variant="body2" sx={{ mb: 1.5 }}>Join our community and stay in the loop.</Typography>}<TextField fullWidth placeholder="Email address" size="small" sx={{ mb: 1.25 }} />{added.includes('Image & text') && <TextField fullWidth placeholder="Your name" size="small" sx={{ mb: 1.25 }} />}<Button fullWidth variant="contained" sx={{ background: '#743bd4', minHeight: 42 }}>Subscribe</Button><Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1.5, textAlign: 'center' }}>By subscribing, you agree to receive updates from PixlPush.</Typography></Box></>}</Box></Box><Box sx={{ minWidth: 0, overflowY: 'auto', borderLeft: '1px solid #e3dde9', background: '#fff' }}><Tabs value={panel} onChange={(_, value) => setPanel(value)} variant="fullWidth"><Tab value="design" label="Design" /><Tab value="settings" label="Settings" /></Tabs>{panel === 'design' ? <EditorDesignPanel showMobile={showMobile} setShowMobile={setShowMobile} rounded={rounded} setRounded={setRounded} shadow={shadow} setShadow={setShadow} /> : <EditorSettingsPanel />}</Box></Box></Box>;
}

function EditorDesignPanel({ showMobile, setShowMobile, rounded, setRounded, shadow, setShadow }: { showMobile: boolean; setShowMobile: (value: boolean) => void; rounded: boolean; setRounded: (value: boolean) => void; shadow: boolean; setShadow: (value: boolean) => void }) {
  return <Box sx={{ p: 2 }}>{[<Stack key="type" direction="row" justifyContent="space-between" alignItems="center"><Typography variant="subtitle2">Form type</Typography><Stack direction="row" gap={.5}>{['▣', '▥', '▰', '▤'].map((item, index) => <IconButton key={item} size="small" sx={{ color: index === 0 ? '#7444df' : '#8e879a', background: index === 0 ? '#f1ebfb' : 'transparent' }}>{item}</IconButton>)}</Stack></Stack>, <ControlRow key="width" label="Width"><Typography variant="body2" color="text.secondary">420px</Typography></ControlRow>, <ControlRow key="background" label="Background"><Box sx={{ width: 20, height: 20, borderRadius: .5, background: '#ffffff', border: '1px solid #d9d3e1' }} /></ControlRow>, <ControlRow key="image" label="Image"><Button size="small" variant="outlined" startIcon={<ImageRounded />}>Add image</Button></ControlRow>, <ControlRow key="corners" label="Rounded corners"><Switch checked={rounded} onChange={(event) => setRounded(event.target.checked)} size="small" /></ControlRow>, <ControlRow key="shadow" label="Shadow"><Switch checked={shadow} onChange={(event) => setShadow(event.target.checked)} size="small" /></ControlRow>, <Divider key="divider" sx={{ my: 2 }} />, <Typography key="layout-title" variant="subtitle2">Form layout</Typography>, <ToggleButtonGroup key="layout" exclusive fullWidth value={showMobile ? 'centered' : 'split'} onChange={(_, value) => value && setShowMobile(value === 'centered')} size="small" sx={{ mt: 1, mb: 2 }}><ToggleButton value="centered">Centered</ToggleButton><ToggleButton value="split">Split</ToggleButton></ToggleButtonGroup>, <Typography key="footer" variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.6 }}>Customize colors, spacing, and content from the preview.</Typography>]}</Box>;
}

function ControlRow({ label, children }: { label: string; children: React.ReactNode }) { return <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ py: 1.25 }}><Typography variant="body2" sx={{ fontWeight: 650 }}>{label}</Typography>{children}</Stack>; }

function EditorSettingsPanel() {
  const options = ['Privacy policy', 'Confirmation checkbox', 'Hidden segmentation field', 'Marketing permissions', 'Interest groups', 'Custom success page', 'reCAPTCHA'];
  return <Box sx={{ p: 2 }}><Typography variant="overline" color="text.secondary">Form settings</Typography>{options.map((option, index) => <Box key={option} sx={{ display: 'flex', gap: 1, py: 1.05 }}><Checkbox size="small" sx={{ p: 0, mt: .15 }} /><Box><Typography variant="body2" sx={{ fontWeight: 700 }}>{option}</Typography><Typography variant="caption" color="text.secondary">{index === 0 ? 'Add a privacy statement.' : index === 1 ? 'Add user consent to your signup form.' : index === 2 ? 'Add a hidden field for segmentation.' : index === 6 ? 'Help prevent spam signups.' : 'Customize this signup experience.'}</Typography></Box></Box>)}</Box>;
}

function BehaviourStep() {
  const [wait, setWait] = useState(true);
  const [scroll, setScroll] = useState(false);
  const [exitIntent, setExitIntent] = useState(false);
  const [frequency, setFrequency] = useState('1');
  const [frequencyUnit, setFrequencyUnit] = useState('months');
  const [schedule, setSchedule] = useState('immediately');
  const [visibility, setVisibility] = useState('always');

  return <Paper sx={{ p: { xs: 2, md: 3.5 }, border: '1px solid #eae6ef', borderRadius: 2, background: '#fff' }}>
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
    <Stack gap={1}>{[['immediately', 'None', 'Form activates immediately.'], ['specific', 'Specific time', 'Schedule a start and end time.']].map(([value, title, description]) => <Box key={value} onClick={() => setSchedule(value)} sx={{ display: 'flex', alignItems: 'center', gap: 1.2, p: 1.35, cursor: 'pointer', border: schedule === value ? '1px solid #8eddbc' : '1px solid #eae6ef', borderRadius: 1.25, background: schedule === value ? '#edfbf5' : '#fff' }}><Radio checked={schedule === value} onChange={() => setSchedule(value)} sx={{ p: 0, color: '#b8afc0', '&.Mui-checked': { color: '#14b878' } }} /><Box><Typography variant="body2" sx={{ fontWeight: 700 }}>{title}</Typography><Typography variant="caption" color="text.secondary">{description}</Typography></Box></Box>)}</Stack>
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
  return <Box className="form-create-workspace" sx={{ pb: 5 }}><Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1 }}><Button onClick={onBack} startIcon={<ArrowBackRounded />} sx={{ pl: 0 }}>Back to editor</Button></Stack><Typography variant="h1" className="dashboard-title" sx={{ fontSize: '30px !important' }}>Publish your form</Typography><Typography color="text.secondary" sx={{ mb: 2.5 }}>One last step: add PixlPush to your website so {formName} can start collecting subscribers.</Typography><Paper sx={{ p: { xs: 2, md: 3 }, border: '1px solid #eae6ef', borderRadius: 2, background: '#fff' }}><Stack direction="row" gap={1.5} alignItems="flex-start"><Box sx={{ width: 42, height: 42, display: 'grid', placeItems: 'center', flexShrink: 0, borderRadius: 1.5, color: '#14825b', background: '#e7f6ef' }}><CheckRounded /></Box><Box><Typography variant="h2" sx={{ fontSize: 20 }}>Your {formType === 'popup' ? 'pop-up' : formType === 'embedded' ? 'embedded form' : 'promotion'} is ready</Typography><Typography color="text.secondary" sx={{ mt: .5 }}>Copy the tracking snippet below and paste it before the closing <code>&lt;/head&gt;</code> tag on every page where this form should appear.</Typography></Box></Stack><Box sx={{ position: 'relative', mt: 3, p: 2, pr: 7, overflow: 'auto', borderRadius: 1.25, background: '#251d2d', color: '#eae4f2', fontFamily: 'monospace', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{snippet}<IconButton onClick={copySnippet} aria-label="Copy tracking snippet" sx={{ position: 'absolute', top: 8, right: 8, color: '#d8cbe8', background: '#42354d', '&:hover': { background: '#554464' } }}>{copied ? <CheckRounded fontSize="small" /> : <ContentCopyRounded fontSize="small" />}</IconButton></Box><Alert severity="info" sx={{ mt: 2, borderRadius: 1.5 }}>This frontend preview saves your form as a draft. Connect the Forms API to publish it across your project.</Alert></Paper><Stack direction="row" justifyContent="space-between" sx={{ mt: 2.5 }}><Button onClick={onBack} startIcon={<ArrowBackRounded />}>Back</Button><Button variant="contained" onClick={onFinish} endIcon={<ArrowForwardRounded />}>Return to forms</Button></Stack></Box>;
}
