// FILE: AdFlowPro_ui/src/types/api/testAsset.ts
import type { PerformActionPayload } from "./common";
import type  GraphData  from "@logicflow/core";
import type { AtomCategoryPublic } from "./atomCategory";

// --- L1: Atomic Operation ---
export interface MatcherCoordinates {
  left: number;
  top: number;
}

// --- State Condition Schemas ---
export interface StateConditionParameters {
  // For variable_comparison
  leftSource?: "variable" | "expression" | "value";
  leftValue?: string;
  comparisonOperator?: string;
  rightSource?: "value" | "variable";
  rightValue?: string;
  // For app_foreground_check
  expectedState?: "foreground" | "background";
}

export interface StateCondition {
  conditionType: "variable_comparison" | "app_foreground_check";
  parameters: StateConditionParameters;
}


// 定义屏幕区域的类型
export type ScreenRegion =
    | ""
    | "TOP_LEFT"
    | "TOP_CENTER"
    | "TOP_RIGHT"
    | "MIDDLE_LEFT"
    | "CENTER"
    | "MIDDLE_RIGHT"
    | "BOTTOM_LEFT"
    | "BOTTOM_CENTER"
    | "BOTTOM_RIGHT";

// 定义空间关系操作符的类型
export type SpatialOperator = "RIGHT_OF" | "LEFT_OF" | "ABOVE" | "BELOW" | "NEAR";

export interface AnchorMatcher {
  text: string | string[];
}

export interface SecondaryMatcher {
  text: string | string[];
  isExclusion: boolean;
}

export interface Extractor {
  name: string;
  regex: string;
  scope: "matched_node" | "full_screen";
}

// 定义空间关系接口
export interface SpatialRelation {
  operator: SpatialOperator;
  anchorMatcher: AnchorMatcher;
}

export interface Matcher {
  // 1. Top-level discriminator
  matchTargetType: "text" | "image";

  // 2. Text-specific fields
  sceneType?: "ui" | "ocr";
  text?: string | string[];
  matchMode?: "fuzzy" | "fuzzy_with_coords" | "class_and_bounds" | "must_not_contain" | "exact";
  coordinates?: MatcherCoordinates;

  // 3. Image-specific fields
  templateId?: string | null;
  publicUrl?: string;
  matchThreshold?: number;
  imageMatchStrategy?: "best" | "first";
  imageMatchMode?: "template" | "orb";
  enableAdvancedAlgorithm?: boolean;
  optimalScaleFactor?: number;
  enableMultiScale?: boolean;

  // 4. Common filters
  screenRegion: ScreenRegion[];
  spatialRelation?: SpatialRelation | null;
  // 5. AI Detection (New Phase 9)
  modelId?: string;
  targetLabel?: string;
  minConfidence?: number;
}

export interface SceneSnapshot {
  primaryMatcher: Matcher;
  secondaryMatchers: SecondaryMatcher[];
  extractors: Extractor[];
}

export interface AtomicOperationBase {
  name: string;
  description?: string;
  triggerType: "scene" | "state";
  priority: number;
  executionCountLimit: number;
  continueAfterMatch: boolean;
  actionLoopCount?: number;
  supportedDevices?: string[];
}

export interface AtomicOperationCreatePayload extends AtomicOperationBase {
  categoryId?: number | null;
  sceneSnapshotJson?: SceneSnapshot;
  stateCondition?: StateCondition;
  actionsJson: PerformActionPayload[];
}

export interface AtomicOperationUpdatePayload {
  categoryId?: number | null;
  name?: string;
  description?: string;
  triggerType?: "scene" | "state";
  priority?: number;
  sceneSnapshotJson?: SceneSnapshot;
  stateCondition?: StateCondition;
  executionCountLimit?: number;
  actionLoopCount?: number;
  continueAfterMatch?: boolean;
  actionsJson?: PerformActionPayload[];
  supportedDevices?: string[];
}

export interface AtomicOperationPublic extends AtomicOperationBase {
  atomId: number;
  categoryId?: number | null;
  categoryName?: string | null;
  sceneSnapshotJson?: SceneSnapshot;
  stateCondition?: StateCondition;
  actionsJson: PerformActionPayload[];
  createdAt: string;
  updatedAt: string;
  totalScans?: number;
  totalMatches?: number;
  hitRate?: number;
}

// --- L2: Test Package ---
export interface TestPackagePublic {
  packageId: number;
  name: string;
  description?: string;
  isCommon: boolean;
  categoryId?: number | null;
  createdAt: string;
  category?: any;
  updatedAt: string;
}

export interface TestPackagePublicWithAtoms extends TestPackagePublic {
  atoms: AtomicOperationPublic[];
  category?: AtomCategoryPublic | null;
}

export interface TestPackageCreatePayload {
  name: string;
  description?: string;
  isCommon: boolean;
  atomIds: number[];
  categoryId?: number | null;
}

export interface TestPackageUpdatePayload {
  name?: string;
  description?: string;
  isCommon?: boolean;
  atomIds?: number[];
  categoryId?: number | null;
}

// --- L3: Test Case ---
export interface TestCaseBase {
  name: string;
  caseType: "linear" | "flow";
  description?: string;
  categoryId?: number | null; // [新增]
}

export interface TestCaseListPublic {
  caseId: number;
  name: string;
  caseType: "linear" | "flow";
  description?: string;
  totalTimeoutS?: number;
  createdAt: string;
  updatedAt: string;
  categoryName?: string | null; // [新增]
}

export interface TestCasePublic extends TestCaseListPublic {
  packages: TestPackagePublic[];
  flowchartData?: GraphData | object | null;
  categoryId?: number | null; // [新增] 详情页也需要
}

export interface TestCaseCreatePayload {
  name: string;
  description?: string;
  categoryId?: number | null; // [新增]
  caseType: "linear" | "flow";
  totalTimeoutS?: number;
  packageIds?: number[];
  flowchartData?: GraphData | object | null;
}

export interface TestCaseUpdatePayload {
  name?: string;
  description?: string;
  categoryId?: number | null; // [新增]
  totalTimeoutS?: number;
  packageIds?: number[];
  flowchartData?: GraphData | object | null;
}

// --- L4: Test Suite ---
export interface TestSuiteListPublic {
  suiteId: number;
  name: string;
  description?: string;
  targetAppPackage?: string;
  defocusGuardTimeoutS?: number;
  noMatchDelayMs?: number;
  postActionDelayMs?: number;
  screenshotQuality?: number;
  createdAt: string;
  updatedAt: string;
  categoryName?: string | null; // [新增]
}

export interface TestSuitePublic extends TestSuiteListPublic {
  cases: TestCaseListPublic[];
  flowchartData?: GraphData;
  categoryId?: number | null; // [新增] 详情页也需要
}

export interface TestSuiteCreatePayload {
  name: string;
  description?: string;
  categoryId?: number | null; // [新增]
  targetAppPackage?: string;
  defocusGuardTimeoutS?: number;
  noMatchDelayMs?: number;
  postActionDelayMs?: number;
  screenshotQuality?: number;
  caseIds?: number[]; // For linear mode
  flowchartData?: GraphData;
}

export interface TestSuiteUpdatePayload {
  name?: string;
  description?: string;
  categoryId?: number | null; // [新增]
  targetAppPackage?: string;
  defocusGuardTimeoutS?: number;
  noMatchDelayMs?: number;
  postActionDelayMs?: number;
  screenshotQuality?: number;
  caseIds?: number[]; // For linear mode
  flowchartData?: GraphData; // for flow mode
}

// --- V2.1 "关系驱动" 流程图剧本模型 ---

export interface StateNode {
  id: string;
  label: string;
  type: string; // "start", "state", "end"
  outgoingAtomIds: Array<[number, string | null]>;
}

export interface FlowChartPackage {
  startStateId: string;
  globalAtomIds: Array<[number, string | null]>;
  states: StateNode[];
  // Key is the original atom_id as a string
  atoms: Record<string, any>; // Using any here to accommodate the PackagedAtom model from job.py
}


// --- 引用分析报告模型 ---
export interface FlowCaseUsage {
  caseId: number;
  name: string;
  locations: string[]; // 具体引用位置描述，如 "全局触发器", "连线: [首页]->[我的]"
}

export interface LinearCaseUsage {
  caseId: number;
  name: string;
}

export interface PackageUsage {
  packageId: number;
  name: string;
  relatedLinearCases: LinearCaseUsage[];
  relatedFlowCases: FlowCaseUsage[];
}

export interface AtomUsageReport {
  directFlowCases: FlowCaseUsage[];
  packages: PackageUsage[];
}