import { useEffect, useRef, useState } from 'react';
import {
  canUseApiMode,
  getLlmMode,
  runNpcTurn,
  setLlmMode,
  type LlmMode,
} from './llmClient';
import { STATE_MEANINGS } from './stateMachine';
import {
  defaultSave,
  loadSave,
  persistSave,
  resetAll,
  resetImmortal,
} from './storage';
import {
  IMMORTALS,
  type ChatMessage,
  type GameSave,
  type ImmortalId,
  type StoryState,
} from './types';
import './App.css';

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function App() {
  const [save, setSave] = useState<GameSave>(() => loadSave());
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<LlmMode>(() => getLlmMode());
  const [hint, setHint] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const immortal = IMMORTALS.find((i) => i.id === save.selectedId)!;
  const progress = save.byImmortal[save.selectedId];

  useEffect(() => {
    persistSave(save);
  }, [save]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [progress.messages.length, busy]);

  function selectImmortal(id: ImmortalId) {
    setSave((s) => ({ ...s, selectedId: id }));
    setHint(null);
  }

  async function send() {
    const text = draft.trim();
    if (!text || busy) return;

    const playerMsg: ChatMessage = {
      id: uid(),
      role: 'player',
      text,
      at: Date.now(),
    };

    setDraft('');
    setBusy(true);
    setHint(null);

    setSave((s) => {
      const cur = s.byImmortal[s.selectedId];
      return {
        ...s,
        byImmortal: {
          ...s.byImmortal,
          [s.selectedId]: {
            ...cur,
            messages: [...cur.messages, playerMsg],
          },
        },
      };
    });

    const recent = progress.messages
      .slice(-6)
      .map((m) => `${m.role === 'player' ? 'player' : 'npc'}: ${m.text}`);

    try {
      const result = await runNpcTurn({
        immortalId: save.selectedId,
        currentState: progress.state,
        playerText: text,
        recentLines: recent,
        mode,
      });

      const npcMsg: ChatMessage = {
        id: uid(),
        role: 'npc',
        text: result.reply,
        state: result.nextState,
        at: Date.now(),
      };

      setSave((s) => {
        const cur = s.byImmortal[s.selectedId];
        return {
          ...s,
          byImmortal: {
            ...s.byImmortal,
            [s.selectedId]: {
              state: result.nextState,
              messages: [...cur.messages, npcMsg],
            },
          },
        };
      });

      if (result.reason) setHint(result.reason);
    } catch (e) {
      setHint(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function onModeChange(next: LlmMode) {
    if (next === 'api' && !canUseApiMode()) {
      setHint('未配置 VITE_OPENAI_API_KEY，仍使用 mock。见 README。');
      setMode('mock');
      setLlmMode('mock');
      return;
    }
    setMode(next);
    setLlmMode(next);
    setHint(next === 'api' ? '已切换为 API 模式' : '已切换为离线 mock');
  }

  return (
    <div className="shell">
      <div className="mist" aria-hidden />
      <header className="top">
        <div className="brand-block">
          <p className="brand">黑神话八仙</p>
          <h1 className="tagline">仙缘问道 · 八仙论心</h1>
        </div>
        <div className="controls">
          <label className="mode">
            <span>对话引擎</span>
            <select
              value={mode}
              onChange={(e) => onModeChange(e.target.value as LlmMode)}
            >
              <option value="mock">Mock（离线）</option>
              <option value="api">OpenAI 兼容 API</option>
            </select>
          </label>
          <button
            type="button"
            className="ghost"
            onClick={() => {
              setSave((s) => resetImmortal(s, s.selectedId));
              setHint(`已重置 ${immortal.name} 的缘分`);
            }}
          >
            重置当前
          </button>
          <button
            type="button"
            className="ghost"
            onClick={() => {
              setSave(resetAll());
              setHint('已清空全部存档');
            }}
          >
            清空存档
          </button>
        </div>
      </header>

      <main className="layout">
        <aside className="roster" aria-label="八仙">
          <h2>八仙</h2>
          <ul>
            {IMMORTALS.map((imm) => {
              const st = save.byImmortal[imm.id].state;
              const active = imm.id === save.selectedId;
              return (
                <li key={imm.id}>
                  <button
                    type="button"
                    className={active ? 'immortal active' : 'immortal'}
                    onClick={() => selectImmortal(imm.id)}
                  >
                    <span className="imm-name">{imm.name}</span>
                    <span className="imm-meta">{imm.epithet}</span>
                    <span className={`badge s-${stateClass(st)}`}>{st}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <section className="chat" aria-label="对话">
          <div className="chat-head">
            <div>
              <h2>{immortal.name}</h2>
              <p className="epithet">
                {immortal.epithet} · {immortal.trait}
              </p>
            </div>
            <div className="state-panel">
              <span className={`badge big s-${stateClass(progress.state)}`}>
                {progress.state}
              </span>
              <p className="state-desc">{STATE_MEANINGS[progress.state]}</p>
            </div>
          </div>

          <div className="messages" ref={listRef}>
            {progress.messages.length === 0 && (
              <div className="empty">
                <p>
                  你初至仙山，{immortal.name}负手而立。开口一问，缘分自启。
                </p>
                <p className="tips">
                  试着说：请教仙法、愿受试炼、愿结仙缘、同去降妖……
                </p>
              </div>
            )}
            {progress.messages.map((m) => (
              <article
                key={m.id}
                className={m.role === 'player' ? 'bubble player' : 'bubble npc'}
              >
                <header>
                  {m.role === 'player' ? '行者' : immortal.name}
                  {m.state && (
                    <span className={`badge tiny s-${stateClass(m.state)}`}>
                      {m.state}
                    </span>
                  )}
                </header>
                <p>{m.text}</p>
              </article>
            ))}
            {busy && (
              <article className="bubble npc pending">
                <header>{immortal.name}</header>
                <p>沉吟中……</p>
              </article>
            )}
          </div>

          {hint && <p className="hint">{hint}</p>}

          <form
            className="composer"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="对仙人言……"
              disabled={busy}
              maxLength={500}
              autoComplete="off"
            />
            <button type="submit" disabled={busy || !draft.trim()}>
              言
            </button>
          </form>
        </section>
      </main>

      <footer className="foot">
        <span>状态机：保持 / 前进一格 / 回退一格（禁止跳级）</span>
        <button
          type="button"
          className="linkish"
          onClick={() => setSave(defaultSave())}
        >
          恢复默认选中
        </button>
      </footer>
    </div>
  );
}

function stateClass(state: StoryState): string {
  const map: Record<StoryState, string> = {
    初识: '1',
    问道: '2',
    试炼: '3',
    结缘: '4',
    降妖: '5',
  };
  return map[state];
}
