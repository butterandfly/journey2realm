const Realm = require('realm');
const models = require('../src/models');

let realm;

beforeEach(async () => {
    realm = await Realm.open({ 
        schema: [models.Block, models.Section, models.Quest, models.Journey, models.QuestSummary], 
        schemaVersion: 6,
        inMemory: true
    });
});

afterEach(() => {
    if (realm) {
        realm.close();
    }
});

describe('Block schema', () => {
    it('should create a markdown block correctly', () => {
        const blockData = {
            id: '00000000-0000-0000-0000-000000000001',
            content: "#para\nMarkdown content 1.",
            blockType: models.BlockType.MD,
        };

        realm.write(() => {
            const block = realm.create('Block', blockData);
            expect(block.content).toBe(blockData.content);
            expect(block.blockType).toBe(blockData.blockType);
            expect(block.id).toBe(blockData.id);
            expect(block.createdAt).toBeInstanceOf(Date);
            expect(block.modifiedAt).toBeInstanceOf(Date);
        });
    });

    it('should create a theorem block correctly', () => {
        const blockData = {
            id: '00000000-0000-0000-0000-000000000002',
            content: "Theorem content",
            blockType: models.BlockType.FACT,
            name: "Theorem 1",
            factType: models.FactType.THEOREM,
        };

        realm.write(() => {
            const block = realm.create('Block', blockData);
            expect(block.content).toBe(blockData.content);
            expect(block.blockType).toBe(blockData.blockType);
            expect(block.name).toBe(blockData.name);
            expect(block.factType).toBe(blockData.factType);
        });
    });

    it('should create a question block correctly', () => {
        realm.write(() => {
            const questionData = {
                choices: ["Choice 1", "Choice 2", "Choice 3"],
                answer: 0,
                explanation: "Choice 1 is correct because..."
            };

            const blockData = {
                id: '00000000-0000-0000-0000-000000000003',
                content: "Question content",
                blockType: models.BlockType.QUESTION,
                questionType: models.QuestionType.SINGLE_CHOICE,
                questionData: JSON.stringify(questionData)
            };

            const block = realm.create('Block', blockData);
            expect(block.content).toBe(blockData.content);
            expect(block.blockType).toBe(blockData.blockType);
            expect(block.questionType).toBe(blockData.questionType);
            expect(JSON.parse(block.questionData)).toEqual(questionData);
        });
    });
});

describe('Section schema', () => {
    it('should create a section with blocks correctly', () => {
        const blockData = {
            id: '00000000-0000-0000-0000-000000000004',
            content: "Block content",
            blockType: models.BlockType.MD,
        };

        const sectionData = {
            id: '00000000-0000-0000-0000-000000000005',
            name: "Test Section",
            blocks: []
        };

        realm.write(() => {
            const block = realm.create('Block', blockData);
            sectionData.blocks.push(block);
            const section = realm.create('Section', sectionData);
            
            expect(section.name).toBe(sectionData.name);
            expect(section.blocks.length).toBe(1);
            expect(section.blocks[0].content).toBe(blockData.content);
        });
    });
});

describe('Quest schema', () => {
    it('should create a quest with sections correctly', () => {
        const questData = {
            id: '00000000-0000-0000-0000-000000000006',
            name: "Test Quest",
            sections: []
        };

        const sectionData = {
            id: '00000000-0000-0000-0000-000000000007',
            name: "Test Section",
            blocks: []
        };

        realm.write(() => {
            const section = realm.create('Section', sectionData);
            questData.sections.push(section);
            const quest = realm.create('Quest', questData);
            
            expect(quest.name).toBe(questData.name);
            expect(quest.sections.length).toBe(1);
            expect(quest.sections[0].name).toBe(sectionData.name);
        });
    });
});

describe('saveJourney', () => {
    it('should save journey and quests correctly', () => {
        const questData1 = {
            id: '00000000-0000-0000-0000-000000000008',
            name: "Quest 1",
            sections: []
        };

        const questData2 = {
            id: '00000000-0000-0000-0000-000000000009', 
            name: "Quest 2",
            sections: []
        };

        const journeyData = {
            id: '00000000-0000-0000-0000-000000000010',
            desc: "Test Journey",
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

        models.saveJourney(journeyData, [questData1, questData2], realm);

        const savedJourney = realm.objectForPrimaryKey('Journey', journeyData.id);
        expect(savedJourney.desc).toBe(journeyData.desc);
        expect(savedJourney.questSummaries.length).toBe(2);

        const savedQuest1 = realm.objectForPrimaryKey('Quest', questData1.id);
        expect(savedQuest1.name).toBe(questData1.name);

        const savedQuest2 = realm.objectForPrimaryKey('Quest', questData2.id);
        expect(savedQuest2.name).toBe(questData2.name);
    });
});
