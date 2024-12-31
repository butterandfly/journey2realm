import {
  CanvasNode,
  CanvasEdge,
  CanvasData,
  Metadata,
  getMetadata,
  isValidUUID
} from './node-validator';

import {
  BlockType,
  FactType,
  QuestionType,
  BlockSchema,
  SectionSchema,
  QuestSchema,
  JourneySchema,
  QuestSummarySchema,
  SingleChoiceQuestionDataSchema
} from './schemas';

import fs from 'fs';

interface JourneyResult {
  journey: JourneySchema;
  quests: QuestSchema[];
}

export function convertBlockNode(blockNode: CanvasNode): BlockSchema {
  if (!blockNode.text) {
    throw new Error('Block text is required');
  }
  
  const text = blockNode.text.trim();
  const firstLine = text.split('\n')[0];
  const {tag, name, id} = getMetadata(firstLine);
  if (!id) {
    throw new Error('Block id is required: ' + firstLine);
  }

  const content = text.split('\n').slice(1).join('\n').trim();

  const block: BlockSchema = {
    name,
    id,
    content,
    blockType: BlockType.MD,
    modifiedAt: new Date()
  };

  switch (tag) {
    case 'definition':
      block.blockType = BlockType.DEFINITION;
      break;
    case 'theorem':
      block.blockType = BlockType.FACT;
      block.factType = FactType.THEOREM;
      break;
    case 'fact':
      block.blockType = BlockType.FACT;
      block.factType = FactType.FACT;
      break;
    case 'single_choice':
      block.blockType = BlockType.QUESTION;
      block.questionType = QuestionType.SINGLE_CHOICE;
      const questionData = convertSingleChoice(content);
      block.questionData = JSON.stringify(questionData);
      break;
    case 'para':
      block.blockType = BlockType.MD;
      break;
    case 'remark':
      block.blockType = BlockType.REMARK;
      break;
  }

  return block;
}

/**
 * 将单选题的文本内容转换为结构化数据
 * 
 * 输入文本格式示例：
 * ```
 * This is the question content.
 * It can have multiple lines and LaTeX content like $x^2$.
 * 
 * choice:
 * a: First choice with $\alpha$
 * b: Second choice with $\beta$
 * c: Third choice with $\gamma$
 * 
 * answer:
 * b
 * 
 * explanation:
 * This is the explanation.
 * It can also have multiple lines and LaTeX content.
 * ```
 * 
 * 注意：
 * 1. 内容中的关键字（choice:, answer:, explanation:）必须独占一行
 * 2. 关键字的顺序可以任意
 * 3. 每个部分都支持多行文本和LaTeX内容
 * 4. 选项格式必须为 "字母: 选项内容"
 */
export function convertSingleChoice(text: string): SingleChoiceQuestionDataSchema {
  const result: SingleChoiceQuestionDataSchema = {
    questionContent: '',
    choices: {},
    answer: '',
    explanation: ''
  };

  // 定义所有可能的关键字
  const keywords = ['choice:', 'answer:', 'explanation:'];
  
  // 将文本分割成行
  const lines = text.split('\n');
  
  // 找到所有关键字的行号
  const keywordPositions: { keyword: string; lineIndex: number }[] = [];
  lines.forEach((line, index) => {
    const keyword = keywords.find(k => line.trim() === k);
    if (keyword) {
      keywordPositions.push({ keyword, lineIndex: index });
    }
  });
  
  // 按行号排序
  keywordPositions.sort((a, b) => a.lineIndex - b.lineIndex);
  
  // 处理题目内容（从开始到第一个关键字）
  const firstKeywordLine = keywordPositions[0]?.lineIndex ?? lines.length;
  result.questionContent = lines.slice(0, firstKeywordLine).join('\n').trim();
  
  // 处理每个关键字部分
  keywordPositions.forEach((pos, index) => {
    const startLine = pos.lineIndex + 1;
    const endLine = keywordPositions[index + 1]?.lineIndex ?? lines.length;
    const content = lines.slice(startLine, endLine).join('\n').trim();
    
    switch (pos.keyword) {
      case 'choice:':
        content.split('\n').forEach(line => {
          const [key, value] = line.split(':').map(s => s.trim());
          if (key && value) {
            result.choices[key] = value;
          }
        });
        break;
      case 'answer:':
        result.answer = content;
        break;
      case 'explanation:':
        result.explanation = content;
        break;
    }
  });

  return result;
}

export function convertSectionNode(sectionNode: CanvasNode, canvasData: CanvasData): SectionSchema {
  if (!sectionNode.text) {
    throw new Error('Section text is required');
  }

  const lines = sectionNode.text.trim().split('\n');
  const firstLine = lines[0];
  const {tag, name, id} = getMetadata(firstLine);
  if (!id) {
    throw new Error('Section id is required: ' + firstLine);
  }

  if (tag !== 'section') {
    throw new Error('Invalid section tag: ' + tag);
  }

  const section: SectionSchema = {
    name,
    id,
    desc: lines.slice(1).join('\n'),
    blocks: [],
    modifiedAt: new Date()
  };

  let currentBlockNode = findNextBlockNode(sectionNode, canvasData);
  while (currentBlockNode) {
    const block = convertBlockNode(currentBlockNode);
    section.blocks.push(block);
    currentBlockNode = findNextBlockNode(currentBlockNode, canvasData);
  }

  return section;
}

export function convertQuestNode(questNode: CanvasNode, canvasData: CanvasData): QuestSchema {
  if (!questNode.text) {
    throw new Error('Quest text is required');
  }

  const lines = questNode.text.split('\n');
  const firstLine = lines[0];
  const {tag, name, id} = getMetadata(firstLine);
  if (!id) {
    throw new Error('Quest id is required: ' + firstLine);
  }

  if (tag !== 'quest') {
    throw new Error('Invalid quest tag: ' + tag);
  }

  const quest: QuestSchema = {
    name,
    id,
    desc: lines.slice(1).join('\n'),
    sections: [],
    modifiedAt: new Date()
  };

  let currentSectionNode = findNextSectionNode(questNode, canvasData);
  while (currentSectionNode) {
    const section = convertSectionNode(currentSectionNode, canvasData);
    quest.sections.push(section);
    currentSectionNode = findNextSectionNode(currentSectionNode, canvasData);
  }

  return quest;
}

function findJourneyNode(canvasData: CanvasData): CanvasNode | undefined {
  return canvasData.nodes.find(node => {
    if (node.type === 'file') {
      return false;
    }
    if (!node.text) {
      return false;
    }
    const content = node.text.trim();
    return content.startsWith('#journey ');
  });
}

export function findQuestNode(canvasData: CanvasData): CanvasNode | undefined {
  return canvasData.nodes.find(node => {
    if (node.type === 'file') {
      return false;
    }
    if (!node.text) {
      return false;
    }
    const content = node.text.trim();
    return content.startsWith('#quest ');
  });
}

export function convertQuestFile(questFilePath: string): QuestSchema {
  const questCanvasData: CanvasData = JSON.parse(fs.readFileSync(questFilePath, 'utf8'));
  const questNode = findQuestNode(questCanvasData);
  if (!questNode) {
    throw new Error('Quest node not found in file: ' + questFilePath);
  }
  return convertQuestNode(questNode, questCanvasData);
}

export function convertJourneyFile(journeyFile: string): JourneyResult {
  const journeyCanvasData: CanvasData = JSON.parse(fs.readFileSync(journeyFile, 'utf8'));

  const journeyNode = findJourneyNode(journeyCanvasData);
  if (!journeyNode) {
    throw new Error('Journey node not found in file: ' + journeyFile);
  }

  if (!journeyNode.text) {
    throw new Error('Journey text is required');
  }

  const lines = journeyNode.text.split('\n');
  const firstLine = lines[0];
  const {tag, name, id} = getMetadata(firstLine);
  
  if (!id) {
    throw new Error('Journey id is required: ' + journeyNode.text);
  }
  if (!name) {
    throw new Error('Journey name is required: ' + journeyNode.text);
  }

  const desc = lines.slice(1).join('\n').trim();

  const questMapWithNodeId: Record<string, QuestSchema> = {};
  const quests: QuestSchema[] = [];

  journeyCanvasData.nodes.forEach(node => {
    if (node.type === 'file' && node.file) {
      const quest = convertQuestFile(node.file);
      questMapWithNodeId[node.id] = quest;
      quests.push(quest);
    }
  });

  const questSummaryMap: Record<string, QuestSummarySchema> = {};

  Object.values(questMapWithNodeId).forEach(quest => {
    questSummaryMap[quest.id] = {
      questId: quest.id,
      name: quest.name,
      desc: quest.desc,
      dependencies: [],
      children: []
    };
  });

  journeyCanvasData.edges.forEach(edge => {
    if (edge.fromSide === 'bottom' && edge.toSide === 'top') {
      const fromNode = journeyCanvasData.nodes.find(n => n.id === edge.fromNode);
      const toNode = journeyCanvasData.nodes.find(n => n.id === edge.toNode);

      if (fromNode?.id === journeyNode.id) {
        return;
      }

      if (fromNode?.type === 'file' && toNode?.type === 'file') {
        const fromQuest = questMapWithNodeId[fromNode.id];
        const toQuest = questMapWithNodeId[toNode.id];

        if (fromQuest && toQuest) {
          questSummaryMap[fromQuest.id].children.push(toQuest.id);
          questSummaryMap[toQuest.id].dependencies.push(fromQuest.id);
        }
      }
    }
  });

  const journey: JourneySchema = {
    id,
    name,
    desc,
    questSummaries: Object.values(questSummaryMap),
  };

  return {
    journey,
    quests
  };
}

export function findNextSectionNode(currentNode: CanvasNode, canvasData: CanvasData): CanvasNode | null {
  const edge = canvasData.edges.find(edge => 
    edge.fromNode === currentNode.id && 
    edge.fromSide === 'right' && 
    edge.toSide === 'left'
  );
  return edge ? canvasData.nodes.find(node => node.id === edge.toNode) || null : null;
}

export function findNextBlockNode(currentNode: CanvasNode, canvasData: CanvasData): CanvasNode | null {
  const edge = canvasData.edges.find(edge => 
    edge.fromNode === currentNode.id && 
    edge.fromSide === 'bottom' && 
    edge.toSide === 'top'
  );
  return edge ? canvasData.nodes.find(node => node.id === edge.toNode) || null : null;
}

export function convertQuestCanvas(canvasData: CanvasData): QuestSchema {
  const questNode = findQuestNode(canvasData);
  if (!questNode) {
    throw new Error('Quest node not found in canvas data');
  }
  return convertQuestNode(questNode, canvasData);
}

