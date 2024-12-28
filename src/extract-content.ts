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
  QuestSummarySchema
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
      block.questionData = JSON.stringify({
        choices: [],
        answer: -1,
        explanation: ''
      });
      break;
    case 'para':
      block.blockType = BlockType.MD;
      break;
  }

  return block;
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

