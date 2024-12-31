export enum BlockType {
    MD = 'md',
    DEFINITION = 'definition',
    FACT = 'fact',
    QUESTION = 'question',
    REMARK = 'remark',
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

export interface SectionSchema {
    id: string;
    blocks: BlockSchema[];
    name: string;
    desc: string;
    modifiedAt: Date;
}

export interface QuestSchema {
    id: string;
    name: string;
    sections: SectionSchema[];
    modifiedAt: Date;
    desc: string;
}

export interface QuestSummarySchema {
    questId: string;
    name: string;
    desc: string;
    dependencies: string[];
    children: string[];
}

export interface JourneySchema {
    id: string;
    name: string;
    desc: string;
    questSummaries: QuestSummarySchema[];
}

export interface SingleChoiceQuestionDataSchema {
    questionContent: string;
    choices: { [key: string]: string };
    answer: string;
    explanation: string;
} 