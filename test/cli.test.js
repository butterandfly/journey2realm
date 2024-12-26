const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { TEST_CONFIG } = require('../src/config');
const { deleteRealmFiles, main } = require('../bin/cli');
const chalk = require('chalk');

describe('CLI', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    deleteRealmFiles(TEST_CONFIG.path);
  });

  it('should show error when no file path provided', (done) => {
    exec('node bin/cli.js', (error, stdout, stderr) => {
      expect(stderr).toContain('Please provide a journey file path');
      done();
    });
  });

  it('should show error when file not found', (done) => {
    exec('node bin/cli.js nonexistent.canvas', (error, stdout, stderr) => {
      expect(stderr).toContain('File not found');
      done();
    });
  });

  it('should convert journey file successfully', (done) => {
    const journeyPath = path.join(__dirname, 'Journey 1.canvas');
    
    exec(`NODE_ENV=test node bin/cli.js "${journeyPath}"`, async (error, stdout, stderr) => {
      expect(error).toBeNull();

      // 验证数据库中的journey记录
      const Realm = require('realm');
      const realm = await Realm.open({
        ...TEST_CONFIG,
        // inMemory: false
      });

      try {
        const journeys = realm.objects('Journey');
        expect(journeys.length).toBe(1);
        
        const journey = journeys[0];
        expect(journey.name).toBe('Journey 1'); // 假设journey名称与文件名相匹配
        
      } finally {
        realm.close();
        done();
      }
    });
  });

  it('should return error exit code when conversion fails', (done) => {
    const invalidPath = path.join(__dirname, 'Invalid.canvas');
    
    exec(`NODE_ENV=test node bin/cli.js ${invalidPath}`, (error, stdout, stderr) => {
      expect(error.code).toBe(1);
      done();
    });
  });
}); 