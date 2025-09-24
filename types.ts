export enum ClothingCategory {
  TOP_MANICHE_CORTE = 'Top maniche corte',
  TOP_MANICHE_LUNGHE = 'Top maniche lunghe',
  MAGLIA = 'Maglia',
  FELPA = 'Felpa',
  GIACCA = 'Giacca',
  PANTALONE = 'Pantalone',
  GONNA = 'Gonna',
}

export const TOP_CATEGORIES = [
  ClothingCategory.TOP_MANICHE_CORTE,
  ClothingCategory.TOP_MANICHE_LUNGHE,
  ClothingCategory.MAGLIA,
  ClothingCategory.FELPA,
];

export const JACKET_CATEGORIES = [ClothingCategory.GIACCA];

export const LOWER_BODY_CATEGORIES = [
  ClothingCategory.PANTALONE,
  ClothingCategory.GONNA,
];

export enum InputSlot {
  FRONT = 'front',
  SIDE = 'side',
  BACK = 'back',
  DETAIL = 'detail',
}

export enum ShotCategory {
  FULL_BODY = 'FULL_BODY',
  UPPER_BODY_TOP = 'UPPER_BODY_TOP',
  UPPER_BODY_JACKET = 'UPPER_BODY_JACKET',
  LOWER_BODY = 'LOWER_BODY',
  DETAIL = 'DETAIL',
}

export enum OutfitStatus {
  CONFIGURING = 'configuring',
  ANALYZING = 'analyzing',
  CATEGORIES_DETECTED = 'categories_detected',
  QUEUED = 'queued',
  GENERATING = 'generating',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  STOPPED = 'stopped',
  ERROR = 'error',
}

export type Shot = {
  id: number;
  description: string;
  shot_category: ShotCategory;
  required_slots: InputSlot[];
  prompt_template: string;
  relevant_categories?: ('TOP' | 'JACKET' | 'LOWER_BODY')[];
};

export type PlannedShot = Shot & {
  rationale: string;
  priority: number;
  missingSlots: InputSlot[];
};

export type ShotPlanDiagnostics = {
  requiredCategories: ClothingCategory[];
  missingDetailSupport: string[];
  missingSlots: InputSlot[];
};

export type GeneratedImage = {
  id_prompt: number;
  image: string;
  description: string;
  shot_category: ShotCategory;
  applicable_categories: string[];
  filename: string;
};

export type FramePrediction = {
  category: ClothingCategory;
  confidence: number;
};

export type FrameDescriptor = {
  id: string;
  timestamp: number;
  imageUrl?: string;
  source?: 'upload' | 'capture' | 'imported';
  predictions: FramePrediction[];
  notes?: string;
  manualExclusion?: boolean;
};

export type FrameDecision = {
  frameId: string;
  accepted: boolean;
  reason: string;
  confidence: number;
  adjustments: FramePrediction[];
};

export type DetectionCategoryScore = {
  category: ClothingCategory;
  score: number;
  supportingFrames: string[];
};

export type DetectionSummary = {
  acceptedFrames: FrameDescriptor[];
  ignoredFrames: FrameDescriptor[];
  rankedCategories: DetectionCategoryScore[];
  timeline: FrameDecision[];
  aggregatedConfidence: number;
  outlierThreshold: number;
};

export type Outfit = {
  id: string;
  name: string;
  status: OutfitStatus;
  initialImage: string | null;
  referenceFrames: FrameDescriptor[];
  ignoredFrames: FrameDescriptor[];
  analysisSummary?: DetectionSummary;
  detectedCategories: ClothingCategory[];
  confirmedCategories: Set<ClothingCategory>;
  slots: Partial<Record<InputSlot, string>>;
  shotQueue: PlannedShot[];
  planDiagnostics?: ShotPlanDiagnostics;
  currentShotIndex: number;
  generatedImages: GeneratedImage[];
  correctivePrompts: string[];
  errorMessage: string | null;
};
