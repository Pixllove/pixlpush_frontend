import NextLink from 'next/link';
import { alpha, createTheme } from '@mui/material/styles';

/**
 * PixlPush design tokens (DESIGN.md). Neutrals with a slight violet tint, one violet accent, semantic
 * colours for status only. Mirrored as `--pp-*` CSS variables in app/globals.css for class-based styles.
 */
export const tokens = {
  accent: '#5517B8',
  accentHover: '#4712A0',
  accentSoft: '#F3EEFC',
  accentLine: '#DCCDF6',
  secondary: '#FF5A2C',
  // light workspace
  canvas: '#FAF9FB',
  surface: '#FFFFFF',
  subtle: '#F5F3F7',
  border: '#EAE6EF',
  borderStrong: '#D9D3E1',
  text: '#1E1429',
  textSecondary: '#625A6E',
  textMuted: '#8E879A',
  // dark surfaces: sidebar, accent blocks, tooltips
  plum: '#1B1025',
  plumSoft: '#281838',
  plumLine: '#3B2A4F',
  // semantic
  success: '#12805C',
  successSoft: '#E7F6EF',
  warning: '#A15C07',
  warningSoft: '#FDF3DC',
  error: '#C0352B',
  errorSoft: '#FDECEA',
  info: '#1F5FBF',
  infoSoft: '#E8F0FD',
  // identity colours for initials avatars (UserAvatar): never used for status
  avatar: [
    { fill: '#F3EEFC', text: '#5517B8' },
    { fill: '#E8EBFD', text: '#3440B5' },
    { fill: '#E1F2FB', text: '#0C5F8A' },
    { fill: '#DFF5F3', text: '#0B6B66' },
    { fill: '#EEF4DA', text: '#55650F' },
    { fill: '#F6ECDD', text: '#7A5210' },
    { fill: '#FCE7EF', text: '#A82259' },
    { fill: '#F8E6F9', text: '#86238F' },
  ],
  radius: { dense: 4, control: 6, card: 8, overlay: 10, pill: 9999 },
  font: 'var(--font-inter), Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  mono: 'SFMono-Regular, Menlo, Consolas, monospace',
} as const;

const t = tokens;
const ease = '150ms cubic-bezier(.2,.6,.2,1)';
const ring = `0 0 0 3px ${alpha(t.accent, 0.2)}`;
// The only shadows: things that float.
const menuShadow = '0 8px 24px rgba(30,20,41,.10), 0 2px 6px rgba(30,20,41,.05)';
const dialogShadow = '0 24px 64px rgba(30,20,41,.20)';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: t.accent, dark: t.accentHover, contrastText: '#fff' },
    secondary: { main: t.secondary },
    success: { main: t.success, light: t.successSoft },
    warning: { main: t.warning, light: t.warningSoft },
    error: { main: t.error, light: t.errorSoft },
    info: { main: t.info, light: t.infoSoft },
    background: { default: t.canvas, paper: t.surface },
    text: { primary: t.text, secondary: t.textSecondary, disabled: t.textMuted },
    divider: t.border,
    action: { hover: 'rgba(30,20,41,.04)', selected: t.accentSoft, disabledBackground: t.subtle, disabled: t.textMuted },
  },
  // sx `borderRadius: 2` → 8px (card), `1.5` → 6px (control).
  shape: { borderRadius: 4 },
  typography: {
    fontFamily: t.font,
    h1: { fontSize: 24, lineHeight: 1.33, fontWeight: 600, letterSpacing: '-0.02em' },
    h2: { fontSize: 20, lineHeight: 1.4, fontWeight: 600, letterSpacing: '-0.015em' },
    h3: { fontSize: 16, lineHeight: 1.5, fontWeight: 600, letterSpacing: '-0.01em' },
    h4: { fontSize: 16, lineHeight: 1.5, fontWeight: 600 },
    h5: { fontSize: 14, lineHeight: 1.57, fontWeight: 600 },
    h6: { fontSize: 12, lineHeight: 1.33, fontWeight: 600, letterSpacing: '0.01em' },
    subtitle1: { fontSize: 14, lineHeight: 1.57, fontWeight: 500 },
    subtitle2: { fontSize: 13, lineHeight: 1.54, fontWeight: 500 },
    body1: { fontSize: 14, lineHeight: 1.57 },
    body2: { fontSize: 13, lineHeight: 1.54 },
    caption: { fontSize: 12, lineHeight: 1.33 },
    overline: { fontSize: 11, lineHeight: 1.33, fontWeight: 600, letterSpacing: '0.06em' },
    button: { fontSize: 14, lineHeight: 1.54, fontWeight: 600, textTransform: 'none', letterSpacing: 0 },
  },
  components: {
    MuiCssBaseline: { styleOverrides: { body: { fontFeatureSettings: '"calt", "cv11", "ss01"', WebkitFontSmoothing: 'antialiased' } } },
    // Any MUI `href` goes through Next's router; a plain <a> reloads the page and wipes the query cache.
    MuiButtonBase: { defaultProps: { LinkComponent: NextLink, disableRipple: true } },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          minHeight: 40,
          padding: '0 16px',
          borderRadius: t.radius.control,
          boxShadow: 'none',
          transition: `background-color ${ease}, border-color ${ease}, color ${ease}, box-shadow ${ease}, transform 80ms ease`,
          '&:active': { transform: 'translateY(.5px)' },
          '&:focus-visible': { boxShadow: ring },
        },
        sizeSmall: { minHeight: 32, padding: '0 12px', fontSize: 13 },
        sizeLarge: { minHeight: 44, padding: '0 20px', fontSize: 14 },
        containedPrimary: { '&:hover': { backgroundColor: t.accentHover } },
        // secondary: white with a hairline, never a coloured outline
        outlined: { color: t.text, borderColor: t.borderStrong, backgroundColor: t.surface, '&:hover': { borderColor: '#C9C1D4', backgroundColor: t.subtle } },
        outlinedError: { color: t.error, borderColor: alpha(t.error, 0.35), '&:hover': { borderColor: t.error, backgroundColor: t.errorSoft } },
        text: { '&:hover': { backgroundColor: 'rgba(30,20,41,.05)' } },
      },
    },
    MuiIconButton: {
      styleOverrides: { root: { borderRadius: t.radius.control, transition: `background-color ${ease}, color ${ease}`, '&:hover': { backgroundColor: 'rgba(30,20,41,.06)' }, '&:focus-visible': { boxShadow: ring } } },
    },
    MuiPaper: { defaultProps: { elevation: 0 }, styleOverrides: { root: { backgroundImage: 'none' }, rounded: { borderRadius: t.radius.card } } },
    // A card is a hairline on white; it never has a shadow.
    MuiCard: { styleOverrides: { root: { borderRadius: t.radius.card, border: `1px solid ${t.border}`, boxShadow: 'none' } } },
    MuiDivider: { styleOverrides: { root: { borderColor: t.border } } },
    // Every field and dropdown is one 40px box (the button height). `className="compact"` gives the 32px
    // size for table footers and dense toolbars. Nothing is sized at the call site.
    MuiTextField: { defaultProps: { size: 'small' } },
    MuiFormControl: { defaultProps: { size: 'small' } },
    MuiAutocomplete: { defaultProps: { size: 'small' } },
    /**
     * Chrome paints autofilled values without firing a React change event, so
     * MUI never learns the field is filled and leaves the label sitting over
     * the text. :-webkit-autofill is the only signal CSS gets, so the label is
     * floated from there - matching what a real keystroke would have done.
     */
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: t.textSecondary,
          fontSize: 14,
          lineHeight: '20px',
          '&.Mui-focused': { color: t.accent },
          // resting: centred in the 40px box; shrunk: 12px text sitting on the outline
          '&.MuiInputLabel-outlined': { transform: 'translate(12px, 10px) scale(1)' },
          '&.MuiInputLabel-outlined.MuiInputLabel-shrink': { transform: 'translate(14px, -9px) scale(0.857)' },
          '&:has(~ .MuiInputBase-root input:-webkit-autofill)': {
            transform: 'translate(14px, -9px) scale(0.857)',
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: t.radius.control,
          backgroundColor: t.surface,
          fontSize: 14,
          transition: `box-shadow ${ease}`,
          // No transition: a field must look active the instant it is clicked.
          '& .MuiOutlinedInput-notchedOutline': { borderColor: t.borderStrong },
          '&:hover:not(.Mui-disabled):not(.Mui-error) .MuiOutlinedInput-notchedOutline': { borderColor: '#C9C1D4' },
          // Focus is a 2px accent outline. A glow ring cannot be used here: it is a box-shadow, and it would run
          // straight through the floating label, which only the outline's notch makes room for.
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: t.accent, borderWidth: 2 },
          '&.Mui-error.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: t.error },
          '&.Mui-disabled': { backgroundColor: t.subtle },
          '&.Mui-disabled .MuiOutlinedInput-input': { WebkitTextFillColor: t.textMuted },
          '&.MuiInputBase-adornedStart': { paddingLeft: 12 },
          '&.MuiInputBase-adornedEnd': { paddingRight: 12 },
          '&.MuiInputBase-multiline': { minHeight: 88, padding: '10px 12px', alignItems: 'flex-start' },
          '&.compact, .compact > &': { fontSize: 13, '& .MuiOutlinedInput-input': { paddingTop: 6, paddingBottom: 6 } },
          '& input::placeholder, & textarea::placeholder': { color: t.textMuted, opacity: 1 },
          '&:has(input:-webkit-autofill) .MuiOutlinedInput-notchedOutline legend': {
            maxWidth: '100%',
          },
        },
        input: { boxSizing: 'content-box', height: 20, padding: '10px 12px', lineHeight: '20px' },
        inputSizeSmall: { padding: '10px 12px' },
        inputMultiline: { height: 'auto', padding: 0 },
        inputAdornedStart: { paddingLeft: 0 },
        inputAdornedEnd: { paddingRight: 0 },
        notchedOutline: { '& legend': { fontSize: 12 } },
      },
    },
    MuiInputAdornment: {
      styleOverrides: { root: { color: t.textMuted, '& .MuiSvgIcon-root': { fontSize: 18 } }, positionStart: { marginRight: 8 }, positionEnd: { marginLeft: 8 } },
    },
    MuiFormHelperText: { styleOverrides: { root: { margin: '4px 2px 0', fontSize: 12 } } },
    MuiSelect: {
      defaultProps: { size: 'small', MenuProps: { PaperProps: { sx: { maxHeight: 320 } } } },
      styleOverrides: { select: { '&.MuiSelect-select': { minHeight: 20, lineHeight: '20px' } }, icon: { right: 8, fontSize: 20, color: t.textMuted } },
    },
    MuiMenu: { styleOverrides: { paper: { marginTop: 4, borderRadius: t.radius.overlay, border: `1px solid ${t.border}`, boxShadow: menuShadow }, list: { padding: 6, '& .MuiMenuItem-root + .MuiMenuItem-root': { marginTop: 2 } } } },
    MuiPopover: { styleOverrides: { paper: { borderRadius: t.radius.overlay, border: `1px solid ${t.border}`, boxShadow: menuShadow } } },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          minHeight: '36px !important', padding: '8px 10px', gap: 8, borderRadius: t.radius.dense, fontSize: 14, lineHeight: '20px', transition: `background-color ${ease}`,
          '&:hover': { backgroundColor: t.subtle },
          '&.Mui-selected, &.Mui-selected:hover, &.Mui-selected.Mui-focusVisible': { color: t.text, backgroundColor: t.accentSoft, fontWeight: 500 },
        },
      },
    },
    MuiTooltip: { styleOverrides: { tooltip: { padding: '6px 8px', borderRadius: t.radius.dense, backgroundColor: t.plum, fontSize: 12, fontWeight: 500 } } },
    MuiDialog: { styleOverrides: { paper: { borderRadius: t.radius.overlay, border: `1px solid ${t.border}`, boxShadow: dialogShadow } } },
    MuiDialogTitle: { styleOverrides: { root: { padding: '24px 24px 8px', fontSize: 16, lineHeight: 1.5, fontWeight: 600, letterSpacing: '-0.01em' } } },
    MuiDialogContent: { styleOverrides: { root: { padding: '8px 24px 16px' } } },
    MuiDialogActions: { styleOverrides: { root: { padding: '12px 24px 24px', gap: 4 } } },
    MuiBackdrop: { styleOverrides: { root: { backgroundColor: 'rgba(30,20,41,.45)' }, invisible: { backgroundColor: 'transparent' } } },
    MuiDrawer: { styleOverrides: { paper: { borderRadius: 0, boxShadow: menuShadow } } },
    // Tabs: a soft track with a white pill (the indicator) that slides behind the active tab. No underline.
    // MuiToggleButtonGroup below is the same design for either/or choices.
    MuiTabs: {
      defaultProps: { variant: 'scrollable', scrollButtons: false },
      styleOverrides: {
        root: { display: 'inline-flex', width: 'fit-content', maxWidth: '100%', alignSelf: 'flex-start', justifySelf: 'start', minHeight: 0, marginBottom: 16, padding: 4, border: `1px solid ${t.border}`, borderRadius: t.radius.overlay, backgroundColor: t.subtle },
        flexContainer: { gap: 2 },
        indicator: {
          top: 0, bottom: 0, height: '100%', borderRadius: t.radius.card, backgroundColor: t.surface,
          boxShadow: '0 1px 2px rgba(30,20,41,.08), 0 1px 3px rgba(30,20,41,.06)',
          transition: 'left 200ms cubic-bezier(.2,.6,.2,1), width 200ms cubic-bezier(.2,.6,.2,1)',
          '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          zIndex: 1, flexDirection: 'row', alignItems: 'center', minWidth: 0, minHeight: 36, padding: '0 14px', borderRadius: t.radius.card, fontSize: 14, fontWeight: 500, lineHeight: 1.57,
          textTransform: 'none', whiteSpace: 'nowrap', color: t.textSecondary, transition: `color ${ease}`,
          '&:hover': { color: t.text },
          '&.Mui-selected': { color: t.text, fontWeight: 600 },
          '&.Mui-disabled': { color: t.textMuted },
          '&.Mui-focusVisible': { boxShadow: ring },
          '&.MuiTab-labelIcon': { minHeight: 36, paddingTop: 0, paddingBottom: 0 },
          '& > .MuiTab-iconWrapper': { marginRight: 6, marginBottom: 0, fontSize: 16 },
          '& .MuiChip-root': { height: 20, marginLeft: 6, fontSize: 11, fontWeight: 500, cursor: 'inherit', transition: `color ${ease}, background-color ${ease}` },
          // Count chips are neutral and turn accent on the active tab; a chip given its own colour keeps it.
          '& .MuiChip-colorDefault': { color: t.textSecondary, backgroundColor: 'rgba(30,20,41,.06)' },
          '&.Mui-selected .MuiChip-colorDefault': { color: t.accent, backgroundColor: t.accentSoft },
        },
      },
    },
    // Pills are for status and tags only.
    MuiChip: {
      styleOverrides: {
        root: { height: 22, borderRadius: t.radius.pill, fontSize: 12, fontWeight: 500 },
        sizeSmall: { height: 20, fontSize: 11 },
        filled: { backgroundColor: t.subtle, color: t.textSecondary },
        outlined: { borderColor: t.border },
        // Doubled selector so a colour beats the neutral `filled` style above, whatever order MUI emits them in.
        colorSuccess: { '&&': { backgroundColor: t.successSoft, color: t.success } },
        colorWarning: { '&&': { backgroundColor: t.warningSoft, color: t.warning } },
        colorError: { '&&': { backgroundColor: t.errorSoft, color: t.error } },
        colorInfo: { '&&': { backgroundColor: t.infoSoft, color: t.info } },
        colorPrimary: { '&&': { backgroundColor: t.accentSoft, color: t.accent } },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { padding: '12px 16px', borderBottom: `1px solid ${t.border}`, fontSize: 13, lineHeight: 1.54 },
        head: { color: t.textMuted, fontSize: 12, fontWeight: 500, letterSpacing: '0.01em', whiteSpace: 'nowrap', backgroundColor: 'transparent' },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: { transition: `background-color ${ease}`, '&.MuiTableRow-hover:hover': { backgroundColor: '#FAF8FC' }, '&.Mui-selected': { backgroundColor: t.accentSoft }, '&:last-child td': { borderBottom: 0 } },
      },
    },
    MuiCheckbox: { styleOverrides: { root: { padding: 6, borderRadius: t.radius.dense, color: t.borderStrong } } },
    MuiRadio: { styleOverrides: { root: { padding: 6, color: t.borderStrong } } },
    MuiSwitch: {
      styleOverrides: {
        root: { width: 36, height: 20, padding: 0, margin: 6 },
        switchBase: { padding: 2, '&.Mui-checked': { transform: 'translateX(16px)', color: '#fff' }, '&.Mui-checked + .MuiSwitch-track': { opacity: 1, backgroundColor: t.accent } },
        thumb: { width: 16, height: 16, boxShadow: '0 1px 2px rgba(30,20,41,.25)' },
        track: { borderRadius: t.radius.pill, opacity: 1, backgroundColor: t.borderStrong, transition: `background-color ${ease}` },
      },
    },
    MuiFormControlLabel: { styleOverrides: { label: { fontSize: 14 } } },
    MuiAlert: {
      styleOverrides: {
        root: { padding: '6px 12px', borderRadius: t.radius.control, border: '1px solid', fontSize: 13, alignItems: 'center' },
        standardSuccess: { backgroundColor: t.successSoft, color: '#0D5C43', borderColor: alpha(t.success, 0.22) },
        standardWarning: { backgroundColor: t.warningSoft, color: '#7A4504', borderColor: alpha(t.warning, 0.24) },
        standardError: { backgroundColor: t.errorSoft, color: '#8F251D', borderColor: alpha(t.error, 0.22) },
        standardInfo: { backgroundColor: t.infoSoft, color: '#184A96', borderColor: alpha(t.info, 0.2) },
      },
    },
    MuiSnackbarContent: { styleOverrides: { root: { borderRadius: t.radius.control, backgroundColor: t.plum, fontSize: 13, boxShadow: menuShadow } } },
    MuiSkeleton: { defaultProps: { animation: 'wave' }, styleOverrides: { root: { backgroundColor: '#EEEAF2' }, rounded: { borderRadius: t.radius.control } } },
    MuiLinearProgress: { styleOverrides: { root: { height: 4, borderRadius: t.radius.pill, backgroundColor: '#EEEAF2' }, bar: { borderRadius: t.radius.pill } } },
    MuiToggleButtonGroup: {
      styleOverrides: {
        root: ({ ownerState }) => ({ gap: 2, maxWidth: '100%', ...(ownerState.fullWidth ? {} : { width: 'fit-content', alignSelf: 'flex-start' }), padding: ownerState.size === 'small' ? 3 : 4, border: `1px solid ${t.border}`, borderRadius: t.radius.overlay, backgroundColor: t.subtle }),
        grouped: { margin: '0 !important', border: '0 !important', borderRadius: `${t.radius.card}px !important` },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          minHeight: 36, padding: '0 14px', color: t.textSecondary, fontSize: 14, fontWeight: 500, lineHeight: 1.57, textTransform: 'none', whiteSpace: 'nowrap',
          transition: `color ${ease}, background-color ${ease}, box-shadow ${ease}`,
          '&:hover': { color: t.text, backgroundColor: 'transparent' },
          '&.Mui-selected, &.Mui-selected:hover': { color: t.text, backgroundColor: t.surface, fontWeight: 600, boxShadow: '0 1px 2px rgba(30,20,41,.08), 0 1px 3px rgba(30,20,41,.06)' },
          '&.Mui-disabled': { color: t.textMuted },
          '&.Mui-focusVisible': { boxShadow: ring },
          '& .MuiChip-root': { height: 20, marginLeft: 8, fontSize: 11, fontWeight: 500, color: t.success, backgroundColor: t.successSoft, cursor: 'inherit' },
        },
        sizeSmall: { minHeight: 30, padding: '0 12px', fontSize: 13 },
      },
    },
    MuiAvatar: { styleOverrides: { root: { fontSize: 13, fontWeight: 600 } } },
    MuiLink: { defaultProps: { underline: 'hover' }, styleOverrides: { root: { color: t.accent, fontWeight: 500 } } },
  },
});
