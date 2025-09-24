import { Shot, ShotCategory, InputSlot } from './types';

export const SHOT_LIBRARY: Shot[] = [
  {
    id: 1,
    description: 'Full-body side walking',
    shot_category: ShotCategory.FULL_BODY,
    required_slots: [InputSlot.SIDE],
    prompt_template:
      'Full-body shot of the model walking from the side. The model is taking a small step forward to show subtle garment movement. Keep the image sharp with no motion blur.',
  },
  {
    id: 2,
    description: 'Full-body front standing (Anchor)',
    shot_category: ShotCategory.FULL_BODY,
    required_slots: [InputSlot.FRONT],
    prompt_template:
      'Fashion e-commerce studio photo of a single model wearing the provided outfit, full-body, front-facing, centered, standing naturally with arms relaxed and feet hip-width, eyes to camera. Aesthetic: modern, premium, minimal.',
  },
  {
    id: 3,
    description: 'Full-body back standing',
    shot_category: ShotCategory.FULL_BODY,
    required_slots: [InputSlot.BACK],
    prompt_template:
      'Full-body back view of the model in the same outfit. Neutral posture, arms relaxed, heels together. Include the entire figure from head to toe.',
  },
  {
    id: 4,
    description: 'Full-body seated',
    shot_category: ShotCategory.FULL_BODY,
    required_slots: [InputSlot.FRONT],
    prompt_template:
      'The model is seated on a simple studio block, 3/4 view with relaxed hands. The shot should include most of the body (knees visible) without clipping shoes or head, showcasing the fabric drape.',
  },
  {
    id: 5,
    description: 'Upper body front 3/4 crop',
    shot_category: ShotCategory.UPPER_BODY_TOP,
    required_slots: [InputSlot.FRONT],
    prompt_template:
      'Upper body 3/4 cropped shot from the front of a model wearing the top. Frame from sternum to just above the head.',
  },
  {
    id: 6,
    description: 'Upper body side 3/4 crop',
    shot_category: ShotCategory.UPPER_BODY_TOP,
    required_slots: [InputSlot.SIDE],
    prompt_template:
      "Upper body 3/4 cropped shot from the side of a model wearing the top, showing the silhouette.",
  },
  {
    id: 7,
    description: 'Upper body back crop',
    shot_category: ShotCategory.UPPER_BODY_TOP,
    required_slots: [InputSlot.BACK],
    prompt_template:
      'Upper body cropped shot from the back of a model wearing the top, showing construction details.',
  },
  {
    id: 8,
    description: 'Detail neckline & collar',
    shot_category: ShotCategory.DETAIL,
    required_slots: [InputSlot.DETAIL],
    prompt_template:
      "Tight crop detail of the top garment, focusing on the neckline, chest, and shoulders, with sharp fabric texture.",
    relevant_categories: ['TOP'],
  },
  {
    id: 9,
    description: 'Detail sleeve & cuff/hem',
    shot_category: ShotCategory.DETAIL,
    required_slots: [InputSlot.DETAIL],
    prompt_template:
      "Detailed close-up shot of the top's sleeve cuff and hem, highlighting stitching and material.",
    relevant_categories: ['TOP'],
  },
  {
    id: 10,
    description: 'Jacket front (open)',
    shot_category: ShotCategory.UPPER_BODY_JACKET,
    required_slots: [InputSlot.FRONT],
    prompt_template:
      'Upper body shot of a model wearing the jacket open, showing the front, lapels, and how it layers.',
  },
  {
    id: 11,
    description: 'Jacket side',
    shot_category: ShotCategory.UPPER_BODY_JACKET,
    required_slots: [InputSlot.SIDE],
    prompt_template:
      "Upper body shot from the side, showing the jacket's silhouette and fit through the shoulders and torso.",
  },
  {
    id: 12,
    description: 'Jacket back',
    shot_category: ShotCategory.UPPER_BODY_JACKET,
    required_slots: [InputSlot.BACK],
    prompt_template:
      "Upper body shot from the back, showing the jacket's construction, seams, and any back details.",
  },
  {
    id: 13,
    description: 'Detail closures (zip/buttons)',
    shot_category: ShotCategory.DETAIL,
    required_slots: [InputSlot.DETAIL],
    prompt_template:
      "Detailed close-up of the jacket's closures, like zippers, buttons, or pockets, with sharp focus on the hardware and surrounding fabric.",
    relevant_categories: ['JACKET'],
  },
  {
    id: 14,
    description: 'Lower body front straight',
    shot_category: ShotCategory.LOWER_BODY,
    required_slots: [InputSlot.FRONT],
    prompt_template:
      'Lower body shot from the front, showing the pants or skirt from waist to ankles.',
  },
  {
    id: 15,
    description: 'Lower body side',
    shot_category: ShotCategory.LOWER_BODY,
    required_slots: [InputSlot.SIDE],
    prompt_template:
      'Lower body shot from the side, showing the fit and silhouette of the pants or skirt.',
  },
  {
    id: 16,
    description: 'Lower body back',
    shot_category: ShotCategory.LOWER_BODY,
    required_slots: [InputSlot.BACK],
    prompt_template:
      'Lower body shot from the back of the pants or skirt, showing seat and leg shape.',
  },
  {
    id: 17,
    description: 'Sitting pose (crease behavior)',
    shot_category: ShotCategory.LOWER_BODY,
    required_slots: [InputSlot.FRONT],
    prompt_template:
      'Close-up on the lower body in a sitting pose to show fabric creasing and drape over the thighs.',
  },
  {
    id: 18,
    description: 'Waistband & closure detail',
    shot_category: ShotCategory.DETAIL,
    required_slots: [InputSlot.DETAIL],
    prompt_template:
      'Tight crop detail of the pants or skirt, focusing on the waistband, pleats, and closure. Ensure true fabric color and texture are visible.',
    relevant_categories: ['LOWER_BODY'],
  },
  {
    id: 19,
    description: 'Zoom front pockets',
    shot_category: ShotCategory.DETAIL,
    required_slots: [InputSlot.DETAIL],
    prompt_template:
      'Detailed close-up of the front pocket area of the pants or skirt, highlighting the design and construction.',
    relevant_categories: ['LOWER_BODY'],
  },
  {
    id: 20,
    description: 'Macro fabric close-up',
    shot_category: ShotCategory.DETAIL,
    required_slots: [InputSlot.DETAIL],
    prompt_template:
      'Macro close-up shot of the fabric texture and weave, showing the material quality.',
  },
];

export const NEGATIVE_PROMPT =
  'cropped head or feet, side/back view, extreme pose, motion blur, extra limbs/fingers, duplicate person, distorted hands, bad anatomy, unrealistic proportions, overexposed, underexposed, heavy filters, neon colors, fantasy elements, non-human, mannequin headless, duplicate clothing items, unrelated objects, camera artifacts, glare, moiré, excessive makeup, text, watermark, logo, frame, border, busy background, low resolution, low contrast, harsh color cast';
