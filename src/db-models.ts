import { Realm } from 'realm';

export enum BlockType {
    MD = 'md',
    DEFINITION = 'definition',
    FACT = 'fact',
    QUESTION = 'question',
}

export enum FactType {
    FACT = 'fact',
    AXIOM = 'axiom',
    THEOREM = 'theorem',
    COROLLARY = 'corollary',
    LEMMA = 'lemma',
    PROPOSITION = 'proposition',
    CONJECTURE = 'conjecture',
}

export enum QuestionType {
    SINGLE_CHOICE = 'single_choice',
    MULTIPLE_CHOICE = 'multiple_choice',
    TRUE_FALSE = 'true_false',
}

// Structure for SINGLE_CHOICE questionData:
// {
//     "choices": string[],  // Array of choice strings
//     "answer": int,        // Index of the correct answer in the choices array
//     "explanation": string // Explanation for the correct answer
// }

export interface BlockSchema {
    id: string;
    content: string;
    blockType: string;
    modifiedAt: Date;
    name?: string;
    factType?: string;
    questionType?: string;
    questionData?: string;
}

export class Block extends Realm.Object<BlockSchema> {
    static schema = {
        name: 'Block',
        primaryKey: 'id',
        properties: {
            id: { type: 'string' },
            content: 'string',
            blockType: 'string',
            modifiedAt: { type: 'date', default: new Date() },
            name: 'string?',
            factType: 'string?',
            questionType: 'string?',
            questionData: 'string?'
        }
    };
}

export interface SectionSchema {
    id: string;
    blocks: BlockSchema[];
    name: string;
    desc: string;
    modifiedAt: Date;
}

export class Section extends Realm.Object<SectionSchema> {
    static schema = {
        name: 'Section',
        primaryKey: 'id',
        properties: {
            id: { type: 'string' },
            blocks: 'Block[]',
            name: 'string',
            desc: 'string',
            modifiedAt: { type: 'date', default: new Date() },
        }
    };
}

export interface QuestSchema {
    id: string;
    name: string;
    sections: SectionSchema[];
    modifiedAt: Date;
    desc: string;
}

export class Quest extends Realm.Object<QuestSchema> {
    static schema = {
        name: 'Quest',
        primaryKey: 'id',
        properties: {
            id: 'string',
            name: 'string',
            desc: 'string',
            sections: 'Section[]',
            modifiedAt: { type: 'date', default: new Date() },
        }
    };
}

export interface QuestSummarySchema {
    questId: string;
    name: string;
    desc: string;
    dependencies: string[];
    children: string[];
}

export class QuestSummary extends Realm.Object<QuestSummarySchema> {
    static schema = {
        name: 'QuestSummary',
        embedded: true,
        properties: {
            questId: 'string',
            name: 'string',
            desc: 'string',
            dependencies: { type: 'list', objectType: 'string' },
            children: { type: 'list', objectType: 'string' },
        },
    };
}

export interface JourneySchema {
    id: string;
    name: string;
    desc: string;
    questSummaries: QuestSummarySchema[];
}

export class Journey extends Realm.Object<JourneySchema> {
    static schema = {
        name: 'Journey',
        primaryKey: 'id',
        properties: {
            id: 'string',
            name: 'string',
            desc: 'string',
            questSummaries: { type: 'list', objectType: 'QuestSummary' },
        }
    };
}

export function saveJourney(journey: JourneySchema, quests: QuestSchema[], realm: Realm): Promise<JourneySchema> {
    return new Promise((resolve, reject) => {
        try {
            realm.write(() => {
                quests.forEach(quest => {
                    realm.create<Quest>('Quest', quest);
                });
                const savedJourney = realm.create<JourneySchema>('Journey', journey);
                resolve(savedJourney);
            });
        } catch (error) {
            reject(error);
        }
    });
} 