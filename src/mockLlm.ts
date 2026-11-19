import { nextForwardState, sanitizeTransition } from './stateMachine';
import type { ImmortalId, LlmTurnResult, StoryState } from './types';
import { IMMORTALS } from './types';

type Immortal = (typeof IMMORTALS)[number];

function immortalById(id: ImmortalId): Immortal {
  return IMMORTALS.find((i) => i.id === id)!;
}

/** Keyword heuristics → desired next state (then sanitized). */
function inferDesiredState(
  current: StoryState,
  playerText: string,
): StoryState {
  const t = playerText.trim();
  const lower = t.toLowerCase();

  const wantsAdvance =
    /请教|求道|问道|修行|仙法|点化|愿闻|拜师|结缘|同行|降妖|除魔|妖|魔|试炼|考验|答应|愿往|听从|请赐/.test(
      t,
    ) ||
    /dao|quest|fight|demon|train|ally/.test(lower);

  const wantsBack =
    /误会|抱歉|告辞|先走|不敢|认错|退|离开/.test(t) && t.length < 40;

  if (wantsBack) {
    const order = ['初识', '问道', '试炼', '结缘', '降妖'] as const;
    const i = order.indexOf(current);
    return i > 0 ? order[i - 1] : current;
  }

  if (!wantsAdvance) return current;

  // Require some substance to advance from 初识
  if (current === '初识' && t.length < 4) return current;

  // Need clear intent to enter 降妖
  if (current === '结缘') {
    if (/降妖|除魔|妖|魔|同行|共赴|助/.test(t)) {
      return '降妖';
    }
    return current;
  }

  return nextForwardState(current) ?? current;
}

const LINE_BY_STATE: Record<
  StoryState,
  (imm: Immortal, player: string, advanced: boolean) => string
> = {
  初识: (imm, player, advanced) =>
    advanced
      ? `（${imm.name}微微颔首）${imm.epithet}在此。看你言语不俗，且随我问上一问仙道——你方才说「${clip(player)}」，倒也有几分缘分。`
      : `贫道${imm.name}，${imm.trait}行者，你是何人？前来所为何事？`,
  问道: (imm, player, advanced) =>
    advanced
      ? `道可道，非常道。你问「${clip(player)}」，已入问道之门。然空言无用——我要试你心性一分。`
      : `${imm.name}抚须道：仙道非口舌可尽。你可再问因果、心性、或世间妖障。`,
  试炼: (_imm, player, advanced) =>
    advanced
      ? `好。你面对试炼仍言「${clip(player)}」，心不散乱。自此与我结缘，可授你一缕仙机。`
      : `试炼当前：若贪念、惧念、妄念占上风，缘分便薄。你且以本心答我——愿不愿承此考验？`,
  结缘: (_imm, player, advanced) =>
    advanced
      ? `缘已结。听你要「${clip(player)}」，便随我去降那一方妖障。剑起箫鸣，各显神通。`
      : `既结仙缘，你我便是同道。若闻某处有妖作乱，开口便是，贫道与你同行。`,
  降妖: (imm, _player, _advanced) =>
    `妖气翻涌之处，${imm.name}已在前头。${imm.epithet}——随我口诀，镇妖缚魔！（演示终局：可继续闲谈，状态可轻微回退至结缘）`,
};

function clip(s: string, n = 18): string {
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

/**
 * Offline mock LLM: scripted / heuristic replies + proposed next state.
 * Always returns a state that passes `sanitizeTransition`.
 */
export async function mockLlmTurn(input: {
  immortalId: ImmortalId;
  currentState: StoryState;
  playerText: string;
  historySummary?: string;
}): Promise<LlmTurnResult> {
  // Tiny delay so UI feels like a turn
  await new Promise((r) => setTimeout(r, 280 + Math.random() * 220));

  const imm = immortalById(input.immortalId);
  const desired = inferDesiredState(input.currentState, input.playerText);
  const nextState = sanitizeTransition(input.currentState, desired);
  const advanced = nextState !== input.currentState;
  const reply = LINE_BY_STATE[nextState](imm, input.playerText, advanced);

  return {
    reply,
    nextState,
    reason: advanced
      ? `启发式推进：${input.currentState} → ${nextState}`
      : `保持：${input.currentState}`,
  };
}
