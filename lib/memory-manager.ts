export type ConversationTurn = {
  role: "user" | "assistant";
  content: string;
  language: string;
  timestamp: string;
};

const sessionMemory = new Map<string, ConversationTurn[]>();

export function addTurn(sessionId: string, turn: ConversationTurn) {
  const current = sessionMemory.get(sessionId) ?? [];
  const next = [...current, turn].slice(-50);
  sessionMemory.set(sessionId, next);
}

export function getSessionHistory(sessionId: string): ConversationTurn[] {
  return sessionMemory.get(sessionId) ?? [];
}

export function clearSessionMemory(sessionId: string) {
  sessionMemory.delete(sessionId);
}
