// GlucoDefense — Balance panel patient tab definitions

import { PATIENTS } from '../patients/index.js';

// Adjustable patient physiology parameters
export const PATIENT_PARAMS = [
  { key: 'insulinProductionRate', label: 'Insulin Production Rate', min: 0, max: 2, step: 0.05 },
  { key: 'insulinSensitivity', label: 'Insulin Sensitivity', min: 0.1, max: 1.5, step: 0.05 },
  { key: 'startingDegradation', label: 'Starting IR Level', min: 0, max: 5, step: 1 },
  { key: 'degradationEnabled', label: 'Degradation On (1) / Off (0)', min: 0, max: 1, step: 1 },
  { key: 'liverStorageMultiplier', label: 'Liver Storage Multiplier', min: 0.5, max: 2.0, step: 0.1 },
  { key: 'energyStartMultiplier', label: 'Starting Energy Multiplier', min: 0.5, max: 2.0, step: 0.1 },
  { key: 'energyDrainMultiplier', label: 'Energy Drain Multiplier', min: 0.1, max: 2.0, step: 0.1 },
  { key: 'rebelDamageMultiplier', label: 'Rebel Damage Multiplier', min: 0, max: 3.0, step: 0.1 },
  { key: 'kidneyAutoFilterRate', label: 'Kidney Auto-Filter Rate (%/s)', min: 0, max: 5.0, step: 0.1 },
  { key: 'liverReleaseRate', label: 'Liver Glucose Release Speed', min: 0.1, max: 3.0, step: 0.1 },
  { key: 'liverInitialStorage', label: 'Liver Initial Glucose Reserve', min: 0, max: 200, step: 10 },
  { key: 'insulinCharges', label: 'Insulin Injection Charges (0=unlimited)', min: 0, max: 30, step: 1 },
];

const STORAGE_PREFIX = 'glucodefense_balance_patient_';

// Store original patient defaults for reset
const patientDefaults = {};
for (const p of PATIENTS) {
  patientDefaults[p.id] = { ...p.physiology };
}

export function getPatientParamValue(patientId, key) {
  const patient = PATIENTS.find(p => p.id === patientId);
  if (!patient) return 0;
  const phys = patient.physiology;
  if (key === 'degradationEnabled') return phys.degradationEnabled ? 1 : 0;
  if (key === 'insulinCharges') return phys.insulinCharges ?? 0;
  if (key === 'energyDrainMultiplier') return phys.energyDrainMultiplier ?? 1.0;
  if (key === 'rebelDamageMultiplier') return phys.rebelDamageMultiplier ?? 1.0;
  if (key === 'kidneyAutoFilterRate') return phys.kidneyAutoFilterRate ?? 2.0;
  if (key === 'liverReleaseRate') return phys.liverReleaseRate ?? 1.0;
  if (key === 'liverInitialStorage') return phys.liverInitialStorage ?? 0;
  return phys[key] ?? 0;
}

export function setPatientParamValue(patientId, key, val) {
  const patient = PATIENTS.find(p => p.id === patientId);
  if (!patient) return;
  if (key === 'degradationEnabled') {
    patient.physiology.degradationEnabled = val >= 1;
  } else if (key === 'insulinCharges') {
    patient.physiology.insulinCharges = val > 0 ? val : null;
  } else {
    patient.physiology[key] = val;
  }
}

export function getPatientDefault(patientId, key) {
  const def = patientDefaults[patientId];
  if (!def) return 0;
  if (key === 'degradationEnabled') return def.degradationEnabled ? 1 : 0;
  if (key === 'insulinCharges') return def.insulinCharges ?? 0;
  if (key === 'energyDrainMultiplier') return def.energyDrainMultiplier ?? 1.0;
  if (key === 'rebelDamageMultiplier') return def.rebelDamageMultiplier ?? 1.0;
  if (key === 'kidneyAutoFilterRate') return def.kidneyAutoFilterRate ?? 2.0;
  if (key === 'liverReleaseRate') return def.liverReleaseRate ?? 1.0;
  if (key === 'liverInitialStorage') return def.liverInitialStorage ?? 0;
  return def[key] ?? 0;
}

export function savePatientBalance(patientId) {
  const data = {};
  for (const param of PATIENT_PARAMS) {
    data[param.key] = getPatientParamValue(patientId, param.key);
  }
  try {
    localStorage.setItem(STORAGE_PREFIX + patientId, JSON.stringify(data));
  } catch (_) { /* ignore */ }
}

export function loadPatientBalance(patientId) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + patientId);
    if (!raw) return;
    const data = JSON.parse(raw);
    for (const param of PATIENT_PARAMS) {
      const val = data[param.key];
      if (typeof val === 'number' && !isNaN(val) && val >= param.min && val <= param.max) {
        setPatientParamValue(patientId, param.key, val);
      }
    }
  } catch (_) { /* ignore */ }
}

export function resetPatientBalance(patientId) {
  const def = patientDefaults[patientId];
  if (!def) return;
  const patient = PATIENTS.find(p => p.id === patientId);
  if (!patient) return;
  patient.physiology = { ...def };
  try {
    localStorage.removeItem(STORAGE_PREFIX + patientId);
  } catch (_) { /* ignore */ }
}

export function copyPatientBalance(patientId) {
  const patient = PATIENTS.find(p => p.id === patientId);
  if (!patient) return '';
  const lines = PATIENT_PARAMS.map(param => {
    const val = getPatientParamValue(patientId, param.key);
    return `${param.label}: ${param.step < 1 ? val.toFixed(2) : val}`;
  });
  return `GlucoDefense Balance \u2014 ${patient.name}:\n${lines.join('\n')}`;
}

export function initPatientBalances() {
  for (const p of PATIENTS) {
    loadPatientBalance(p.id);
  }
}
