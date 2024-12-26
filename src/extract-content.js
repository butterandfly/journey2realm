const { BlockType, FactType, QuestionType } = require('./models');
const fs = require('fs');

// Function to find the quest node
const findQuestNode = (canvasData) => {
  return canvasData.nodes.find(node => {
    if (node.type === 'file') {
      return false;
    }
    const content = node.text.trim();
    return content.startsWith('#quest ');
  });
};

// Function to find the next section node
const findNextSectionNode = (currentNode, canvasData) => {
  const edge = canvasData.edges.find(edge => edge.fromNode === currentNode.id && edge.fromSide === 'right' && edge.toSide === 'left');
  return edge ? canvasData.nodes.find(node => node.id === edge.toNode) : null;
};

// Function to find the next block node
const findNextBlockNode = (currentNode, canvasData) => {
  const edge = canvasData.edges.find(edge => edge.fromNode === currentNode.id && edge.fromSide === 'bottom' && edge.toSide === 'top');
  return edge ? canvasData.nodes.find(node => node.id === edge.toNode) : null;
};

function convertBlockNode(blockNode) {
  const text = blockNode.text.trim();
  const firstLine = text.split('\n')[0];
  const {tag, name, id} = getMetadata(firstLine);
  if (!id) {
    throw new Error('Block id is required: ' + firstLine);
  }

  const content = text.split('\n').slice(1).join('\n').trim();

  let block = {
    name: name,
    id: id,
    content: content,
  }

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
      block.questionData = {
        choices: [],
        answer: -1,
        explanation: ''
    }
      break;
    default:
      block.blockType = BlockType.MD;
      break;
  }


  return block;
}

function convertSectionNode(sectionNode, canvasData) {
  const lines = sectionNode.text.split('\n');
  const firstLine = lines[0];
  const {tag, name, id} = getMetadata(firstLine);
  if (!id) {
    throw new Error('Section id is required: ' + firstLine);
  }

  if (tag !== 'section') {
    throw new Error('Invalid section tag: ' + tag);
  }

  const section = {
    name: name,
    id: id,
    desc: lines.slice(1).join('\n'),
    blocks: []
  };

  let currentBlockNode = findNextBlockNode(sectionNode, canvasData);
  while (currentBlockNode) {
    const block = convertBlockNode(currentBlockNode);
    section.blocks.push(block);
    currentBlockNode = findNextBlockNode(currentBlockNode, canvasData);
  }

  return section;
}

function convertQuestNode(questNode, canvasData) {
  const lines = questNode.text.split('\n');
  const firstLine = lines[0];
  const {tag, name, id} = getMetadata(firstLine);
  if (!id) {
    throw new Error('Quest id is required: ' + firstLine);
  }

  if (tag !== 'quest') {
    throw new Error('Invalid quest tag: ' + tag);

  }

  const quest = {
    name: name,
    id: id,
    desc: lines.slice(1).join('\n'),
    sections: []
  };

  let currentSectionNode = findNextSectionNode(questNode, canvasData);
  while (currentSectionNode) {
    const section = convertSectionNode(currentSectionNode, canvasData);
    quest.sections.push(section);
    currentSectionNode = findNextSectionNode(currentSectionNode, canvasData);
  }

  return quest;
}

// Example line: `#definition Definition Name ^uuid`, where "definition" is the tag, "Definition Name" is the name (optional), and "uuid" is the id (optional)
// Valid lines:
// - `#definition Definition Name`
// - `#definition Definition Name ^uuid`
// - `#theorem $x^2=y$ ^uuid`
// - `#para ^uuid`
// - `#para`
// Get metadata from the line
function getMetadata(line) {
  const parts = line.trim().split(' ');
  const tag = parts[0].replace('#', '');

  // 判断最后一个string是否是`^`开始的uuid，是的话就设置为id
  let id = null;
  const lastPart = parts[parts.length - 1];
  // 用正则判断是否为uuid v4
  if (lastPart.startsWith('^') && isValidUUID(lastPart.replace('^', ''))) {
    id = lastPart.replace('^', '');
    parts.pop();
  }

  // 获取name
  const name = parts.slice(1).join(' ');

  return { tag, name, id };
}


function isValidUUID(str) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

function convertQuestFile(questFilePath) {
  const questCanvasData = JSON.parse(fs.readFileSync(questFilePath, 'utf8'));
  const questNode = findQuestNode(questCanvasData);
  if (!questNode) {
    throw new Error('Quest node not found in file: ' + questFilePath);
  }
  return convertQuestNode(questNode, questCanvasData);
}

function findJourneyNode(canvasData) {
  return canvasData.nodes.find(node => {
    if (node.type === 'file') {
      return false;
    }
    const content = node.text.trim();
    return content.startsWith('#journey ');
  });
}

function convertJourneyFile(journeyFile) {
  const journeyCanvasData = JSON.parse(fs.readFileSync(journeyFile, 'utf8'));

  const journeyNode = findJourneyNode(journeyCanvasData);
  if (!journeyNode) {
    throw new Error('Journey node not found in file: ' + journeyFile);
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

  // 获取所有quest文件节点并转换
  const questMapWithNodeId = {};
  const quests = [];  // 存储所有完整的 quest 对象
  journeyCanvasData.nodes.forEach(node => {
    if (node.type === 'file') {
      const quest = convertQuestFile(node.file);
      questMapWithNodeId[node.id] = quest;
      quests.push(quest);
    }
  });

  const questSummaryMap = {};

  // 创建quest摘要
  Object.values(questMapWithNodeId).forEach(quest => {
    questSummaryMap[quest.id] = {
      questId: quest.id,
      name: quest.name,
      desc: quest.desc,
      dependencies: [],
      children: []
    };
  });

  // 处理依赖关系
  journeyCanvasData.edges.forEach(edge => {
    if (edge.fromSide === 'bottom' && edge.toSide === 'top') {
      const fromNode = journeyCanvasData.nodes.find(n => n.id === edge.fromNode);
      const toNode = journeyCanvasData.nodes.find(n => n.id === edge.toNode);

      // 跳过从 journey 节点出发的边
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

  const journey = {
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

module.exports = {
  findQuestNode,
  convertBlockNode,
  getMetadata,
  convertSectionNode,
  convertQuestNode,
  convertJourneyFile,
  convertQuestFile,
};