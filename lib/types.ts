export type Role = 'employee' | 'leader' | 'supervisor' | 'manager' | 'executive' | 'admin';
export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type ReportStatus = 'submitted' | 'reviewed' | 'flagged' | 'resolved';
export type SourceType = 'text' | 'voice' | 'task_tracker';
export type ReportType = 'status_report' | 'performance_review';
export type ReviewPeriod = 'weekly' | 'monthly' | 'quarterly';

export interface AuthenticatedUser {
  id: number;
  email: string;
  role: Role;
  departmentId: number | null;
  positionId?: number | null;
  fullName: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: 'bearer';
  user: AuthenticatedUser;
}

export interface Department {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserRecord {
  id: number;
  fullName: string;
  email: string;
  role: Role;
  departmentId: number | null;
  positionId: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  department?: { id: number; name: string } | null;
  position?: { id: number; title: string } | null;
}

// Status Report item — one work item inside a status report
export interface StatusItem {
  name: string;
  currentStatus: string;
  nextSteps: string;
  deadline?: string | null;
  proposal?: string;
  needsSupport: boolean;
  priority: Priority;
  hasBlocker: boolean;
}

// Performance Review data
export interface PerformanceData {
  achievements: string;
  achievedKpis: string;
  gaps: string;
  gapReasons: string;
  opportunities: string;
  needsDirectionAdjustment: boolean;
  directionAdjustmentDetails: string;
}

export interface CommentRecord {
  id: number;
  reportId: number;
  userId: number;
  content: string;
  createdAt: string;
  user: { id: number; fullName: string; role: Role };
}

export interface DirectionAdjustmentItem {
  report_id: number;
  employee_name: string;
  department_name: string | null;
  review_period: ReviewPeriod | null;
  adjustment_details: string | null;
  status: ReportStatus;
  created_at: string;
}

export interface ReportRecord {
  id: number;
  userId: number;
  departmentId: number | null;
  reportType: ReportType;
  sourceType: SourceType;
  originalContent: string | null;
  transcript: string | null;
  statusItems: StatusItem[];
  performanceData: PerformanceData;
  aiSummary: string | null;
  aiPriority: Priority | null;
  hasBlocker: boolean;
  needsSupport: boolean;
  needsDirectionAdjustment: boolean;
  status: ReportStatus;
  issueCategory: string | null;
  isFlagged: boolean;
  flagNote: string | null;
  resolvedNote: string | null;
  resolvedAt: string | null;
  resolvedById: number | null;
  reviewPeriod: ReviewPeriod | null;
  createdAt: string;
  updatedAt: string;
  user: { id: number; fullName: string; email: string; role: Role };
  department: { id: number; name: string } | null;
  voiceRecord: {
    id: number;
    fileName: string | null;
    mimeType: string | null;
    durationSeconds: number | null;
    transcript: string | null;
  } | null;
  comments: CommentRecord[];
}

export interface ReportListResponse {
  items: ReportRecord[];
  total: number;
  limit: number;
  offset: number;
}

export type DashboardPeriod = 'today' | 'week' | 'month';

export interface TrendResponse {
  since: string;
  days: number;
  buckets: Array<{ date: string; reports: number; blockers: number }>;
}

export interface RecentActivityItem {
  id: number;
  employee_name: string;
  department_name: string | null;
  source_type: SourceType;
  ai_priority: Priority | null;
  has_blocker: boolean;
  issue_category: string | null;
  status: ReportStatus;
  ai_summary: string | null;
  original_excerpt: string;
  created_at: string;
}

export interface RecentActivityResponse {
  items: RecentActivityItem[];
}

export interface PriorityDistribution {
  period: DashboardPeriod;
  total: number;
  buckets: Array<{ priority: Priority; count: number }>;
}

export interface TopContributorsResponse {
  period: DashboardPeriod;
  contributors: Array<{
    user_id: number;
    full_name: string;
    email: string | null;
    department_name: string | null;
    report_count: number;
  }>;
}

export interface DeptHeatmapRow {
  department_id: number | null;
  department_name: string | null;
  total: number;
  urgent: number;
  high: number;
  medium: number;
  low: number;
  blockers: number;
}

export interface IssueCategoryDistribution {
  period: DashboardPeriod;
  total_with_issues: number;
  buckets: Array<{ category: string; count: number }>;
}

export interface DeptHeatmapResponse {
  period: DashboardPeriod;
  departments: DeptHeatmapRow[];
}

export interface DashboardSummary {
  period: DashboardPeriod;
  since: string;
  total_reports: number;
  total_blockers: number;
  urgent_reports: number;
  missing_report_count: number;
  departments: Array<{
    department_id: number | null;
    department_name: string | null;
    report_count: number;
    blocker_count: number;
  }>;
  generated_at: string;
}

export interface MissingReportEmployee {
  user_id: number;
  full_name: string;
  email: string;
  department_id: number | null;
  department_name: string | null;
}

export interface DashboardIssue {
  report_id: number;
  employee_name: string;
  department_name: string | null;
  ai_summary: string | null;
  ai_priority: Priority | null;
  status: ReportStatus;
  created_at: string;
}

// Phase 1 — Department Direction
export interface StrategicFunctionEntry { function: string; keyDirection: string; }
export interface KeyKpiEntry { kpi: string; target: string; }
export interface SummaryEntry { item: string; details: string; }

export interface UpsertDirectionPayload {
  overallObjective?: string | null;
  currentStatus?: string | null;
  transformationDirection?: string | null;
  strategicFunctions?: StrategicFunctionEntry[];
  shortTerm?: string | null;
  midTerm?: string | null;
  longTerm?: string | null;
  keyKpis?: KeyKpiEntry[];
  summaryItems?: SummaryEntry[];
}

export interface DepartmentDirection {
  id: number;
  departmentId: number;
  isCurrent: boolean;
  overallObjective: string | null;
  currentStatus: string | null;
  transformationDirection: string | null;
  strategicFunctions: StrategicFunctionEntry[];
  shortTerm: string | null;
  midTerm: string | null;
  longTerm: string | null;
  keyKpis: KeyKpiEntry[];
  summaryItems: SummaryEntry[];
  createdById: number | null;
  createdAt: string;
  updatedAt: string;
  department?: { id: number; name: string } | null;
}

// Phase 2 — Organizational Structure + Position KPIs
export type KpiCycle = 'monthly' | 'quarterly';

export interface PositionKpi {
  id: number;
  positionId: number;
  kpiName: string;
  target: string | null;
  cycle: KpiCycle;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Position {
  id: number;
  departmentId: number;
  title: string;
  rolePurpose: string | null;
  workstreams: string[];
  responsibilities: string[];
  expectedOutputs: string[];
  createdAt: string;
  updatedAt: string;
  department?: { id: number; name: string } | null;
  kpis: PositionKpi[];
  _count?: { users: number };
}

export const KPI_CYCLE_LABELS: Record<KpiCycle, string> = {
  monthly: 'Hàng tháng',
  quarterly: 'Hàng quý',
};

// Role helpers
export const ROLE_LABELS: Record<Role, string> = {
  employee: 'Nhân viên',
  leader: 'Trưởng phòng',
  supervisor: 'Giám sát nội bộ',
  manager: 'Quản lý',
  executive: 'Ban lãnh đạo',
  admin: 'Quản trị hệ thống',
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Thấp',
  medium: 'Trung bình',
  high: 'Cao',
  urgent: 'Khẩn cấp',
};

export const REVIEW_PERIOD_LABELS: Record<ReviewPeriod, string> = {
  weekly: 'Tuần này',
  monthly: 'Tháng này',
  quarterly: 'Quý này',
};

// Phase 3 — Task Tracker
export type TaskStatus = 'todo' | 'doing' | 'blocked' | 'done';

export interface Task {
  id: number;
  userId: number;
  departmentId: number | null;
  positionId: number | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  deadline: string | null;
  completedAt: string | null;
  parentTaskId: number | null;
  createdAt: string;
  updatedAt: string;
  user: { id: number; fullName: string; role: Role };
  department: { id: number; name: string } | null;
  position: { id: number; title: string } | null;
  _count?: { subtasks: number };
}

export interface TaskWithHistory extends Task {
  statusHistory: TaskStatusHistory[];
  subtasks: Task[];
}

export interface TaskStatusHistory {
  id: number;
  fromStatus: TaskStatus | null;
  toStatus: TaskStatus;
  note: string | null;
  changedAt: string;
  changedBy: { id: number; fullName: string };
}

export interface TaskListResponse {
  items: Task[];
  total: number;
  limit: number;
  offset: number;
}

export interface TaskStats {
  todo: number;
  doing: number;
  blocked: number;
  done: number;
  overdue: number;
  total: number;
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'Chờ làm',
  doing: 'Đang làm',
  blocked: 'Bị chặn',
  done: 'Xong',
};

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  todo: 'bg-gray-100 text-gray-600',
  doing: 'bg-blue-50 text-blue-700',
  blocked: 'bg-red-50 text-red-700',
  done: 'bg-green-50 text-green-700',
};
