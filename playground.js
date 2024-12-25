const { convertJourneyFile } = require('./src/extract-content');
const path = require('path');

const journeyPath = path.join(__dirname, 'journeys', 'Journey 1');
convertJourneyFile(journeyPath);

