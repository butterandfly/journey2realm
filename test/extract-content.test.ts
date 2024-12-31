import { 
  findQuestNode, 
  convertBlockNode, 
  convertSectionNode, 
  convertQuestNode, 
  convertQuestFile,
  convertSingleChoice
} from '../src/extract-content';
import { BlockType, FactType, QuestionType } from '../src/schemas';
import * as fs from 'fs';
jest.mock('fs');

describe('findQuestNode', () => {
  it('should find the quest node in the canvas data', () => {
    const canvasData = {
      nodes: [
        { id: '1', type: 'text', text: 'Some text' },
        { id: '2', type: 'text', text: '#quest This is a quest' },
        { id: '3', type: 'text', text: 'Another text' }
      ],
      edges: []
    };

    const questNode = findQuestNode(canvasData);
    expect(questNode).toEqual({ id: '2', type: 'text', text: '#quest This is a quest' });
  });

  it('should return undefined if no quest node is found', () => {
    const canvasData = {
      nodes: [
        { id: '1', type: 'text', text: 'Some text' },
        { id: '2', type: 'text', text: 'Another text' }
      ],
      edges: []
    };

    const questNode = findQuestNode(canvasData);
    expect(questNode).toBeUndefined();
  });

  it('should not find the node that starts with "#question"', () => {
    const canvasData = {
      nodes: [
        { id: '1', type: 'text', text: 'Some text' },
        { id: '2', type: 'text', text: '#question This is a question' },
        { id: '3', type: 'text', text: 'Another text' }
      ],
      edges: []
    };

    const questNode = findQuestNode(canvasData);
    expect(questNode).toBeUndefined();
  });
});

describe('convertBlockNode', () => {
  it('should convert a block node with #definition', () => {
    const fakeUUID = '00000000-0000-0000-0000-000000000000';
    const blockNode = { id: '1', type: 'text', text: `#definition Definition 1 ^${fakeUUID}\nThis is a definition`};
    const block = convertBlockNode(blockNode);
    expect(block).toEqual({
      content: 'This is a definition',
      name: 'Definition 1',
      id: fakeUUID,
      blockType: BlockType.DEFINITION,
      modifiedAt: expect.any(Date)
    });
  });

  it('should convert a block node with #theorem', () => {
    const fakeUUID = '00000000-0000-0000-0000-000000000000';
    const blockNode = { id: '1', type: 'text', text: '#theorem Theorem 1 ^00000000-0000-0000-0000-000000000000\nThis is a theorem'};
    const block = convertBlockNode(blockNode);
    expect(block).toEqual({
      content: 'This is a theorem',
      blockType: BlockType.FACT,
      factType: FactType.THEOREM,
      name: 'Theorem 1',
      id: fakeUUID,
      modifiedAt: expect.any(Date)
    });
  });

  it('should convert a block node with markdown content', () => {
    const fakeUUID = '00000000-0000-0000-0000-000000000000';
    const blockNode = { id: '1', type: 'text', text: '#md ^00000000-0000-0000-0000-000000000000\nThis is a markdown content'};
    const block = convertBlockNode(blockNode);
    expect(block).toEqual({
      content: 'This is a markdown content',
      blockType: BlockType.MD,
      id: fakeUUID,
      name: '',
      modifiedAt: expect.any(Date)
    });
  });

  it('should throw error if id is missing', () => {
    const blockNode = { id: '1', type: 'text', text: '#definition Definition 1\nThis is a definition'};
    expect(() => convertBlockNode(blockNode)).toThrow('Block id is required: #definition Definition 1');
  });

  it('should convert a block node with #fact', () => {
    const fakeUUID = '00000000-0000-0000-0000-000000000000';
    const blockNode = { id: '1', type: 'text', text: `#fact Important Fact ^${fakeUUID}\nThis is a fact` };
    const block = convertBlockNode(blockNode);
    expect(block).toEqual({
      content: 'This is a fact',
      blockType: BlockType.FACT,
      factType: FactType.FACT,
      name: 'Important Fact',
      id: fakeUUID,
      modifiedAt: expect.any(Date)
    });
  });

  it('should convert a block node with #single_choice', () => {
    const fakeUUID = '00000000-0000-0000-0000-000000000000';
    const blockNode = { 
      id: '1', 
      type: 'text', 
      text: `#single_choice Test Question ^${fakeUUID}
What is 2+2?

choice:
a: 3
b: 4
c: 5

answer:
b

explanation:
Because 2+2=4`
    };
    
    const block = convertBlockNode(blockNode);
    expect(block).toEqual({
      content: expect.any(String),
      blockType: BlockType.QUESTION,
      questionType: QuestionType.SINGLE_CHOICE,
      questionData: expect.any(String),
      name: 'Test Question',
      id: fakeUUID,
      modifiedAt: expect.any(Date)
    });

    // 验证 questionData 是否正确解析
    const questionData = JSON.parse(block.questionData!);
    expect(questionData).toEqual({
      questionContent: 'What is 2+2?',
      choices: {
        'a': '3',
        'b': '4',
        'c': '5'
      },
      answer: 'b',
      explanation: 'Because 2+2=4'
    });
  });

  it('should convert a block node with #remark', () => {
    const fakeUUID = '00000000-0000-0000-0000-000000000000';
    const blockNode = { 
      id: '1', 
      type: 'text', 
      text: `#remark Important Note ^${fakeUUID}\nThis is a key point to remember.`
    };
    
    const block = convertBlockNode(blockNode);
    expect(block).toEqual({
      content: 'This is a key point to remember.',
      blockType: BlockType.REMARK,
      name: 'Important Note',
      id: fakeUUID,
      modifiedAt: expect.any(Date)
    });
  });
});

describe('convertSectionNode', () => {
    it('should throw an error if section id is missing', () => {
        const sectionNode = { id: '1', type: 'text', text: '#section Section Name\nThis is a section' };
        const canvasData = { nodes: [sectionNode], edges: [] };
        expect(() => convertSectionNode(sectionNode, canvasData)).toThrow('Section id is required: #section Section Name');
    });

    it('should convert a section node with no other nodes', () => {
        const fakeUUID = '00000000-0000-0000-0000-000000000000';
        const sectionNode = { id: '1', type: 'text', text: `#section Section Name ^${fakeUUID}\nThis is a section` };
        const canvasData = { nodes: [sectionNode], edges: [] };
        const section = convertSectionNode(sectionNode, canvasData);
        expect(section).toEqual({
            name: 'Section Name',
            id: fakeUUID,
            desc: 'This is a section',
            blocks: [],
            modifiedAt: expect.any(Date)
        });
    });

    it('should throw an error if block id is missing', () => {
        const sectionUUID = '00000000-0000-0000-0000-000000000000';
        const sectionNode = { id: '1', type: 'text', text: `#section Section Name ^${sectionUUID}\nThis is a section` };
        const blockNode = { id: '2', type: 'text', text: '#definition Definition 1\nThis is a definition' };
        const canvasData = {
            nodes: [sectionNode, blockNode],
            edges: [{ fromNode: '1', fromSide: 'bottom', toNode: '2', toSide: 'top' }]
        };
        expect(() => convertSectionNode(sectionNode, canvasData)).toThrow('Block id is required: #definition Definition 1');
    });

    it('should convert a section node with one block', () => {
        const sectionUUID = '00000000-0000-0000-0000-000000000000';
        const blockUUID = '11111111-1111-1111-1111-111111111111';
        const sectionNode = { id: '1', type: 'text', text: `#section Section Name ^${sectionUUID}\nThis is a section` };
        const blockNode = { id: '2', type: 'text', text: `#definition Definition 1 ^${blockUUID}\nThis is a definition` };
        const canvasData = {
            nodes: [sectionNode, blockNode],
            edges: [{ fromNode: '1', fromSide: 'bottom', toNode: '2', toSide: 'top' }]
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
                blockType: BlockType.DEFINITION,
                modifiedAt: expect.any(Date)
            }],
            modifiedAt: expect.any(Date)
        });
    });
});

describe('convertQuestNode', () => {
    it('should throw an error if quest id is missing', () => {
        const questNode = { id: '1', type: 'text', text: '#quest Quest Name\nThis is a quest' };
        const canvasData = { nodes: [questNode], edges: [] };
        expect(() => convertQuestNode(questNode, canvasData)).toThrow('Quest id is required: #quest Quest Name');
    });

    it('should throw an error if tag is not quest', () => {
        const questNode = { id: '1', type: 'text', text: '#section Section Name ^00000000-0000-0000-0000-000000000000\nThis is a section' };
        const canvasData = { nodes: [questNode], edges: [] };
        expect(() => convertQuestNode(questNode, canvasData)).toThrow('Invalid quest tag: section');
    });

    it('should convert a quest node with no sections', () => {
        const fakeUUID = '00000000-0000-0000-0000-000000000000';
        const questNode = { id: '1', type: 'text', text: `#quest Quest Name ^${fakeUUID}\nThis is a quest` };
        const canvasData = { nodes: [questNode], edges: [] };
        const quest = convertQuestNode(questNode, canvasData);
        expect(quest).toEqual({
            name: 'Quest Name',
            id: fakeUUID,
            desc: 'This is a quest',
            sections: [],
            modifiedAt: expect.any(Date)
        });
    });

    it('should throw an error if section id is missing', () => {
        const questUUID = '00000000-0000-0000-0000-000000000000';
        const questNode = { id: '1', type: 'text', text: `#quest Quest Name ^${questUUID}\nThis is a quest` };
        const sectionNode = { id: '2', type: 'text', text: '#section Section Name\nThis is a section' };
        const canvasData = {
            nodes: [questNode, sectionNode],
            edges: [{ fromNode: '1', fromSide: 'right', toNode: '2', toSide: 'left' }]
        };
        expect(() => convertQuestNode(questNode, canvasData)).toThrow('Section id is required: #section Section Name');
    });

    it('should convert a quest node with one section', () => {
        const questUUID = '00000000-0000-0000-0000-000000000000';
        const sectionUUID = '11111111-1111-1111-1111-111111111111';
        const questNode = { id: '1', type: 'text', text: `#quest Quest Name ^${questUUID}\nThis is a quest` };
        const sectionNode = { id: '2', type: 'text', text: `#section Section Name ^${sectionUUID}\nThis is a section` };
        const canvasData = {
            nodes: [questNode, sectionNode],
            edges: [{ fromNode: '1', fromSide: 'right', toNode: '2', toSide: 'left' }]
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
                blocks: [],
                modifiedAt: expect.any(Date)
            }],
            modifiedAt: expect.any(Date)
        });
    });
});

describe('convertSingleChoice', () => {
  it('should parse a well-formatted single choice question', () => {
    const input = `This is a question.
It supports multiple lines and $\\LaTeX$.

choice:
a: First choice with $\\alpha$
b: Second choice with $\\beta$
c: Third choice with $\\gamma$

answer:
b

explanation:
This is the explanation.
It can have multiple lines too.`;

    const result = convertSingleChoice(input);

    expect(result.questionContent).toBe('This is a question.\nIt supports multiple lines and $\\LaTeX$.');
    expect(result.choices).toEqual({
      'a': 'First choice with $\\alpha$',
      'b': 'Second choice with $\\beta$',
      'c': 'Third choice with $\\gamma$'
    });
    expect(result.answer).toBe('b');
    expect(result.explanation).toBe('This is the explanation.\nIt can have multiple lines too.');
  });

  it('should handle different order of sections', () => {
    const input = `Question text.

explanation:
The explanation.

answer:
a

choice:
a: Choice A
b: Choice B`;

    const result = convertSingleChoice(input);

    expect(result.questionContent).toBe('Question text.');
    expect(result.choices).toEqual({
      'a': 'Choice A',
      'b': 'Choice B'
    });
    expect(result.answer).toBe('a');
    expect(result.explanation).toBe('The explanation.');
  });

  it('should handle empty content gracefully', () => {
    const input = '';
    const result = convertSingleChoice(input);

    expect(result.questionContent).toBe('');
    expect(result.choices).toEqual({});
    expect(result.answer).toBe('');
    expect(result.explanation).toBe('');
  });
});
