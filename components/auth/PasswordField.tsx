'use client';

import { forwardRef, useState } from 'react';
import { IconButton, InputAdornment, TextField, type TextFieldProps } from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

/**
 * A password TextField with a reveal toggle. forwardRef so react-hook-form's
 * register() keeps working at every call site.
 */
const PasswordField = forwardRef<HTMLDivElement, Omit<TextFieldProps, 'type'>>(
  function PasswordField({ InputProps, disabled, ...props }, ref) {
    const [visible, setVisible] = useState(false);

    return (
      <TextField
        {...props}
        ref={ref}
        type={visible ? 'text' : 'password'}
        disabled={disabled}
        InputProps={{
          ...InputProps,
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                // The label states the action, not the state, and tracks the
                // toggle so a screen reader announces what the click will do.
                aria-label={visible ? 'Hide password' : 'Show password'}
                onClick={() => setVisible((shown) => !shown)}
                // Keeps focus in the field: toggling is not a form step, and
                // tabbing through a password input should not stop here.
                onMouseDown={(event) => event.preventDefault()}
                tabIndex={-1}
                disabled={disabled}
                edge="end"
              >
                {visible ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
              </IconButton>
            </InputAdornment>
          ),
        }}
      />
    );
  },
);

export default PasswordField;
