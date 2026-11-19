/** Relationship / story states for each immortal NPC. */
export const STORY_STATES = [
  '初识',
  '问道',
  '试炼',
  '结缘',
  '降妖',
] as const;

export type StoryState = (typeof STORY_STATES)[number];

export const IMMORTALS = [
  {
    id: 'tieguaili',
    name: '铁拐李',
    epithet: '跛仙济世',
    trait: '外貌粗陋、心怀慈悲，以葫芦济世救人。',
  },
  {
    id: 'hanzhongli',
    name: '汉钟离',
    epithet: '钟离权',
    trait: '坦腹大笑、扇子拂尘，点化凡尘。',
  },
  {
    id: 'zhangguolao',
    name: '张果老',
    epithet: '倒骑神驴',
    trait: '白发苍苍、倒骑毛驴，善言古今玄机。',
  },
  {
    id: 'lancaihe',
    name: '蓝采和',
    epithet: '踏歌散仙',
    trait: '破衫赤足、手持花篮，以歌点化世人。',
  },
  {
    id: 'hexiangu',
    name: '何仙姑',
    epithet: '荷花仙子',
    trait: '手执莲花、性喜清修，善察人心。',
  },
  {
    id: 'lvdongbin',
    name: '吕洞宾',
    epithet: '纯阳剑仙',
    trait: '剑气纵横、酒剑双绝，最喜论道试心。',
  },
  {
    id: 'hanxiangzi',
    name: '韩湘子',
    epithet: '紫箫仙音',
    trait: '一手紫箫、一缕仙音，可通天地之情。',
  },
  {
    id: 'caoguojiu',
    name: '曹国舅',
    epithet: '玉板净心',
    trait: '原为皇亲、后弃荣华，持玉板净心除妄。',
  },
] as const;

export type ImmortalId = (typeof IMMORTALS)[number]['id'];

export type ChatRole = 'player' | 'npc' | 'system';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  state?: StoryState;
  at: number;
}

export interface ImmortalProgress {
  state: StoryState;
  messages: ChatMessage[];
}

export interface GameSave {
  version: 1;
  selectedId: ImmortalId;
  byImmortal: Record<ImmortalId, ImmortalProgress>;
}

export interface LlmTurnResult {
  reply: string;
  nextState: StoryState;
  reason?: string;
}
