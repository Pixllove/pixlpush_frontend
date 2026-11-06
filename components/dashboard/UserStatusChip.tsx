import { Chip } from "@mui/material";
import type { EndUserStatus } from "@/types/project";

const LOOK: Record<EndUserStatus, { label: string; className: string }> = {
  active: { label: "Active", className: "active-chip" },
  logged_out: { label: "Logged out", className: "neutral-chip" },
  deleted: { label: "Deleted", className: "paused-chip" },
  anonymous: { label: "Anonymous", className: "neutral-chip" },
};

/** An end user's account state, from the SDK: active, logged out (reset on every device), deleted (deleteUser), or an anonymous visitor. */
export default function UserStatusChip({ status }: { status?: EndUserStatus | null }) {
  const look = LOOK[status ?? "active"] ?? LOOK.active;
  return <Chip label={look.label} size="small" className={look.className} />;
}
