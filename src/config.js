const path = require('path');
const models = require('./models');

const DEFAULT_CONFIG = {
  schema: [
    models.Block,
    models.Section,
    models.Quest,
    models.Journey,
    models.QuestSummary
  ],
  schemaVersion: 1,
  isTest: false
};

const TEST_CONFIG = {
  ...DEFAULT_CONFIG,
  path: path.join(process.cwd(), 'test', 'realm_data', 'test.realm'),
//   inMemory: true,
  isTest: true
};

const PROD_CONFIG = {
  ...DEFAULT_CONFIG,
  path: path.join(process.cwd(), 'realm_data', 'default.realm'),
};

module.exports = {
  DEFAULT_CONFIG,
  TEST_CONFIG,
  PROD_CONFIG
};