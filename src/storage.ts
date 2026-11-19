import { IMMORTALS, type GameSave, type ImmortalId, type ImmortalProgress } from './types';

const KEY = 'heishenhua-baxian-save-v1';

function emptyProgress(): ImmortalProgress {
  return { state: '初识', messages: [] };
}

export function defaultSave(): GameSave {
  const byImmortal = {} as GameSave['byImmortal'];
  for (const imm of IMMORTALS) {
    byImmortal[imm.id] = emptyProgress();
  }
  return {
    version: 1,
    selectedId: 'lvdongbin',
    byImmortal,
  };
}

export function loadSave(): GameSave {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultSave();
    const parsed = JSON.parse(raw) as GameSave;
    if (parsed?.version !== 1 || !parsed.byImmortal) return defaultSave();
    const base = defaultSave();
    for (const imm of IMMORTALS) {
      const p = parsed.byImmortal[imm.id];
      if (p?.state && Array.isArray(p.messages)) {
        base.byImmortal[imm.id] = p;
      }
    }
    if (
      parsed.selectedId &&
      IMMORTALS.some((i) => i.id === parsed.selectedId)
    ) {
      base.selectedId = parsed.selectedId;
    }
    return base;
  } catch {
    return defaultSave();
  }
}

export function persistSave(save: GameSave): void {
  localStorage.setItem(KEY, JSON.stringify(save));
}

export function resetImmortal(save: GameSave, id: ImmortalId): GameSave {
  return {
    ...save,
    byImmortal: {
      ...save.byImmortal,
      [id]: emptyProgress(),
    },
  };
}

export function resetAll(): GameSave {
  localStorage.removeItem(KEY);
  return defaultSave();
}
