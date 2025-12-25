import { promises as fs } from 'node:fs';

import { log, pathExists, readJson } from '../utils/index.js';

export type FieldType = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'date' | 'null' | 'unknown';

export interface SchemaFieldRule {
  type: FieldType;
  optional?: boolean;
  enum?: Array<string | number | boolean>;
  description?: string;
}

export type SchemaDefinition = Record<string, FieldType | SchemaFieldRule>;

export interface SchemaProfile {
  totalRecords: number;
  fieldPresence: Record<string, number>;
  typeDistribution: Record<string, Record<FieldType, number>>;
}

export interface SchemaDrift {
  field: string;
  kind: 'missing-field' | 'new-field' | 'presence-drift' | 'type-drift' | 'enum-violation';
  description: string;
  delta?: number;
}

export interface SchemaValidateOptions {
  dataset?: Array<Record<string, unknown>>;
  datasetPath?: string;
  schema?: SchemaDefinition;
  schemaPath?: string;
  allowAdditionalFields?: boolean;
  driftBaselinePath?: string;
  driftThreshold?: number;
  failOnError?: boolean;
}

export interface SchemaValidationResult {
  valid: boolean;
  errors: string[];
  profile: SchemaProfile;
  drift?: SchemaDrift[];
}

function formatValue(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  try {
    return JSON.stringify(value);
  } catch {
    if (typeof value === 'object') {
      return '[unserializable object]';
    }
    return `[${typeof value} value]`;
  }
}

function detectType(value: unknown): FieldType {
  if (value === null || value === undefined) { return 'null'; }
  if (Array.isArray(value)) { return 'array'; }
  if (value instanceof Date) { return 'date'; }
  if (typeof value === 'string') {
    const isoDate = Date.parse(value);
    if (!Number.isNaN(isoDate) && value.length >= 10 && value.length <= 30) {
      return 'date';
    }
    return 'string';
  }
  if (typeof value === 'number') { return 'number'; }
  if (typeof value === 'boolean') { return 'boolean'; }
  if (typeof value === 'object') { return 'object'; }
  return 'unknown';
}

async function loadDataset(dataset?: Array<Record<string, unknown>>, datasetPath?: string): Promise<Array<Record<string, unknown>>> {
  if (dataset) { return dataset; }
  if (!datasetPath) {
    throw new Error('dataset or datasetPath is required for schema validation');
  }

  const content = await fs.readFile(datasetPath, 'utf-8');
  try {
    const parsed = JSON.parse(content) as unknown;
    if (Array.isArray(parsed)) {
      return parsed as Array<Record<string, unknown>>;
    }
    if (Array.isArray((parsed as { data?: unknown[] }).data)) {
      return ((parsed as { data: unknown[] }).data as Array<Record<string, unknown>>);
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse dataset: ${reason}`);
  }

  throw new Error('Dataset file must contain an array or an object with a data array');
}

async function loadSchema(schema?: SchemaDefinition, schemaPath?: string): Promise<SchemaDefinition> {
  if (schema) { return schema; }
  if (!schemaPath) {
    throw new Error('schema or schemaPath is required for schema validation');
  }

  return readJson<SchemaDefinition>(schemaPath);
}

function buildProfile(records: Array<Record<string, unknown>>): SchemaProfile {
  const fieldPresence: Record<string, number> = {};
  const typeDistribution: Record<string, Record<FieldType, number>> = {};

  for (const record of records) {
    const keys = Object.keys(record);
    for (const key of keys) {
      fieldPresence[key] = (fieldPresence[key] || 0) + 1;
      const fieldType = detectType(record[key]);
      const distribution = (typeDistribution[key] = typeDistribution[key] || {
        string: 0,
        number: 0,
        boolean: 0,
        object: 0,
        array: 0,
        date: 0,
        null: 0,
        unknown: 0,
      });
      distribution[fieldType] += 1;
    }
  }

  const totalRecords = records.length || 1;
  for (const [field, count] of Object.entries(fieldPresence)) {
    fieldPresence[field] = count / totalRecords;
  }

  return { totalRecords: records.length, fieldPresence, typeDistribution };
}

function validateRecord(
  record: Record<string, unknown>,
  schema: SchemaDefinition,
  allowAdditionalFields: boolean,
): string[] {
  const errors: string[] = [];
  const schemaEntries = Object.entries(schema);

  for (const [field, rule] of schemaEntries) {
    const config: SchemaFieldRule = typeof rule === 'string' ? { type: rule } : rule;
    const value = record[field];
    const valueType = detectType(value);

    if ((value === undefined || value === null) && config.optional) {
      continue;
    }

    if (value === undefined || value === null) {
      errors.push(`Field "${field}" is required but missing or null.`);
      continue;
    }

    if (valueType !== config.type) {
      errors.push(`Field "${field}" expected type ${config.type} but received ${valueType}.`);
      continue;
    }

    if (config.enum && !config.enum.includes(value as never)) {
      errors.push(
        `Field "${field}" value ${formatValue(value)} is not in allowed enum: ${config.enum.join(', ')}.`,
      );
    }
  }

  if (!allowAdditionalFields) {
    for (const key of Object.keys(record)) {
      if (!schema[key]) {
        errors.push(`Unexpected field "${key}" present in record.`);
      }
    }
  }

  return errors;
}

function detectDrift(
  profile: SchemaProfile,
  baseline: SchemaProfile,
  threshold: number,
): SchemaDrift[] {
  const drift: SchemaDrift[] = [];
  const fields = new Set([...Object.keys(profile.fieldPresence), ...Object.keys(baseline.fieldPresence)]);

  for (const field of fields) {
    const currentPresence = profile.fieldPresence[field];
    const baselinePresence = baseline.fieldPresence[field];

    if (baselinePresence === undefined) {
      drift.push({ field, kind: 'new-field', description: `Field "${field}" not present in baseline.` });
      continue;
    }

    if (currentPresence === undefined) {
      drift.push({ field, kind: 'missing-field', description: `Field "${field}" missing from current dataset.` });
      continue;
    }

    const delta = Math.abs(currentPresence - baselinePresence) / Math.max(baselinePresence, 0.0001);
    if (delta > threshold) {
      drift.push({
        field,
        kind: 'presence-drift',
        description: `Field "${field}" presence drifted by ${(delta * 100).toFixed(1)}% (baseline ${(baselinePresence * 100).toFixed(1)}%, current ${(currentPresence * 100).toFixed(1)}%).`,
        delta,
      });
    }

    const currentTypes = profile.typeDistribution[field] || {};
    const baselineTypes = baseline.typeDistribution[field] || {};
    const typeSet = new Set([...Object.keys(currentTypes), ...Object.keys(baselineTypes)] as FieldType[]);
    for (const type of typeSet) {
      const currentTypeCount = currentTypes[type] || 0;
      const baselineTypeCount = baselineTypes[type] || 0;
      const totalBaseline = Object.values(baselineTypes).reduce((sum, value) => sum + value, 0) || 1;
      const totalCurrent = Object.values(currentTypes).reduce((sum, value) => sum + value, 0) || 1;
      const baselineRatio = baselineTypeCount / totalBaseline;
      const currentRatio = currentTypeCount / totalCurrent;
      const typeDelta = Math.abs(currentRatio - baselineRatio) / Math.max(baselineRatio, 0.0001);

      if (typeDelta > threshold) {
        drift.push({
          field,
          kind: 'type-drift',
          description: `Type distribution for "${field}" drifted (baseline ${type}: ${(baselineRatio * 100).toFixed(1)}%, current ${(currentRatio * 100).toFixed(1)}%).`,
          delta: typeDelta,
        });
      }
    }
  }

  return drift;
}


async function checkSchemaDrift(
  profile: SchemaProfile,
  baselinePath: string | undefined,
  threshold: number
): Promise<SchemaDrift[] | undefined> {
  if (baselinePath && (await pathExists(baselinePath))) {
    const baseline = await readJson<SchemaProfile>(baselinePath);
    return detectDrift(profile, baseline, threshold);
  } else if (baselinePath) {
    log('warn', `Drift baseline not found at ${baselinePath}. Provide a baseline to enable drift alerts.`);
  }
  return undefined;
}

export async function validateDatasetSchema(options: SchemaValidateOptions): Promise<SchemaValidationResult> {
  const {
    dataset,
    datasetPath,
    schema,
    schemaPath,
    allowAdditionalFields = true,
    driftBaselinePath,
    driftThreshold = 0.2,
    failOnError = false,
  } = options;

  const records = await loadDataset(dataset, datasetPath);
  const schemaDefinition = await loadSchema(schema, schemaPath);

  const errors: string[] = [];
  for (const record of records) {
    errors.push(...validateRecord(record, schemaDefinition, allowAdditionalFields));
  }

  const profile = buildProfile(records);
  const drift = await checkSchemaDrift(profile, driftBaselinePath, driftThreshold);

  const hasErrors = errors.length > 0;
  const hasDrift = drift && drift.length > 0;

  if (hasErrors) {
    log('error', `Schema validation failed with ${errors.length} issue(s).`);
  } else {
    log('success', 'Schema validation passed.');
  }

  if (hasDrift) {
    log('warn', `Schema drift detected: ${drift?.length ?? 0} alert(s).`);
  }

  if (failOnError && (hasErrors || hasDrift)) {
    throw new Error('Schema validation failed due to errors or drift.');
  }

  return { valid: !hasErrors, errors, profile, drift };
}
