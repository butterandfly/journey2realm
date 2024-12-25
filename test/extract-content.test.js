const { findQuestNode } = require('../src/extract-content');
const { convertBlockNode } = require('../src/extract-content');
const { BlockType, FactType, QuestionType } = require('../src/models');
const { getMetadata } = require('../src/extract-content');
const { convertSectionNode } = require('../src/extract-content');
const { convertQuestNode } = require('../src/extract-content');
const { findNextQuestFileNodes } = require('../src/extract-content');
const { convertQuestFile } = require('../src/extract-content');
const fs = require('fs');
jest.mock('fs');

describe('findQuestNode', () => {
    it('should find the quest node in the canvas data', () => {
        const canvasData = {
            nodes: [
                { id: 1, text: 'Some text' },
                { id: 2, text: '#quest This is a quest' },
                { id: 3, text: 'Another text' }
            ],
            edges: []
        };

        const questNode = findQuestNode(canvasData);
        expect(questNode).toEqual({ id: 2, text: '#quest This is a quest' });
    });

    it('should return undefined if no quest node is found', () => {
        const canvasData = {
            nodes: [
                { id: 1, text: 'Some text' },
                { id: 2, text: 'Another text' }
            ],
            edges: []
        };

        const questNode = findQuestNode(canvasData);
        expect(questNode).toBeUndefined();
    });

    it('should not find the node that starts with "#question"', () => {
        const canvasData = {
            nodes: [
                { id: 1, text: 'Some text' },
                { id: 2, text: '#question This is a question' },
                { id: 3, text: 'Another text' }
            ],
            edges: []
        };

        const questNode = findQuestNode(canvasData);
        expect(questNode).toBeUndefined();
    });

    it('should find the quest node even with frontmatter', () => {
        const canvasData = {
            nodes: [
                { id: 1, text: 'Some text' },
                { id: 2, text: '---\ntitle: Quest\n---\n#quest This is a quest' },
                { id: 3, text: 'Another text' }
            ],
            edges: []
        };

        const questNode = findQuestNode(canvasData);
        expect(questNode).toEqual({ id: 2, text: '---\ntitle: Quest\n---\n#quest This is a quest' });
    });
});

describe('convertBlockNode', () => {
    it('should convert a block node with #definition', () => {
        const fakeUUID = '00000000-0000-0000-0000-000000000000';
        const blockNode = { text: `#definition Definition 1 ^${fakeUUID}\nThis is a definition`};
        const block = convertBlockNode(blockNode);
        expect(block).toEqual({
            content: 'This is a definition',
            name: 'Definition 1',
            id: fakeUUID,
            blockType: BlockType.DEFINITION
        });
    });

    it('should convert a block node with #theorem', () => {
        const fakeUUID = '00000000-0000-0000-0000-000000000000';
        const blockNode = { text: '#theorem Theorem 1 ^00000000-0000-0000-0000-000000000000\nThis is a theorem'};
        const block = convertBlockNode(blockNode);
        expect(block).toEqual({
            content: 'This is a theorem',
            blockType: BlockType.FACT,
            factType: FactType.THEOREM,
            name: 'Theorem 1',
            id: fakeUUID
        });
    });

    it('should convert a block node with markdown content', () => {
        const fakeUUID = '00000000-0000-0000-0000-000000000000';
        const blockNode = { text: '#md ^00000000-0000-0000-0000-000000000000\nThis is a markdown content'};
        const block = convertBlockNode(blockNode);
        expect(block).toEqual({
            content: 'This is a markdown content',
            blockType: BlockType.MD,
            id: fakeUUID,
            name: ''
        });
    });

    // Throw error if id is missing
    it('should throw an error if id is missing', () => {
        const blockNode = { text: '#definition Definition 1\nThis is a definition'};
        expect(() => convertBlockNode(blockNode)).toThrow('Block id is required: #definition Definition 1');
    });
});

describe('getMetadata', () => {
    it('should extract metadata from a line with a tag and name', () => {
        const line = '#definition Definition Name';
        const metadata = getMetadata(line);
        expect(metadata).toEqual({
            tag: 'definition',
            name: 'Definition Name',
            id: null
        });
    });

    it('should extract metadata from a line with a tag, name, and id', () => {
        const line = '#definition Definition Name ^123e4567-e89b-12d3-a456-426614174000';
        const metadata = getMetadata(line);
        expect(metadata).toEqual({
            tag: 'definition',
            name: 'Definition Name',
            id: '123e4567-e89b-12d3-a456-426614174000'
        });
    });

    it('should extract metadata from a line with a tag and id only', () => {
        const line = '#para ^123e4567-e89b-12d3-a456-426614174000';
        const metadata = getMetadata(line);
        expect(metadata).toEqual({
            tag: 'para',
            name: '',
            id: '123e4567-e89b-12d3-a456-426614174000'
        });
    });

    it('should extract metadata from a line with a tag only', () => {
        const line = '#para';
        const metadata = getMetadata(line);
        expect(metadata).toEqual({
            tag: 'para',
            name: '',
            id: null
        });
    });

    it('should return null id for invalid uuid', () => {
        const line = '#definition Definition Name ^something';
        const metadata = getMetadata(line);
        expect(metadata).toEqual({
            tag: 'definition',
            name: 'Definition Name ^something',
            id: null
        });
    });
});

describe('convertSectionNode', () => {
    it('should throw an error if section id is missing', () => {
        const sectionNode = { text: '#section Section Name\nThis is a section' };
        const canvasData = { nodes: [sectionNode], edges: [] };
        expect(() => convertSectionNode(sectionNode, canvasData)).toThrow('Section id is required: #section Section Name');
    });

    it('should convert a section node with no other nodes', () => {
        const fakeUUID = '00000000-0000-0000-0000-000000000000';
        const sectionNode = { id: 1, text: `#section Section Name ^${fakeUUID}\nThis is a section` };
        const canvasData = { nodes: [sectionNode], edges: [] };
        const section = convertSectionNode(sectionNode, canvasData);
        expect(section).toEqual({
            name: 'Section Name',
            id: fakeUUID,
            desc: 'This is a section',
            blocks: []
        });
    });

    it('should throw an error if block id is missing', () => {
        const sectionUUID = '00000000-0000-0000-0000-000000000000';
        const sectionNode = { id: 1, text: `#section Section Name ^${sectionUUID}\nThis is a section` };
        const blockNode = { id: 2, text: '#definition Definition 1\nThis is a definition' };
        const canvasData = {
            nodes: [sectionNode, blockNode],
            edges: [{ fromNode: 1, fromSide: 'bottom', toNode: 2, toSide: 'top' }]
        };
        expect(() => convertSectionNode(sectionNode, canvasData)).toThrow('Block id is required: #definition Definition 1');
    });

    it('should convert a section node with one block', () => {
        const sectionUUID = '00000000-0000-0000-0000-000000000000';
        const blockUUID = '11111111-1111-1111-1111-111111111111';
        const sectionNode = { id: 1, text: `#section Section Name ^${sectionUUID}\nThis is a section` };
        const blockNode = { id: 2, text: `#definition Definition 1 ^${blockUUID}\nThis is a definition` };
        const canvasData = {
            nodes: [sectionNode, blockNode],
            edges: [{ fromNode: 1, fromSide: 'bottom', toNode: 2, toSide: 'top' }]
        };
        const section = convertSectionNode(sectionNode, canvasData);
        expect(section).toEqual({
            name: 'Section Name',
            id: sectionUUID,
            desc: 'This is a section',
            blocks: [{
                content: 'This is a definition',
                name: 'Definition 1',
                id: blockUUID,
                blockType: BlockType.DEFINITION
            }]
        });
    });
});

describe('convertQuestNode', () => {
    it('should throw an error if quest id is missing', () => {
        const questNode = { text: '#quest Quest Name\nThis is a quest' };
        const canvasData = { nodes: [questNode], edges: [] };
        expect(() => convertQuestNode(questNode, canvasData)).toThrow('Quest id is required: #quest Quest Name');
    });

    it('should throw an error if tag is not quest', () => {
        const questNode = { text: '#section Section Name ^00000000-0000-0000-0000-000000000000\nThis is a section' };
        const canvasData = { nodes: [questNode], edges: [] };
        expect(() => convertQuestNode(questNode, canvasData)).toThrow('Invalid quest tag: section');
    });

    it('should convert a quest node with no sections', () => {
        const fakeUUID = '00000000-0000-0000-0000-000000000000';
        const questNode = { id: 1, text: `#quest Quest Name ^${fakeUUID}\nThis is a quest` };
        const canvasData = { nodes: [questNode], edges: [] };
        const quest = convertQuestNode(questNode, canvasData);
        expect(quest).toEqual({
            name: 'Quest Name',
            id: fakeUUID,
            desc: 'This is a quest',
            sections: []
        });
    });

    it('should throw an error if section id is missing', () => {
        const questUUID = '00000000-0000-0000-0000-000000000000';
        const questNode = { id: 1, text: `#quest Quest Name ^${questUUID}\nThis is a quest` };
        const sectionNode = { id: 2, text: '#section Section Name\nThis is a section' };
        const canvasData = {
            nodes: [questNode, sectionNode],
            edges: [{ fromNode: 1, fromSide: 'right', toNode: 2, toSide: 'left' }]
        };
        expect(() => convertQuestNode(questNode, canvasData)).toThrow('Section id is required: #section Section Name');
    });

    it('should convert a quest node with one section', () => {
        const questUUID = '00000000-0000-0000-0000-000000000000';
        const sectionUUID = '11111111-1111-1111-1111-111111111111';
        const questNode = { id: 1, text: `#quest Quest Name ^${questUUID}\nThis is a quest` };
        const sectionNode = { id: 2, text: `#section Section Name ^${sectionUUID}\nThis is a section` };
        const canvasData = {
            nodes: [questNode, sectionNode],
            edges: [{ fromNode: 1, fromSide: 'right', toNode: 2, toSide: 'left' }]
        };
        const quest = convertQuestNode(questNode, canvasData);
        expect(quest).toEqual({
            name: 'Quest Name',
            id: questUUID,
            desc: 'This is a quest',
            sections: [{
                name: 'Section Name',
                id: sectionUUID,
                desc: 'This is a section',
                blocks: []
            }]
        });
    });

    it('should convert a quest node with multiple sections', () => {
        const questUUID = '00000000-0000-0000-0000-000000000000';
        const sectionUUID1 = '11111111-1111-1111-1111-111111111111';
        const sectionUUID2 = '22222222-2222-2222-2222-222222222222';
        const questNode = { id: 1, text: `#quest Quest Name ^${questUUID}\nThis is a quest` };
        const sectionNode1 = { id: 2, text: `#section Section Name 1 ^${sectionUUID1}\nThis is section 1` };
        const sectionNode2 = { id: 3, text: `#section Section Name 2 ^${sectionUUID2}\nThis is section 2` };
        const canvasData = {
            nodes: [questNode, sectionNode1, sectionNode2],
            edges: [
                { fromNode: 1, fromSide: 'right', toNode: 2, toSide: 'left' },
                { fromNode: 2, fromSide: 'right', toNode: 3, toSide: 'left' }
            ]
        };
        const quest = convertQuestNode(questNode, canvasData);
        expect(quest).toEqual({
            name: 'Quest Name',
            id: questUUID,
            desc: 'This is a quest',
            sections: [
                {
                    name: 'Section Name 1',
                    id: sectionUUID1,
                    desc: 'This is section 1',
                    blocks: []
                },
                {
                    name: 'Section Name 2',
                    id: sectionUUID2,
                    desc: 'This is section 2',
                    blocks: []
                }
            ]
        });
    });
});

describe('findNextQuestFileNodes', () => {
    it('should find the next quest file nodes connected to the current node', () => {
        const canvasData = {
            nodes: [
                { id: 1, type: 'quest', text: 'Quest Node' },
                { id: 2, type: 'file', text: 'File Node 1' },
                { id: 3, type: 'file', text: 'File Node 2' },
                { id: 4, type: 'text', text: 'Section Node' }
            ],
            edges: [
                { fromNode: 1, fromSide: 'bottom', toNode: 2, toSide: 'top' },
                { fromNode: 1, fromSide: 'bottom', toNode: 3, toSide: 'top' },
                { fromNode: 1, fromSide: 'bottom', toNode: 4, toSide: 'top' }
            ]
        };

        const nextNodes = findNextQuestFileNodes({ id: 1 }, canvasData);
        expect(nextNodes).toEqual([
            { id: 2, type: 'file', text: 'File Node 1' },
            { id: 3, type: 'file', text: 'File Node 2' }
        ]);
    });

    it('should return an empty array if no file nodes are connected', () => {
        const canvasData = {
            nodes: [
                { id: 1, type: 'quest', text: 'Quest Node' },
                { id: 2, type: 'section', text: 'Section Node' }
            ],
            edges: [
                { fromNode: 1, fromSide: 'bottom', toNode: 2, toSide: 'top' }
            ]
        };

        const nextNodes = findNextQuestFileNodes({ id: 1 }, canvasData);
        expect(nextNodes).toEqual([]);
    });

    it('should return an empty array if no edges are connected', () => {
        const canvasData = {
            nodes: [
                { id: 1, type: 'quest', text: 'Quest Node' },
                { id: 2, type: 'file', text: 'File Node' }
            ],
            edges: []
        };

        const nextNodes = findNextQuestFileNodes({ id: 1 }, canvasData);
        expect(nextNodes).toEqual([]);
    });

    it('should return an empty array if the current node is not found', () => {
        const canvasData = {
            nodes: [
                { id: 2, type: 'file', text: 'File Node' }
            ],
            edges: []
        };

        const nextNodes = findNextQuestFileNodes({ id: 1 }, canvasData);
        expect(nextNodes).toEqual([]);
    });
});


describe('convertQuestFile', () => {
    it('should throw an error if quest node is not found', () => {
        const questFilePath = 'path/to/quest/file.json';
        const canvasData = {
            nodes: [
                { id: 1, text: 'Some text' }
            ],
            edges: []
        };
        fs.readFileSync.mockReturnValue(JSON.stringify(canvasData));

        expect(() => convertQuestFile(questFilePath)).toThrow('Quest node not found in file: path/to/quest/file.json');
    });

    it('should convert a quest file with a valid quest node', () => {
        const questFilePath = 'path/to/quest/file.json';
        const questUUID = '00000000-0000-0000-0000-000000000000';
        const canvasData = {
            nodes: [
                { id: 1, text: `#quest Quest Name ^${questUUID}\nThis is a quest` }
            ],
            edges: []
        };
        fs.readFileSync.mockReturnValue(JSON.stringify(canvasData));

        const quest = convertQuestFile(questFilePath);
        expect(quest).toEqual({
            name: 'Quest Name',
            id: questUUID,
            desc: 'This is a quest',
            sections: []
        });
    });

    it('should convert a quest file with sections', () => {
        const questFilePath = 'path/to/quest/file.json';
        const questUUID = '00000000-0000-0000-0000-000000000000';
        const sectionUUID = '11111111-1111-1111-1111-111111111111';
        const canvasData = {
            nodes: [
                { id: 1, text: `#quest Quest Name ^${questUUID}\nThis is a quest` },
                { id: 2, text: `#section Section Name ^${sectionUUID}\nThis is a section` }
            ],
            edges: [
                { fromNode: 1, fromSide: 'right', toNode: 2, toSide: 'left' }
            ]
        };
        fs.readFileSync.mockReturnValue(JSON.stringify(canvasData));

        const quest = convertQuestFile(questFilePath);
        expect(quest).toEqual({
            name: 'Quest Name',
            id: questUUID,
            desc: 'This is a quest',
            sections: [
                {
                    name: 'Section Name',
                    id: sectionUUID,
                    desc: 'This is a section',
                    blocks: []
                }
            ]
        });
    });
});
