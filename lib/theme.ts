import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: { mode: 'light', primary: { main: '#5517B8' }, secondary: { main: '#FF5A2C' }, background: { default: '#fffaf8', paper: '#ffffff' }, text: { primary: '#241536', secondary: '#706878' } },
  typography: { fontFamily: 'Arial, Helvetica, sans-serif', h1: { fontWeight: 800, letterSpacing: '-.065em' }, h2: { fontWeight: 800, letterSpacing: '-.05em' }, h3: { fontWeight: 800, letterSpacing: '-.035em' }, button: { fontWeight: 800, textTransform: 'none' } },
  shape: { borderRadius: 18 },
  components: { MuiButton: { styleOverrides: { root: { borderRadius: 999, padding: '12px 22px', boxShadow: 'none' } } }, MuiCard: { styleOverrides: { root: { boxShadow: '0 18px 60px rgba(58, 20, 70, .08)' } } } }
});
