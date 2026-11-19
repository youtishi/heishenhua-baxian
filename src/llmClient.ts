import { sanitizeTransition } from './stateMachine';
import { mockLlmTurn } from './mockLlm';
import type { ImmortalId, LlmTurnResult, StoryState } from './types';
import { IMMORTALS, STORY_STATES } from './types';

const STORAGE_MODE_KEY = 'hb-llm-mode';

export type LlmMode = 'mock' | 'api';

export function getLlmMode(): LlmMode {
  const v = localStorage.getItem(STORAGE_MODE_KEY);
  return v === 'api' ? 'api' : 'mock';
}

export function setLlmMode(mode: LlmMode): void {
  localStorage.setItem(STORAGE_MODE_KEY, mode);
}

function apiConfigured(): boolean {
  return Boolean(import.meta.env.VITE_OPENAI_API_KEY?.trim());
}

export function canUseApiMode(): boolean {
  return apiConfigured();
}

function buildSystemPrompt(
  immortalId: ImmortalId,
  currentState: StoryState,
): string {
  const imm = IMMORTALS.find((i) => i.id === immortalId)!;
  return [
    '你是「黑神话八仙」中的仙人 NPC。用简洁古风中文回复玩家（2～4 句）。',
    `你扮演：${imm.name}（${imm.epithet}）。性格：${imm.trait}`,
    `当前关系状态：${currentState}`,
    '合法状态顺序：初识 → 问道 → 试炼 → 结缘 → 降妖',
    '状态规则：只能保持、前进一格，或后退一格（温和回退）；禁止跳级。',
    '根据玩家发言与当前状态，决定是否推进/回退。',
    '必须只输出一行 JSON（不要 markdown）：',
    '{"reply":"仙人台词","nextState":"初识|问道|试炼|结缘|降妖","reason":"简短原因"}',
  ].join('\n');
}

async function apiLlmTurn(input: {
  immortalId: ImmortalId;
  currentState: StoryState;
  playerText: string;
  recentLines: string[];
}): Promise<LlmTurnResult> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY as string;
  const base =
    (import.meta.env.VITE_OPENAI_BASE_URL as string | undefined)?.replace(
      /\/$/,
      '',
    ) || 'https://api.openai.com/v1';
  const model =
    (import.meta.env.VITE_OPENAI_MODEL as string | undefined) || 'gpt-4o-mini';

  const body = {
    model,
    temperature: 0.7,
    messages: [
      {
        role: 'system',
        content: buildSystemPrompt(input.immortalId, input.currentState),
      },
      ...input.recentLines.map((line) => {
        const [role, ...rest] = line.split(':');
        return {
          role: role === 'player' ? ('user' as const) : ('assistant' as const),
          content: rest.join(':').trim(),
        };
      }),
      { role: 'user' as const, content: input.playerText },
    ],
  };

  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const raw = data.choices?.[0]?.message?.content?.trim() ?? '';
  const parsed = parseJsonPayload(raw);

  const nextState = sanitizeTransition(
    input.currentState,
    parsed?.nextState,
  );
  const reply =
    (parsed?.reply && String(parsed.reply).trim()) ||
    `${IMMORTALS.find((i) => i.id === input.immortalId)!.name}沉吟片刻，却未明言。`;

  return {
    reply,
    nextState,
    reason: parsed?.reason ? String(parsed.reason) : undefined,
  };
}

function parseJsonPayload(raw: string): {
  reply?: string;
  nextState?: string;
  reason?: string;
} | null {
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const text = (fence?.[1] ?? raw).trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const obj = JSON.parse(text.slice(start, end + 1)) as {
      reply?: string;
      nextState?: string;
      reason?: string;
    };
    if (
      obj.nextState &&
      !(STORY_STATES as readonly string[]).includes(obj.nextState)
    ) {
      obj.nextState = undefined;
    }
    return obj;
  } catch {
    return null;
  }
}

export async function runNpcTurn(input: {
  immortalId: ImmortalId;
  currentState: StoryState;
  playerText: string;
  recentLines: string[];
  mode: LlmMode;
}): Promise<LlmTurnResult> {
  if (input.mode === 'api' && apiConfigured()) {
    try {
      return await apiLlmTurn(input);
    } catch (e) {
      const fallback = await mockLlmTurn(input);
      return {
        ...fallback,
        reason: `API 失败，已回退 mock：${
          e instanceof Error ? e.message : String(e)
        }`,
      };
    }
  }
  return mockLlmTurn(input);
}
