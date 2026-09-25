type SignalMessage = {
  type: "offer" | "answer" | "ice";
  roomId: string;
  sender: string;
  data: any;
};

const sessions = new Map<string, { sender: string; receiver: string | null }>();
const messageQueues = new Map<string, SignalMessage[]>();
const TTL_MS = 5 * 60 * 1000;

function key(roomId: string, participant: string) {
  return `${roomId}::${participant}`;
}

export function createSession(roomId: string, participant: string) {
  const k = key(roomId, participant);
  if (!sessions.has(k)) {
    sessions.set(k, { sender: participant, receiver: null });
    messageQueues.set(k, []);
    setTimeout(() => {
      sessions.delete(k);
      messageQueues.delete(k);
    }, TTL_MS).unref?.();
  }
  return k;
}

export function getOrCreatePeerKey(roomId: string, participant: string) {
  return createSession(roomId, participant);
}

export function pushSignal(roomId: string, participant: string, msg: SignalMessage) {
  const k = key(roomId, participant);
  const q = messageQueues.get(k) || [];
  q.push(msg);
  messageQueues.set(k, q);
  sessions.set(k, sessions.get(k) || { sender: participant, receiver: null });
}

export function consumeSignals(roomId: string, participant: string): SignalMessage[] {
  const k = key(roomId, participant);
  const q = messageQueues.get(k) || [];
  messageQueues.set(k, []);
  // mark session alive
  sessions.set(k, sessions.get(k) || { sender: participant, receiver: null });
  return q;
}

export function cleanupSession(roomId: string, participant: string) {
  const k = key(roomId, participant);
  sessions.delete(k);
  messageQueues.delete(k);
}
