import * as path from 'path';
import { exec } from 'child_process';
import { TEST_CONFIG } from '../src/config';
import { deleteRealmFiles } from '../bin/cli';

describe('CLI', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    deleteRealmFiles(TEST_CONFIG.path!);
  });

  it('should show error when no file path provided', (done) => {
    exec('node dist/bin/cli.js', (error, stdout, stderr) => {
      expect(stderr).toContain('Please provide a journey file path');
      done();
    });
  });

  it('should show error when file not found', (done) => {
    exec('node dist/bin/cli.js nonexistent.canvas', (error, stdout, stderr) => {
      expect(stderr).toContain('File not found');
      done();
    });
  });

  it('should convert journey file successfully', (done) => {
    const journeyPath = path.join(__dirname, 'Journey 1.canvas');
    
    exec(`NODE_ENV=test node dist/bin/cli.js "${journeyPath}"`, async (error, stdout, stderr) => {
      expect(error).toBeNull();

      const Realm = require('realm');
      const realm = await Realm.open({
        ...TEST_CONFIG,
      });

      try {
        const journeys = realm.objects('Journey');
        expect(journeys.length).toBe(1);
        
        const journey = journeys[0];
        expect(journey.name).toBe('Journey 1');
        
      } finally {
        realm.close();
        done();
      }
    });
  });

});