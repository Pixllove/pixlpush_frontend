import NextLink from 'next/link';
import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: { mode: 'light', primary: { main: '#5517B8' }, secondary: { main: '#FF5A2C' }, background: { default: '#fffaf8', paper: '#ffffff' }, text: { primary: '#241536', secondary: '#706878' } },
  typography: { fontFamily: 'Arial, Helvetica, sans-serif', h1: { fontWeight: 800, letterSpacing: '-.065em' }, h2: { fontWeight: 800, letterSpacing: '-.05em' }, h3: { fontWeight: 800, letterSpacing: '-.035em' }, button: { fontWeight: 800, textTransform: 'none' } },
  shape: { borderRadius: 18 },
  components: {
    // Any MUI `href` goes through Next's router; a plain <a> reloads the page and wipes the query cache.
    MuiButtonBase: { defaultProps: { LinkComponent: NextLink } },
    MuiButton: { styleOverrides: { root: { borderRadius: 999, padding: '12px 22px', boxShadow: 'none' } } },
    MuiCard: { styleOverrides: { root: { boxShadow: '0 18px 60px rgba(58, 20, 70, .08)' } } },
    /**
     * Chrome paints autofilled values without firing a React change event, so
     * MUI never learns the field is filled and leaves the label sitting over
     * the text. :-webkit-autofill is the only signal CSS gets, so the label is
     * floated from there - matching what a real keystroke would have done.
     */
    MuiInputLabel: {
      styleOverrides: {
        root: {
          '&:has(~ .MuiInputBase-root input:-webkit-autofill)': {
            transform: 'translate(14px, -9px) scale(0.75)',
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          '&:has(input:-webkit-autofill) .MuiOutlinedInput-notchedOutline legend': {
            maxWidth: '100%',
          },
        },
      },
    },
  },
});
