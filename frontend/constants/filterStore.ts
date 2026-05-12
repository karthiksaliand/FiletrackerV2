// Simple shared filter state for cross-tab navigation
// Dashboard sets these, Files screen reads and clears them on focus

type FilterState = {
  status: string | null;
  priority: string | null;
  pendingDept: string | null;
  timestamp: number;
};

let pendingFilter: FilterState = {
  status: null,
  priority: null,
  pendingDept: null,
  timestamp: 0,
};

export function setPendingFilter(status?: string, priority?: string, pendingDept?: string) {
  pendingFilter = {
    status: status || null,
    priority: priority || null,
    pendingDept: pendingDept || null,
    timestamp: Date.now(),
  };
}

export function consumePendingFilter(): FilterState {
  const filter = { ...pendingFilter };
  // Clear after reading so it doesn't re-apply on subsequent focuses
  pendingFilter = { status: null, priority: null, pendingDept: null, timestamp: 0 };
  return filter;
}

export function hasPendingFilter(): boolean {
  return pendingFilter.timestamp > 0;
}
