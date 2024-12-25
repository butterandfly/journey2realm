const Realm = require('realm');

const BlockType = Object.freeze({
    MD: 'md',
    DEFINITION: 'definition',
    FACT: 'fact',
    QUESTION: 'question',
});

const FactType = Object.freeze({
    FACT: 'fact',
    AXIOM: 'axiom',
    THEOREM: 'theorem',
    COROLLARY: 'corollary',
    LEMMA: 'lemma',
    PROPOSITION: 'proposition',
    CONJECTURE: 'conjecture',
});

const QuestionType = Object.freeze({
    SINGLE_CHOICE: 'single_choice',
    MULTIPLE_CHOICE: 'multiple_choice',
    TRUE_FALSE: 'true_false',
})

// Structure for SINGLE_CHOICE questionData:
// {
//     "choices": string[],  // Array of choice strings
//     "answer": int,        // Index of the correct answer in the choices array
//     "explanation": string // Explanation for the correct answer
// }


class Block extends Realm.Object {
    static schema = {
        name: 'Block',
        primaryKey: 'id',
        properties: {
            id: { type: 'string'},
            content: 'string',
            blockType: 'string',
            createdAt: { type: 'date', default: new Date() },
            modifiedAt: { type: 'date', default: new Date() },
            name: 'string?',
            factType: 'string?',
            questionType: 'string?',
            questionData: 'string?'
        }
    }
}

class Section extends Realm.Object {
    static schema = {
        name: 'Section',
        primaryKey: 'id',
        properties: {
            id: { type: 'string'},
            blocks: 'Block[]',
            name: 'string',
            createdAt: { type: 'date', default: new Date() },
            modifiedAt: { type: 'date', default: new Date() },
        }
    }
}

class Quest extends Realm.Object {
    static schema = {
        name: 'Quest',
        primaryKey: 'id',
        properties: {
            id: 'string',
            name: 'string',
            sections: 'Section[]',
            createdAt: { type: 'date', default: new Date() },
            modifiedAt: { type: 'date', default: new Date() },
        }
    }
}

class QuestSummary extends Realm.Object {
    static schema = {
        name: 'QuestSummary',
        embedded: true,
        properties: {
            questId: 'string',
            name: 'string',
            desc: 'string',
            dependencies: { type: 'list', objectType: 'string'},
            children: { type: 'list', objectType: 'string'},
        },
    };
}

class Journey extends Realm.Object {
    static schema = {
        name: 'Journey',
        primaryKey: 'id',
        properties: {
            id: 'string',
            desc: 'string',
            questSummaries: { type: 'list', objectType: 'QuestSummary' },
        }
    }
}

function saveJourney(journey, quests, realm) {
  realm.write(() => {
    // 先保存所有的 quests
    quests.forEach(quest => {
      realm.create('Quest', quest);
    });

    // 然后保存 journey
    realm.create('Journey', journey);
  });
}

module.exports = {
    BlockType,
    FactType,
    QuestionType,
    Block,
    Section,
    Quest,
    Journey,
    QuestSummary,
    saveJourney,
};