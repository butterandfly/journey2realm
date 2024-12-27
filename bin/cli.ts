#!/usr/bin/env node

import Realm from 'realm';
import { convertJourneyFile } from '../src/extract-content';
import { saveJourney } from '../src/db-models';
import { PROD_CONFIG, TEST_CONFIG } from '../src/config';
import * as path from 'path';
import * as fs from 'fs';
import chalk from 'chalk';
import ora from 'ora';

export function deleteRealmFiles(realmPath: string): void {
  const basePath = realmPath.replace('.realm', '');
  const files = [
    `${basePath}.realm`,
    `${basePath}.realm.lock`,
    `${basePath}.realm.note`,
  ];
  
  // 删除文件
  files.forEach(file => {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
      console.log(chalk.gray(`🗑️  Deleted: ${file}`));
    }
  });

  // 删除 management 目录
  const managementDir = `${basePath}.realm.management`;
  if (fs.existsSync(managementDir)) {
    fs.rmSync(managementDir, { recursive: true, force: true });
    console.log(chalk.gray(`🗑️  Deleted directory: ${managementDir}`));
  }
}

async function main(config: Realm.Configuration): Promise<boolean> {
  let realm: Realm;
  try {
    const journeyFile = process.argv[2];
    if (!journeyFile) {
      console.error(chalk.red('❌ Please provide a journey file path'));
      process.exit(1);
    }

    // 确保文件路径存在
    if (!fs.existsSync(journeyFile)) {
      console.error(chalk.red(`❌ File not found: ${journeyFile}`));
      process.exit(1);
    }

    console.log(chalk.blue(`\n📂 Processing: ${journeyFile}\n`));

    // 清理旧的数据库文件
    deleteRealmFiles(config.path!);

    // 确保数据库目录存在
    const dbDir = path.dirname(config.path!);
    if (!fs.existsSync(dbDir)){
      fs.mkdirSync(dbDir, { recursive: true });
    }

    const spinner = ora('Converting journey...').start();
    
    realm = await Realm.open(config);
    const { journey, quests } = convertJourneyFile(journeyFile);
    await saveJourney(journey, quests, realm);
    
    spinner.succeed(chalk.green('Journey converted and saved successfully! 🎉'));
    return true;
  } catch (error) {
    return false;
  } finally {
    if (realm!) {
      realm.close();
    }
  }
}

// 入口点逻辑修改
if (require.main === module) {
  const config = process.env.NODE_ENV === 'test' ? TEST_CONFIG : PROD_CONFIG;
  main(config).then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error(chalk.red('\n❌ Error:'), error);
    process.exit(1);
  });
}
