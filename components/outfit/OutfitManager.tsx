import React, { useMemo, useState, useCallback } from 'react';
import { analyzeOutfitFrames } from '../../services/detection';
import { planShotQueue } from '../../services/shotPlanning';
import {
  ClothingCategory,
  DetectionSummary,
  FrameDescriptor,
  FramePrediction,
  InputSlot,
  Outfit,
  OutfitStatus,
  PlannedShot,
} from '../../types';
import { TrashIcon, RefreshIcon, CheckIcon, ChevronDownIcon } from '../Icons';

interface OutfitManagerProps {
  outfit: Outfit;
  updateOutfit: (id: string, updater: Partial<Outfit> | ((prev: Outfit) => Partial<Outfit>)) => void;
  removeOutfit: (id: string) => void;
}

type DraftPredictions = Partial<Record<ClothingCategory, number>>;

const categoryOptions = Object.values(ClothingCategory);

function createInitialDraft(): { imageUrl: string; notes: string; selected: DraftPredictions } {
  return {
    imageUrl: '',
    notes: '',
    selected: {
      [ClothingCategory.TOP_MANICHE_CORTE]: 0.85,
      [ClothingCategory.PANTALONE]: 0.65,
    },
  };
}

function formatConfidence(value: number) {
  return `${Math.round(value * 100)}%`;
}

function buildPredictionArray(selected: DraftPredictions): FramePrediction[] {
  return Object.entries(selected)
    .filter(([, confidence]) => typeof confidence === 'number' && confidence > 0)
    .map(([category, confidence]) => ({
      category: category as ClothingCategory,
      confidence: Math.min(1, Math.max(0, confidence ?? 0)),
    }));
}

const OutfitManager: React.FC<OutfitManagerProps> = ({ outfit, updateOutfit, removeOutfit }) => {
  const [draft, setDraft] = useState(createInitialDraft);
  const [showTimelineDetails, setShowTimelineDetails] = useState(false);

  const sortedFrames = useMemo(
    () => [...outfit.referenceFrames].sort((a, b) => a.timestamp - b.timestamp),
    [outfit.referenceFrames]
  );

  const handleNameChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target;
      updateOutfit(outfit.id, { name: value });
    },
    [outfit.id, updateOutfit]
  );

  const handleSlotChange = useCallback(
    (slot: InputSlot, value: string) => {
      updateOutfit(outfit.id, prev => ({
        slots: {
          ...prev.slots,
          [slot]: value.trim() ? value.trim() : undefined,
        },
      }));
    },
    [outfit.id, updateOutfit]
  );

  const handleAddFrame = useCallback(() => {
    const predictions = buildPredictionArray(draft.selected);
    if (!predictions.length) {
      return;
    }

    const frame: FrameDescriptor = {
      id: `frame-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
      timestamp: Date.now(),
      imageUrl: draft.imageUrl ? draft.imageUrl.trim() : undefined,
      notes: draft.notes ? draft.notes.trim() : undefined,
      predictions,
    };

    updateOutfit(outfit.id, prev => ({
      referenceFrames: [...prev.referenceFrames, frame],
      status: prev.status === OutfitStatus.CONFIGURING ? OutfitStatus.CONFIGURING : prev.status,
    }));

    setDraft(createInitialDraft());
  }, [draft, outfit.id, updateOutfit]);

  const handleRemoveFrame = useCallback(
    (frameId: string) => {
      updateOutfit(outfit.id, prev => ({
        referenceFrames: prev.referenceFrames.filter(frame => frame.id !== frameId),
      }));
    },
    [outfit.id, updateOutfit]
  );

  const handleToggleManualExclusion = useCallback(
    (frameId: string) => {
      updateOutfit(outfit.id, prev => ({
        referenceFrames: prev.referenceFrames.map(frame =>
          frame.id === frameId ? { ...frame, manualExclusion: !frame.manualExclusion } : frame
        ),
      }));
    },
    [outfit.id, updateOutfit]
  );

  const computeShotPlan = useCallback(
    (confirmed: Set<ClothingCategory>) => {
      const { orderedShots, diagnostics } = planShotQueue(confirmed, outfit.slots);
      return { orderedShots, diagnostics };
    },
    [outfit.slots]
  );

  const applyDetectionSummary = useCallback(
    (summary: DetectionSummary) => {
      const confidentCategories = summary.rankedCategories.filter(score => score.score >= 0.35);
      const detected = confidentCategories.map(item => item.category);
      const confirmed = new Set<ClothingCategory>(detected);
      const { orderedShots, diagnostics } = computeShotPlan(confirmed);

      updateOutfit(outfit.id, {
        status: detected.length ? OutfitStatus.CATEGORIES_DETECTED : OutfitStatus.CONFIGURING,
        detectedCategories: detected,
        confirmedCategories: confirmed,
        analysisSummary: summary,
        ignoredFrames: summary.ignoredFrames,
        shotQueue: orderedShots,
        planDiagnostics: diagnostics,
        currentShotIndex: 0,
      });
    },
    [computeShotPlan, outfit.id, updateOutfit]
  );

  const handleRunDetection = useCallback(() => {
    updateOutfit(outfit.id, { status: OutfitStatus.ANALYZING });
    const summary = analyzeOutfitFrames(outfit.referenceFrames);
    applyDetectionSummary(summary);
  }, [applyDetectionSummary, outfit.id, outfit.referenceFrames, updateOutfit]);

  const handleToggleCategory = useCallback(
    (category: ClothingCategory) => {
      updateOutfit(outfit.id, prev => {
        const nextSet = new Set(prev.confirmedCategories);
        if (nextSet.has(category)) {
          nextSet.delete(category);
        } else {
          nextSet.add(category);
        }
        const { orderedShots, diagnostics } = computeShotPlan(nextSet);
        return {
          confirmedCategories: nextSet,
          shotQueue: orderedShots,
          planDiagnostics: diagnostics,
        };
      });
    },
    [computeShotPlan, outfit.id, updateOutfit]
  );

  const handleDraftCategoryToggle = useCallback((category: ClothingCategory) => {
    setDraft(prev => {
      const currentValue = prev.selected[category];
      if (typeof currentValue === 'number' && currentValue > 0) {
        const { [category]: _, ...rest } = prev.selected;
        return { ...prev, selected: rest };
      }
      return {
        ...prev,
        selected: {
          ...prev.selected,
          [category]: 0.8,
        },
      };
    });
  }, []);

  const handleDraftConfidenceChange = useCallback((category: ClothingCategory, value: number) => {
    setDraft(prev => ({
      ...prev,
      selected: {
        ...prev.selected,
        [category]: value,
      },
    }));
  }, []);

  const planWarnings = outfit.planDiagnostics?.missingSlots ?? [];
  const detailGaps = outfit.planDiagnostics?.missingDetailSupport ?? [];

  const renderFramePredictions = (frame: FrameDescriptor) => (
    <div className="flex flex-wrap gap-2 mt-2">
      {frame.predictions.map(prediction => (
        <span
          key={`${frame.id}-${prediction.category}`}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm bg-amber-100 text-amber-800"
        >
          <span>{prediction.category}</span>
          <span className="font-semibold">{formatConfidence(prediction.confidence)}</span>
        </span>
      ))}
    </div>
  );

  const renderPlanEntry = (entry: PlannedShot, index: number) => (
    <div
      key={entry.id}
      className="border border-stone-200 rounded-lg p-4 bg-white shadow-sm"
    >
      <div className="flex items-start justify-between">
        <div>
          <h4 className="text-base font-semibold text-stone-800">
            {index + 1}. {entry.description}
          </h4>
          <p className="text-sm text-stone-500 mt-1">{entry.rationale}</p>
        </div>
        <span className="text-xs uppercase tracking-wide text-stone-400">{entry.shot_category}</span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-stone-500">
        <div className="inline-flex items-center gap-2">
          <CheckIcon className="w-4 h-4 text-emerald-500" />
          <span>Required slots: {entry.required_slots.join(', ')}</span>
        </div>
        {entry.missingSlots.length > 0 && (
          <div className="inline-flex items-center gap-2 text-amber-600">
            <ChevronDownIcon className="w-4 h-4" />
            <span>Missing: {entry.missingSlots.join(', ')}</span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <section className="bg-white rounded-2xl shadow-lg border border-stone-200 overflow-hidden">
      <header className="px-6 py-5 border-b border-stone-100 flex flex-wrap gap-4 justify-between items-center">
        <div className="flex flex-col gap-2">
          <input
            value={outfit.name}
            onChange={handleNameChange}
            className="text-xl font-semibold text-stone-800 bg-transparent focus:outline-none focus:ring-2 focus:ring-amber-400 rounded-md px-2 py-1"
          />
          <span className="text-sm text-stone-500">Status: {outfit.status}</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRunDetection}
            className="inline-flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-700 transition"
          >
            <RefreshIcon className="w-4 h-4" />
            <span>Re-run detection</span>
          </button>
          <button
            onClick={() => removeOutfit(outfit.id)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
          >
            <TrashIcon className="w-4 h-4" />
            <span>Remove</span>
          </button>
        </div>
      </header>

      <div className="px-6 py-6 space-y-10">
        <section>
          <h3 className="text-lg font-semibold text-stone-800">Reference timeline</h3>
          <p className="text-sm text-stone-500 mt-1">
            Maintain chronological order and mark any mistakes so they are ignored during analysis.
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-[2fr_3fr]">
            <div className="border border-dashed border-amber-300 rounded-xl p-4 bg-amber-50/40">
              <h4 className="font-semibold text-stone-700">Add frame</h4>
              <label className="block mt-3 text-sm text-stone-500">
                Image URL (optional)
                <input
                  value={draft.imageUrl}
                  onChange={event => setDraft(prev => ({ ...prev, imageUrl: event.target.value }))}
                  placeholder="https://..."
                  className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </label>
              <label className="block mt-3 text-sm text-stone-500">
                Notes
                <textarea
                  value={draft.notes}
                  onChange={event => setDraft(prev => ({ ...prev, notes: event.target.value }))}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="Optional observations (lighting, occlusion, etc.)"
                />
              </label>
              <div className="mt-4">
                <p className="text-sm font-medium text-stone-600">Predicted categories</p>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {categoryOptions.map(category => {
                    const confidence = draft.selected[category];
                    const isActive = typeof confidence === 'number';
                    return (
                      <div
                        key={category}
                        className={`rounded-lg border px-3 py-2 text-sm transition ${
                          isActive ? 'border-amber-400 bg-amber-50 shadow-sm' : 'border-stone-200'
                        }`}
                      >
                        <label className="flex items-center justify-between gap-3">
                          <span className="text-stone-700">{category}</span>
                          <input
                            type="checkbox"
                            checked={isActive}
                            onChange={() => handleDraftCategoryToggle(category)}
                          />
                        </label>
                        {isActive && (
                          <label className="mt-2 block text-xs text-stone-500">
                            Confidence: {formatConfidence(confidence ?? 0)}
                            <input
                              type="range"
                              min={40}
                              max={100}
                              value={Math.round((confidence ?? 0) * 100)}
                              onChange={event => handleDraftConfidenceChange(category, Number(event.target.value) / 100)}
                              className="w-full"
                            />
                          </label>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              <button
                onClick={handleAddFrame}
                className="mt-4 w-full px-4 py-2 rounded-lg bg-amber-500 text-white font-semibold hover:bg-amber-600 transition"
              >
                Append to timeline
              </button>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {sortedFrames.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-stone-400 border border-stone-200 rounded-lg p-8">
                  No frames yet. Add references to enable high-precision detection.
                </div>
              ) : (
                sortedFrames.map(frame => (
                  <div
                    key={frame.id}
                    className={`border rounded-lg p-4 transition ${
                      frame.manualExclusion ? 'bg-red-50 border-red-200' : 'bg-white border-stone-200'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-stone-700">{new Date(frame.timestamp).toLocaleString()}</p>
                        {frame.notes && <p className="text-xs text-stone-500 mt-1">{frame.notes}</p>}
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleToggleManualExclusion(frame.id)}
                          className={`px-3 py-1 rounded-md text-sm font-medium border transition ${
                            frame.manualExclusion
                              ? 'border-red-400 text-red-600 bg-red-100/60'
                              : 'border-stone-200 text-stone-600 hover:border-stone-300'
                          }`}
                        >
                          {frame.manualExclusion ? 'Mistake' : 'Mark mistake'}
                        </button>
                        <button
                          onClick={() => handleRemoveFrame(frame.id)}
                          className="p-2 rounded-md border border-transparent text-red-500 hover:bg-red-50"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {renderFramePredictions(frame)}
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-stone-800">Detection summary</h3>
            <button
              onClick={() => setShowTimelineDetails(prev => !prev)}
              className="text-sm text-amber-600 hover:text-amber-700"
            >
              {showTimelineDetails ? 'Hide timeline' : 'Show timeline decisions'}
            </button>
          </div>
          {outfit.analysisSummary ? (
            <div className="mt-4 space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-stone-200 p-4 bg-stone-50">
                  <p className="text-sm text-stone-500">Consensus confidence</p>
                  <p className="text-2xl font-semibold text-stone-800 mt-1">
                    {formatConfidence(outfit.analysisSummary.aggregatedConfidence)}
                  </p>
                  <p className="text-xs text-stone-400 mt-2">
                    Outlier threshold: {outfit.analysisSummary.outlierThreshold.toFixed(2)}
                  </p>
                </div>
                <div className="rounded-xl border border-stone-200 p-4 bg-stone-50">
                  <p className="text-sm text-stone-500">Ignored frames</p>
                  <p className="text-2xl font-semibold text-stone-800 mt-1">{outfit.analysisSummary.ignoredFrames.length}</p>
                  <p className="text-xs text-stone-400 mt-2">
                    Frames flagged manually or detected as chronological outliers are excluded from training data.
                  </p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {outfit.analysisSummary.rankedCategories.map(score => (
                  <div
                    key={score.category}
                    className="border border-emerald-200 bg-emerald-50 rounded-xl p-4"
                  >
                    <p className="text-sm text-emerald-600 uppercase tracking-wide">Detected</p>
                    <p className="text-lg font-semibold text-emerald-900 mt-1">{score.category}</p>
                    <p className="text-sm text-emerald-700 mt-2">Confidence {formatConfidence(score.score)}</p>
                    <p className="text-xs text-emerald-500 mt-2">
                      Supported by {score.supportingFrames.length} frame{score.supportingFrames.length === 1 ? '' : 's'}
                    </p>
                  </div>
                ))}
                {outfit.analysisSummary.rankedCategories.length === 0 && (
                  <div className="border border-stone-200 rounded-xl p-4 text-sm text-stone-400">
                    No reliable garment categories detected yet. Add clearer frames and re-run detection.
                  </div>
                )}
              </div>
              {showTimelineDetails && (
                <div className="border border-stone-200 rounded-xl divide-y">
                  {outfit.analysisSummary.timeline.map(decision => (
                    <div key={decision.frameId} className="p-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-stone-700">Frame {decision.frameId}</p>
                        <p className="text-xs text-stone-500">{decision.reason}</p>
                      </div>
                      <div className="text-sm text-stone-500">
                        Score: {decision.confidence.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="mt-4 text-sm text-stone-400">
              Run detection to generate a high-precision analysis of the reference timeline.
            </div>
          )}
        </section>

        <section>
          <h3 className="text-lg font-semibold text-stone-800">Confirm garment categories</h3>
          <p className="text-sm text-stone-500 mt-1">
            Toggle to fine-tune the categories before locking the shot list.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {categoryOptions.map(category => {
              const detected = outfit.detectedCategories.includes(category);
              const confirmed = outfit.confirmedCategories.has(category);
              return (
                <button
                  key={category}
                  onClick={() => handleToggleCategory(category)}
                  className={`px-4 py-2 rounded-full border text-sm transition ${
                    confirmed
                      ? 'border-emerald-400 bg-emerald-50 text-emerald-700 shadow-sm'
                      : detected
                      ? 'border-amber-300 text-amber-600 bg-amber-50'
                      : 'border-stone-200 text-stone-400'
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <h3 className="text-lg font-semibold text-stone-800">Slot readiness</h3>
          <p className="text-sm text-stone-500 mt-1">
            Provide reference captures for each angle to accelerate the photoshoot pipeline.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Object.values(InputSlot).map(slot => (
              <label key={slot} className="border border-stone-200 rounded-xl p-4">
                <span className="text-sm font-medium text-stone-600 uppercase tracking-wide">{slot}</span>
                <input
                  value={outfit.slots[slot] ?? ''}
                  onChange={event => handleSlotChange(slot, event.target.value)}
                  placeholder="URL or reference"
                  className="mt-2 w-full rounded-lg border border-stone-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </label>
            ))}
          </div>
          {planWarnings.length > 0 && (
            <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              Missing input slots for: {planWarnings.join(', ')}
            </div>
          )}
          {detailGaps.length > 0 && (
            <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              Detail shots deferred until these categories are confirmed: {detailGaps.join(', ')}
            </div>
          )}
        </section>

        <section>
          <h3 className="text-lg font-semibold text-stone-800">Optimized shot queue</h3>
          {outfit.shotQueue.length ? (
            <div className="mt-4 grid gap-3">
              {outfit.shotQueue.map((entry, index) => renderPlanEntry(entry, index))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-stone-400">
              Confirm categories to generate a prioritized shot queue.
            </p>
          )}
        </section>
      </div>
    </section>
  );
};

export default React.memo(OutfitManager);
