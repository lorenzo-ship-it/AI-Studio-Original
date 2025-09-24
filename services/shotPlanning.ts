import {
  ClothingCategory,
  InputSlot,
  PlannedShot,
  Shot,
  ShotCategory,
  ShotPlanDiagnostics,
  JACKET_CATEGORIES,
  LOWER_BODY_CATEGORIES,
  TOP_CATEGORIES,
} from '../types';
import { SHOT_LIBRARY } from '../constants';

function categoryIntersect(
  confirmed: Set<ClothingCategory>,
  categoryList: ClothingCategory[]
): boolean {
  return categoryList.some(category => confirmed.has(category));
}

function deduplicateShots(shots: PlannedShot[]): PlannedShot[] {
  const seen = new Set<number>();
  return shots.filter(shot => {
    if (seen.has(shot.id)) {
      return false;
    }
    seen.add(shot.id);
    return true;
  });
}

function scoreShotPriority(shot: Shot): number {
  switch (shot.shot_category) {
    case ShotCategory.FULL_BODY:
      return 1;
    case ShotCategory.UPPER_BODY_TOP:
      return 2;
    case ShotCategory.UPPER_BODY_JACKET:
      return 3;
    case ShotCategory.LOWER_BODY:
      return 4;
    case ShotCategory.DETAIL:
      return 5;
    default:
      return 10;
  }
}

function buildShotPlanEntry(shot: Shot, rationale: string, availableSlots: Partial<Record<InputSlot, string>>): PlannedShot {
  const missingSlots = shot.required_slots.filter(slot => !availableSlots[slot]);
  return {
    ...shot,
    rationale,
    priority: scoreShotPriority(shot),
    missingSlots,
  };
}

function orderShots(shots: PlannedShot[]): PlannedShot[] {
  return [...shots].sort((a, b) => {
    if (a.priority === b.priority) {
      const firstSlot = a.required_slots[0];
      const secondSlot = b.required_slots[0];
      if (firstSlot === secondSlot) {
        return a.id - b.id;
      }
      return firstSlot.localeCompare(secondSlot);
    }
    return a.priority - b.priority;
  });
}

export function planShotQueue(
  confirmedCategories: Set<ClothingCategory>,
  availableSlots: Partial<Record<InputSlot, string>> = {},
  library: Shot[] = SHOT_LIBRARY
): { orderedShots: PlannedShot[]; diagnostics: ShotPlanDiagnostics } {
  const initialShots: PlannedShot[] = [];
  const diagnostics: ShotPlanDiagnostics = {
    requiredCategories: Array.from(confirmedCategories),
    missingDetailSupport: [],
    missingSlots: [],
  };

  if (!confirmedCategories.size) {
    return { orderedShots: [], diagnostics };
  }

  const topDetected = categoryIntersect(confirmedCategories, TOP_CATEGORIES);
  const jacketDetected = categoryIntersect(confirmedCategories, JACKET_CATEGORIES);
  const lowerDetected = categoryIntersect(confirmedCategories, LOWER_BODY_CATEGORIES);

  library.forEach(shot => {
    if (shot.shot_category === ShotCategory.FULL_BODY) {
      initialShots.push(
        buildShotPlanEntry(
          shot,
          'Essential base coverage to validate silhouette and styling continuity.',
          availableSlots
        )
      );
      return;
    }

    if (shot.shot_category === ShotCategory.UPPER_BODY_TOP && topDetected) {
      initialShots.push(
        buildShotPlanEntry(
          shot,
          'Top garment confirmed; capturing fit and construction.',
          availableSlots
        )
      );
      return;
    }

    if (shot.shot_category === ShotCategory.UPPER_BODY_JACKET && jacketDetected) {
      initialShots.push(
        buildShotPlanEntry(
          shot,
          'Layering piece detected; document structure and drape.',
          availableSlots
        )
      );
      return;
    }

    if (shot.shot_category === ShotCategory.LOWER_BODY && lowerDetected) {
      initialShots.push(
        buildShotPlanEntry(
          shot,
          'Lower-body garment requires dedicated coverage.',
          availableSlots
        )
      );
      return;
    }

    if (shot.shot_category === ShotCategory.DETAIL) {
      const relevant = shot.relevant_categories;
      if (!relevant ||
        (relevant.includes('TOP') && topDetected) ||
        (relevant.includes('JACKET') && jacketDetected) ||
        (relevant.includes('LOWER_BODY') && lowerDetected)
      ) {
        initialShots.push(
          buildShotPlanEntry(
            shot,
            'Detail capture scheduled to emphasize material and craftsmanship.',
            availableSlots
          )
        );
      } else {
        diagnostics.missingDetailSupport.push(shot.description);
      }
    }
  });

  const deduplicated = deduplicateShots(initialShots);
  const orderedShots = orderShots(deduplicated);

  orderedShots.forEach(shot => {
    shot.missingSlots.forEach(slot => {
      if (!diagnostics.missingSlots.includes(slot)) {
        diagnostics.missingSlots.push(slot);
      }
    });
  });

  return { orderedShots, diagnostics };
}
