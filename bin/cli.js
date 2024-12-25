#!/usr/bin/env node

const { convertJourneyFile } = require('../src/extract-content');
const { saveJourneyToDatabase } = require('../src/models');
const Realm = require('realm');

async function main() {
  const journeyFile = process.argv[2];
  if (!journeyFile) {
    console.error('Please provide a journey file path');
    process.exit(1);
  }

  try {
    const journeyData = convertJourneyFile(journeyFile);
    const realm = await Realm.open({
      // ... realm config
    });
    
    saveJourneyToDatabase(journeyData, realm);
    console.log('Journey saved successfully');
    
    realm.close();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main(); 