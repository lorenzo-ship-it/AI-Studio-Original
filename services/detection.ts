import {
  ClothingCategory,
  DetectionCategoryScore,
  DetectionSummary,
  FrameDecision,
  FrameDescriptor,
  FramePrediction,
} from '../types';

const MIN_CONFIDENCE = 0.25;
const OUTLIER_STRICTNESS = 1.6;

const weightByCategoryGroup: Partial<Record<ClothingCategory, number>> = {
  [ClothingCategory.GIACCA]: 1.1,
};

function normalizePredictions(predictions: FramePrediction[]): FramePrediction[] {
  const filtered = predictions
    .filter(prediction => prediction.confidence >= MIN_CONFIDENCE)
    .map(prediction => ({ ...prediction, confidence: Math.min(1, Math.max(0, prediction.confidence)) }));

  const total = filtered.reduce((sum, prediction) => sum + prediction.confidence, 0);
  if (!total) {
    return filtered;
  }

  return filtered.map(prediction => ({
    ...prediction,
    confidence: prediction.confidence / total,
  }));
}

function trimmedMean(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  if (values.length < 4) {
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const trimCount = Math.floor(sorted.length * 0.15);
  const trimmed = sorted.slice(trimCount, sorted.length - trimCount);
  if (!trimmed.length) {
    return sorted[Math.floor(sorted.length / 2)];
  }

  return trimmed.reduce((sum, value) => sum + value, 0) / trimmed.length;
}

function median(values: number[]): number {
  if (!values.length) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
}

function computeCategoryConsensus(frames: FrameDescriptor[]): Map<ClothingCategory, number> {
  const categoryScores = new Map<ClothingCategory, number[]>();

  frames.forEach(frame => {
    frame.predictions.forEach(prediction => {
      if (!categoryScores.has(prediction.category)) {
        categoryScores.set(prediction.category, []);
      }
      categoryScores.get(prediction.category)!.push(prediction.confidence);
    });
  });

  const consensus = new Map<ClothingCategory, number>();
  categoryScores.forEach((scores, category) => {
    const mean = trimmedMean(scores);
    const weight = weightByCategoryGroup[category] ?? 1;
    consensus.set(category, mean * weight);
  });

  return consensus;
}

function computeAgreementScores(
  frames: FrameDescriptor[],
  baseline: Map<ClothingCategory, number>
): Map<string, number> {
  const baselineTotal = Array.from(baseline.values()).reduce((sum, score) => sum + score, 0);
  const agreement = new Map<string, number>();

  frames.forEach(frame => {
    let matchedSupport = 0;
    let frameStrength = 0;

    baseline.forEach((consensusScore, category) => {
      const prediction = frame.predictions.find(item => item.category === category);
      const support = prediction ? Math.min(prediction.confidence, consensusScore) : 0;
      matchedSupport += support;
    });

    frameStrength = frame.predictions.reduce((sum, prediction) => sum + prediction.confidence, 0);
    const normalizedCoverage = baselineTotal ? matchedSupport / baselineTotal : 0;
    const normalizedStrength = frame.predictions.length ? frameStrength / frame.predictions.length : 0;
    const score = 0.72 * normalizedCoverage + 0.28 * normalizedStrength;
    agreement.set(frame.id, score);
  });

  return agreement;
}

function detectOutliers(
  frames: FrameDescriptor[],
  agreementScores: Map<string, number>
): { accepted: Set<string>; rejected: Set<string>; threshold: number } {
  const scores = frames.map(frame => agreementScores.get(frame.id) ?? 0);
  if (!scores.length) {
    return { accepted: new Set(), rejected: new Set(), threshold: 0 };
  }

  const medianScore = median(scores);
  const mad = median(scores.map(score => Math.abs(score - medianScore)));
  const scaledMad = mad === 0 ? 0.05 : mad * 1.4826;
  const threshold = medianScore - OUTLIER_STRICTNESS * scaledMad;

  const accepted = new Set<string>();
  const rejected = new Set<string>();

  frames.forEach(frame => {
    const score = agreementScores.get(frame.id) ?? 0;
    if (score >= threshold) {
      accepted.add(frame.id);
    } else {
      rejected.add(frame.id);
    }
  });

  return { accepted, rejected, threshold };
}

function buildCategorySummary(
  frames: FrameDescriptor[],
  accepted: Set<string>
): DetectionCategoryScore[] {
  const categoryMap = new Map<ClothingCategory, { score: number; supportingFrames: Set<string> }>();

  frames.forEach(frame => {
    if (!accepted.has(frame.id)) {
      return;
    }

    frame.predictions.forEach(prediction => {
      const existing = categoryMap.get(prediction.category);
      if (!existing) {
        categoryMap.set(prediction.category, {
          score: prediction.confidence,
          supportingFrames: new Set([frame.id]),
        });
        return;
      }

      existing.score += prediction.confidence;
      existing.supportingFrames.add(frame.id);
    });
  });

  return Array.from(categoryMap.entries())
    .map(([category, value]) => ({
      category,
      score: value.score / value.supportingFrames.size,
      supportingFrames: Array.from(value.supportingFrames),
    }))
    .sort((a, b) => b.score - a.score);
}

export function analyzeOutfitFrames(frames: FrameDescriptor[]): DetectionSummary {
  if (!frames.length) {
    return {
      acceptedFrames: [],
      ignoredFrames: [],
      rankedCategories: [],
      timeline: [],
      aggregatedConfidence: 0,
      outlierThreshold: 0,
    };
  }

  const chronologicalFrames = [...frames]
    .map(frame => ({
      ...frame,
      predictions: normalizePredictions(frame.predictions),
    }))
    .sort((a, b) => a.timestamp - b.timestamp);

  const informativeFrames = chronologicalFrames.filter(frame => !frame.manualExclusion && frame.predictions.length);
  const excludedByUser = chronologicalFrames.filter(frame => frame.manualExclusion || !frame.predictions.length);

  if (!informativeFrames.length) {
    return {
      acceptedFrames: [],
      ignoredFrames: chronologicalFrames,
      rankedCategories: [],
      timeline: chronologicalFrames.map(frame => ({
        frameId: frame.id,
        accepted: false,
        reason: frame.manualExclusion ? 'User flagged as mistake' : 'No confident predictions',
        confidence: 0,
        adjustments: [],
      })),
      aggregatedConfidence: 0,
      outlierThreshold: 0,
    };
  }

  const consensus = computeCategoryConsensus(informativeFrames);
  const agreementScores = computeAgreementScores(informativeFrames, consensus);
  const { accepted, rejected, threshold } = detectOutliers(informativeFrames, agreementScores);

  const decisions: FrameDecision[] = chronologicalFrames.map(frame => {
    if (frame.manualExclusion || !frame.predictions.length) {
      return {
        frameId: frame.id,
        accepted: false,
        reason: frame.manualExclusion ? 'User flagged as mistake' : 'Insufficient confidence',
        confidence: 0,
        adjustments: [],
      };
    }

    const score = agreementScores.get(frame.id) ?? 0;
    const acceptedFrame = accepted.has(frame.id);
    return {
      frameId: frame.id,
      accepted: acceptedFrame,
      reason: acceptedFrame ? 'Aligned with consensus' : 'Detected as chronological outlier',
      confidence: score,
      adjustments: frame.predictions,
    };
  });

  const acceptedFrames = chronologicalFrames.filter(frame => accepted.has(frame.id));
  const rejectedFrames = chronologicalFrames.filter(frame => rejected.has(frame.id));

  const rankedCategories = buildCategorySummary(chronologicalFrames, accepted);
  const aggregatedConfidence = acceptedFrames.length
    ? acceptedFrames.reduce((sum, frame) => sum + (agreementScores.get(frame.id) ?? 0), 0) / acceptedFrames.length
    : 0;

  const ignoredFrames = [...excludedByUser, ...rejectedFrames.filter(frame => !frame.manualExclusion)];

  return {
    acceptedFrames,
    ignoredFrames,
    rankedCategories,
    timeline: decisions,
    aggregatedConfidence,
    outlierThreshold: threshold,
  };
}
