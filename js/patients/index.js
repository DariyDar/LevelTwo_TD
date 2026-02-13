// GlucoDefense — Patient definitions

export const PATIENTS = [
  {
    id: 'healthy',
    name: 'Healthy Person',
    emoji: '\u{1F3C3}',
    color: '#2ECC71',
    description: 'Normal metabolism, no medications needed.',
    physiology: {
      startingDegradation: 0,
      insulinProductionRate: 1.5,
      insulinSensitivity: 1.0,
      degradationEnabled: false,
      liverStorageMultiplier: 1.2,
      energyStartMultiplier: 1.2,
      insulinCharges: null, // unlimited (cooldown-based)
    },
    availableInterventions: ['walk', 'exercise'],
    days: [
      { dayId: 1, levelRef: 1, name: 'Day 1: Normal Day' },
      { dayId: 2, levelRef: 2, name: 'Day 2: Office Lunch' },
      { dayId: 3, levelRef: 3, name: 'Day 3: Birthday' },
      { dayId: 4, levelRef: 4, name: 'Day 4: Weekend' },
      { dayId: 5, levelRef: 5, name: 'Day 5: Stress' },
    ],
  },
  {
    id: 'type1',
    name: 'Type 1 Diabetes',
    emoji: '\u{1F489}',
    color: '#3498DB',
    description: 'No insulin production. Must inject insulin.',
    physiology: {
      startingDegradation: 0,
      insulinProductionRate: 0.05,
      insulinSensitivity: 1.0,
      degradationEnabled: false,
      liverStorageMultiplier: 1.0,
      energyStartMultiplier: 1.0,
      insulinCharges: 15, // limited insulin injections
    },
    availableInterventions: ['walk', 'exercise', 'insulin'],
    days: [
      { dayId: 1, levelRef: 1, name: 'Day 1: First Injections' },
      { dayId: 2, levelRef: 2, name: 'Day 2: Counting Carbs' },
      { dayId: 3, levelRef: 3, name: 'Day 3: Party Challenge' },
      { dayId: 4, levelRef: 4, name: 'Day 4: Active Day' },
      { dayId: 5, levelRef: 5, name: 'Day 5: Fine Tuning' },
    ],
  },
  {
    id: 'type2',
    name: 'Type 2 Diabetes',
    emoji: '\u{1FA7A}',
    color: '#F39C12',
    description: 'Insulin resistance develops over time.',
    physiology: {
      startingDegradation: 0,
      insulinProductionRate: 1.0,
      insulinSensitivity: 1.0,
      degradationEnabled: true,
      liverStorageMultiplier: 1.0,
      energyStartMultiplier: 1.0,
      insulinCharges: null,
    },
    availableInterventions: ['walk', 'exercise', 'semaglutide', 'metformin', 'dapagliflozin'],
    days: [
      { dayId: 1, levelRef: 1, name: 'Day 1: Diagnosis' },
      { dayId: 2, levelRef: 2, name: 'Day 2: Office Lunch' },
      { dayId: 3, levelRef: 3, name: 'Day 3: Birthday Party' },
      { dayId: 4, levelRef: 4, name: 'Day 4: Weekend' },
      { dayId: 5, levelRef: 5, name: 'Day 5: Management' },
    ],
  },
  {
    id: 'type2advanced',
    name: 'Type 2 Advanced',
    emoji: '\u26A0\uFE0F',
    color: '#E74C3C',
    description: 'Significant organ degradation already present.',
    physiology: {
      startingDegradation: 2,
      insulinProductionRate: 0.7,
      insulinSensitivity: 0.6,
      degradationEnabled: true,
      liverStorageMultiplier: 0.8,
      energyStartMultiplier: 0.8,
      insulinCharges: null,
    },
    availableInterventions: ['walk', 'exercise', 'semaglutide', 'metformin', 'dapagliflozin'],
    days: [
      { dayId: 1, levelRef: 1, name: 'Day 1: Complications' },
      { dayId: 2, levelRef: 2, name: 'Day 2: Diet Change' },
      { dayId: 3, levelRef: 3, name: 'Day 3: Strict Control' },
      { dayId: 4, levelRef: 4, name: 'Day 4: Emergency' },
      { dayId: 5, levelRef: 5, name: 'Day 5: Survival' },
    ],
  },
];

export function getPatient(id) {
  return PATIENTS.find(p => p.id === id) || null;
}
