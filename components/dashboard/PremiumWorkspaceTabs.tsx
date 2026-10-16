"use client";

import type { ElementType, ReactNode } from "react";
import { Box, Chip, Tab, Tabs } from "@mui/material";

export type PremiumWorkspaceTab<T extends string> = {
  value: T;
  label: string;
  count?: string | number;
  icon?: ElementType;
};

type PremiumWorkspaceTabsProps<T extends string> = {
  value: T;
  options: PremiumWorkspaceTab<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
};

/** A local workspace navigation style for the Users, Email, Push and Journey views. */
export default function PremiumWorkspaceTabs<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  className,
}: PremiumWorkspaceTabsProps<T>) {
  return (
    <Box
      className={`premium-workspace-tabs${className ? ` ${className}` : ""}`}
    >
      <Tabs
        value={value}
        onChange={(_, nextValue) => onChange(nextValue as T)}
        variant="scrollable"
        scrollButtons={false}
        aria-label={ariaLabel}
      >
        {options.map(({ value: optionValue, label, count, icon: Icon }) => (
          <Tab
            key={optionValue}
            value={optionValue}
            icon={Icon ? <Icon fontSize="small" /> : undefined}
            iconPosition={Icon ? "start" : undefined}
            label={
              <Box className="premium-workspace-tab-label">
                <span>{label}</span>
                {count !== undefined && <Chip label={count} size="small" />}
              </Box>
            }
          />
        ))}
      </Tabs>
    </Box>
  );
}
