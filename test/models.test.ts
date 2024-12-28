import * as Realm from 'realm';
import * as path from 'path';
import * as fs from 'fs';
import { TEST_CONFIG } from '../src/config';
import { 
    Block, 
    Section, 
    Quest,
    saveJourney 
} from '../src/db-models';
import { 
    BlockType, 
    FactType, 
    QuestionType,
    BlockSchema,
    SectionSchema,
    QuestSchema,
    JourneySchema 
} from '../src/schemas';

let realm: Realm;
// @ts-ignore
const TEST_DB_DIR = path.dirname(TEST_CONFIG.path);

beforeAll(() => {
    if (!fs.existsSync(TEST_DB_DIR)) {
        fs.mkdirSync(TEST_DB_DIR, { recursive: true });
    }
});

beforeEach(async () => {
    // @ts-ignore
    realm = await Realm.open({
        ...TEST_CONFIG,
        inMemory: true
    });
});

afterEach(() => {
    if (realm) {
        realm.close();
    }
});

describe('Block', () => {
    it('should create a definition block', () => {
        let block: BlockSchema;
        realm.write(() => {
            block = realm.create<BlockSchema>('Block', {
                id: '1',
                name: 'Test Definition',
                content: 'This is a test definition',
                blockType: BlockType.DEFINITION,
                modifiedAt: new Date()
            });

            expect(block).toBeTruthy();
            expect(block.id).toBe('1');
            expect(block.blockType).toBe(BlockType.DEFINITION);
        });
    });

    it('should create a fact block', () => {
        let block: BlockSchema;
        realm.write(() => {
            block = realm.create<BlockSchema>('Block', {
                id: '2',
                name: 'Test Fact',
                content: 'This is a test fact',
                blockType: BlockType.FACT,
                factType: FactType.FACT,
                modifiedAt: new Date()
            });

            expect(block).toBeTruthy();
            expect(block.id).toBe('2');
            expect(block.blockType).toBe(BlockType.FACT);
            expect(block.factType).toBe(FactType.FACT);
        });
    });
});

describe('Section', () => {
    it('should create a section with blocks', () => {
        
        const block: BlockSchema = {
            id: '1',
            name: 'Test Definition',
            content: 'This is a test definition',
            blockType: BlockType.DEFINITION,
            modifiedAt: new Date()
        }

        const sectionData = {
            id: '00000000-0000-0000-0000-000000000005',
            name: "Test Section",
            desc: "This is a test section",
            modifiedAt: new Date(),
            blocks: [block]
        };

        realm.write(() => {
            const section = realm.create<SectionSchema>('Section', sectionData);
            
            expect(section.name).toBe(sectionData.name);
        });
    });
});

describe('Quest', () => {
    it('should create a quest with sections correctly', () => {
        const sectionData: SectionSchema = {
            id: '00000000-0000-0000-0000-000000000007',
            name: "Test Section",
            desc: "This is a test section",
            modifiedAt: new Date(),
            blocks: []
        };

        const questData: QuestSchema = {
            id: '00000000-0000-0000-0000-000000000006',
            name: "Test Quest",
            desc: "This is a test quest",
            modifiedAt: new Date(),
            sections: [sectionData]
        };

        realm.write(() => {
            const quest = realm.create<QuestSchema>('Quest', questData);
            
            expect(quest.name).toBe(questData.name);
            expect(quest.sections.length).toBe(1);
            expect(quest.sections[0].name).toBe(sectionData.name);
        });
    });
});

describe('saveJourney', () => {
    it('should save journey and quests correctly', async () => {
        const questData1: QuestSchema = {
            id: '00000000-0000-0000-0000-000000000008',
            name: "Quest 1",
            desc: "Quest 1 description",
            modifiedAt: new Date(),
            sections: []
        };

        const questData2: QuestSchema = {
            id: '00000000-0000-0000-0000-000000000009',
            name: "Quest 2",
            desc: "Quest 2 description",
            modifiedAt: new Date(),
            sections: []
        };

        const journeyData: JourneySchema = {
            id: '00000000-0000-0000-0000-000000000010',
            desc: "Test Journey",
            name: "Journey 1",
            questSummaries: [
                {
                    questId: questData1.id,
                    name: questData1.name,
                    desc: "Quest 1 description",
                    dependencies: [],
                    children: [questData2.id]
                },
                {
                    questId: questData2.id,
                    name: questData2.name,
                    desc: "Quest 2 description",
                    dependencies: [questData1.id],
                    children: []
                }
            ]
        };

        const savedJourney = await saveJourney(journeyData, [questData1, questData2], realm);

        expect(savedJourney.desc).toBe(journeyData.desc);
        expect(savedJourney.questSummaries.length).toBe(2);
    });
}); 