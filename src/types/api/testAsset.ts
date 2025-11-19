// FILE: AdFlowPro_ui/src/types/api/testAsset.ts
import type { PerformActionPayload } from "./common";
import type  GraphData  from "@logicflow/core";

// --- L1: Atomic Operation ---
export interface MatcherCoordinates {
  left: number;
  top: number;
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
  matchMode?: "fuzzy" | "regex" | "fuzzy_with_coords";
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
  screenRegion: ScreenRegion;
  spatialRelation?: SpatialRelation | null;
}

export interface SceneSnapshot {
  primaryMatcher: Matcher;
  secondaryMatchers: SecondaryMatcher[];
}

export interface AtomicOperationPublic {
  atomId: number;
  name: string;
  categoryId?: number | null;
  categoryName?: string | null;
  description?: string;
  priority: number;
  executionCountLimit: number;
  continueAfterMatch: boolean;
  sceneSnapshotJson: SceneSnapshot;
  actionsJson: PerformActionPayload[];
  createdAt: string;
  updatedAt: string;
}

export interface AtomicOperationCreatePayload {
  name: string;
  description?: string;
  categoryId?: number | null;
  priority?: number;
  executionCountLimit?: number;
  continueAfterMatch?: boolean;
  sceneSnapshotJson: SceneSnapshot;
  actionsJson: PerformActionPayload[];
}

export interface AtomicOperationUpdatePayload {
  name?: string;
  description?: string;
  categoryId?: number | null;
  priority?: number;
  executionCountLimit?: number;
  continueAfterMatch?: boolean;
  sceneSnapshotJson?: SceneSnapshot;
  actionsJson?: PerformActionPayload[];
}

// --- L2: Test Package ---
export interface TestPackagePublic {
  packageId: number;
  name: string;
  description?: string;
  isCommon: boolean;
  categoryId?: number | null;
  createdAt: string;
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
export interface TestCaseListPublic {
  caseId: number;
  name: string;
  caseType: "linear" | "flow";
  description?: string;
  totalTimeoutS?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TestCasePublic extends TestCaseListPublic {
  packages: TestPackagePublic[];
  flowchartData?: GraphData | object | null;
}

export interface TestCaseCreatePayload {
  name: string;
  description?: string;
  caseType: "linear" | "flow";
  totalTimeoutS?: number;
  packageIds?: number[];
  flowchartData?: GraphData | object | null;
}

export interface TestCaseUpdatePayload {
  name?: string;
  description?: string;
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
}

export interface TestSuitePublic extends TestSuiteListPublic {
  cases: TestCaseListPublic[];
  flowchartData?: GraphData;
}

export interface TestSuiteCreatePayload {
  name: string;
  description?: string;
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
  targetAppPackage?: string;
  defocusGuardTimeoutS?: number;
  noMatchDelayMs?: number;
  postActionDelayMs?: number;
  screenshotQuality?: number;
  caseIds?: number[]; // For linear mode
  flowchartData?: GraphData; // for flow mode
}
