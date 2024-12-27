import * as path from 'path';
import { Configuration, ObjectSchema } from 'realm';
import { Block, Section, Quest, Journey, QuestSummary } from './db-models';

interface AppConfig {
  isTest: boolean;
}

// @ts-ignore
const REALM_SCHEMA: ObjectSchema[] = [Block, Section, Quest, Journey, QuestSummary];

const DEFAULT_CONFIG: Configuration = {
  schema: REALM_SCHEMA,
  schemaVersion: 1
};

const TEST_CONFIG: Configuration = {
  ...DEFAULT_CONFIG,
  path: path.join(process.cwd(), 'test', 'realm_data', 'test.realm'),
};

const PROD_CONFIG: Configuration = {
  ...DEFAULT_CONFIG,
  path: path.join(process.cwd(), 'realm_data', 'default.realm'),
};

export {
  AppConfig,
  DEFAULT_CONFIG,
  TEST_CONFIG,
  PROD_CONFIG
}; 