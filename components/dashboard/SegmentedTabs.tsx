"use client";

import { Tab, Tabs } from "@mui/material";
import type { ReactElement } from "react";

export type SegmentedTabOption<T extends string | number> = {
  value: T;
  label: string | ReactElement;
  icon?: ReactElement;
  iconPosition?: "bottom" | "end" | "start" | "top";
  ariaLabel?: string;
};

type SegmentedTabsProps<T extends string | number> = {
  value: T;
  options: Array<SegmentedTabOption<T>>;
  onChange: (value: T) => void;
  ariaLabel: string;
  disabled?: boolean;
  className?: string;
};

/** Shared raised-pill tabs used by Email and Analytics. */
export default function SegmentedTabs<T extends string | number>({ value, options, onChange, ariaLabel, disabled = false, className }: SegmentedTabsProps<T>) {
  return (
    <Tabs
      variant="scrollable"
      scrollButtons={false}
      value={value}
      onChange={(_, nextValue) => onChange(nextValue as T)}
      aria-label={ariaLabel}
      className={`pp-segmented-tabs${className ? ` ${className}` : ""}`}
      sx={{ alignSelf: "center" }}
    >
      {options.map((option) => <Tab value={option.value} label={<span className="pp-segmented-tab-label">{option.label}</span>} icon={option.icon} iconPosition={option.icon ? option.iconPosition ?? "start" : undefined} aria-label={option.ariaLabel} disabled={disabled} key={String(option.value)} />)}
    </Tabs>
  );
}
