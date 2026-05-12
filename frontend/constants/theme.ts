export const Colors = {
  primary: '#1E293B',
  primaryForeground: '#FFFFFF',
  secondary: '#F1F5F9',
  secondaryForeground: '#0F172A',
  accent: '#DC2626',
  accentForeground: '#FFFFFF',
  background: '#FFFFFF',
  surface: '#F8FAFC',
  muted: '#E2E8F0',
  mutedForeground: '#64748B',
  border: '#E2E8F0',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
};

export const StatusColors: Record<string, string> = {
  draft: '#94A3B8',
  submitted: '#F59E0B',
  delayed: '#EF4444',
  dc_approved: '#10B981',
  dc_rejected: '#EF4444',
};

export const StatusLabels: Record<string, string> = {
  draft: 'DRAFT',
  submitted: 'UNDER REVIEW',
  delayed: 'DELAYED',
  dc_approved: 'APPROVED',
  dc_rejected: 'REJECTED',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const Radius = {
  sm: 4,
  md: 8,
  lg: 12,
  full: 9999,
};
