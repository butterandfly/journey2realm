import { Realm } from 'realm';
import {
    BlockSchema,
    SectionSchema,
    QuestSchema,
    QuestSummarySchema,
    JourneySchema
} from './schemas';

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