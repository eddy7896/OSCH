// OruSchools — component props (documentation; window.Oru.<Component>)
import type { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes } from "react";

export type Density = "compact" | "comfortable" | "touch" | "driver";
export type Tone = "success" | "warning" | "danger" | "info" | "purple" | "teal" | "neutral" | "brand";
export type IconName =
  | "check" | "x" | "clock" | "leave" | "medical" | "halfday" | "more" | "chevron-right" | "chevron-down" | "arrow-left"
  | "search" | "bell" | "home" | "users" | "user-plus" | "user-minus" | "calendar" | "message" | "payments" | "grid"
  | "cloud" | "cloud-off" | "upload" | "refresh" | "alert" | "check-circle" | "bus" | "map-pin" | "phone" | "book"
  | "chart" | "trend-up" | "trend-down" | "send" | "device" | "inbox" | "tasks" | "plus";

export interface IconProps { name: IconName; size?: 16 | 20 | 24 | 28 | 32 | number; label?: string; strokeWidth?: number; className?: string }

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Default "secondary". At most one "primary" per screen. */
  variant?: "primary" | "secondary" | "ghost" | "danger";
  /** Default "touch". compact/comfortable = Web ERP, touch = mobile, driver = Driver app. */
  size?: Density;
  icon?: IconName; iconRight?: IconName; block?: boolean; children: ReactNode;
}

export interface ActionTileProps {
  title: string; description?: string; icon?: IconName;
  tone?: "primary" | "success" | "danger" | "neutral"; solid?: boolean; onClick?: () => void; disabled?: boolean;
}

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string; hint?: string; error?: string; icon?: IconName;
  size?: "compact" | "comfortable" | "touch"; multiline?: boolean;
}

export interface CheckboxProps { label: string; description?: string; checked?: boolean; defaultChecked?: boolean; onChange?: (e: any) => void; disabled?: boolean }

export interface SegmentedControlProps {
  options: { value: string; label: string }[]; value?: string; defaultValue?: string;
  onChange?: (value: string) => void; label?: string; size?: "compact" | "comfortable" | "touch";
}

export type AttendanceStatus = "present" | "absent" | "late" | "leave" | "medical" | "halfday" | "excused";
export interface StatusPillProps { status: AttendanceStatus; label?: string; interactive?: boolean; onClick?: () => void }

export interface BadgeProps { tone?: Tone; dot?: boolean; count?: number; children?: ReactNode }

export type SyncState = "synced" | "saved" | "pending" | "syncing" | "offline" | "failed";
export interface SyncStatusProps {
  state: SyncState; variant?: "pill" | "banner"; title?: string; detail?: string;
  actionLabel?: string; onAction?: () => void;
}

export interface BannerProps { tone?: "success" | "warning" | "danger" | "info" | "neutral"; title?: string; icon?: IconName; action?: ReactNode; children?: ReactNode }

export interface CardProps { title?: string; subtitle?: string; icon?: IconName; action?: ReactNode; tone?: "brand"; children?: ReactNode }
export interface LinkActionProps { onClick?: () => void; children: ReactNode }

export interface StatCardProps {
  label: string; value: string; sub?: string; icon?: IconName; tone?: Tone;
  /** Percent change; positive shows green up-arrow, negative red down-arrow. */
  trend?: number; trendLabel?: string;
}

export interface ListRowProps {
  title: ReactNode; subtitle?: ReactNode; leading?: ReactNode; trailing?: ReactNode;
  onClick?: () => void; size?: "compact" | "touch";
}

export interface AvatarProps { name: string; src?: string; size?: number }

export interface NavItem { key: string; label: string; icon: IconName; badge?: number }
export interface BottomNavProps { items: NavItem[]; active: string; onChange?: (key: string) => void }
export interface SideNavProps {
  sections: { title?: string; items: NavItem[] }[]; active: string; onChange?: (key: string) => void;
  school?: string; product?: string;
}

export interface EmptyStateProps { title: string; description?: string; icon?: IconName; action?: ReactNode }

export interface LogoProps {
  /** Mark height in px. Default 32. */
  size?: number;
  variant?: "horizontal" | "mark";
  /** App name under the wordmark: "Teacher", "Parent", "Staff", "Driver", "ERP". */
  app?: string;
  tone?: "color" | "white" | "ink";
}
