import "./env.js";
import { Redis } from "@upstash/redis";
import { toPublicParticipant, type Participant, type PublicParticipant } from "./fortune.js";

export type LadderState = {
  top: PublicParticipant[];
  bottom: Array<string | null>;
  rungs: Array<{
    level: number;
    left: number;
  }>;
  started: boolean;
  createdAt: number;
};

type Store = {
  participants: Participant[];
  matchingStarted: boolean;
  ladder: LadderState | null;
};

const SESSION_ID = "local-monthly";
const SESSION_TTL_SECONDS = 21600;
const REDIS_READY =
  Boolean(process.env.UPSTASH_REDIS_REST_URL) &&
  Boolean(process.env.UPSTASH_REDIS_REST_TOKEN);
const redis = REDIS_READY ? Redis.fromEnv() : null;

const globalForStore = globalThis as typeof globalThis & {
  icebreakingStore?: Store;
};

const memoryStore: Store =
  globalForStore.icebreakingStore ?? {
    participants: [],
    matchingStarted: false,
    ladder: null,
  };

if (!globalForStore.icebreakingStore) {
  globalForStore.icebreakingStore = memoryStore;
}

function sessionKey() {
  return `icebreaking:session:${SESSION_ID}:participants`;
}

function matchingKey() {
  return `icebreaking:session:${SESSION_ID}:matching-started`;
}

function ladderKey() {
  return `icebreaking:session:${SESSION_ID}:ladder`;
}

function sortParticipants(participants: Participant[]) {
  return [...participants].sort((a, b) => a.createdAt - b.createdAt);
}

function parseParticipant(value: unknown): Participant | null {
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as Participant;
    } catch {
      return null;
    }
  }
  if (value && typeof value === "object") return value as Participant;
  return null;
}

function parseLadder(value: unknown): LadderState | null {
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as LadderState;
    } catch {
      return null;
    }
  }
  if (value && typeof value === "object") return value as LadderState;
  return null;
}

export async function listParticipants() {
  if (!redis) return sortParticipants(memoryStore.participants);

  const values: unknown[] = await redis.hvals(sessionKey());
  const participants = values
    .map(parseParticipant)
    .filter((participant): participant is Participant => Boolean(participant));
  return sortParticipants(participants);
}

export async function saveParticipant(participant: Participant) {
  if (!redis) {
    memoryStore.participants = [
      ...memoryStore.participants.filter((item) => item.id !== participant.id),
      participant,
    ];
    return listParticipants();
  }

  await redis.hset(sessionKey(), {
    [participant.id]: JSON.stringify(participant),
  });
  await redis.expire(sessionKey(), SESSION_TTL_SECONDS);
  return listParticipants();
}

export async function clearParticipants() {
  if (!redis) {
    memoryStore.participants = [];
    memoryStore.matchingStarted = false;
    memoryStore.ladder = null;
    return;
  }

  await redis.del(sessionKey(), matchingKey(), ladderKey());
}

export async function isMatchingStarted() {
  if (!redis) return memoryStore.matchingStarted;

  const value = await redis.get(matchingKey());
  return value === "1" || value === 1 || value === true;
}

export async function startMatching() {
  if (!redis) {
    memoryStore.matchingStarted = true;
    return true;
  }

  await redis.set(matchingKey(), "1", { ex: SESSION_TTL_SECONDS });
  return true;
}

export async function getLadder() {
  if (!redis) return memoryStore.ladder;

  return parseLadder(await redis.get(ladderKey()));
}

export async function saveLadder(ladder: LadderState) {
  if (!redis) {
    memoryStore.ladder = ladder;
    return ladder;
  }

  await redis.set(ladderKey(), JSON.stringify(ladder), {
    ex: SESSION_TTL_SECONDS,
  });
  return ladder;
}

function randomIndex(limit: number) {
  return Math.floor(Math.random() * limit);
}

function shuffle<T>(items: T[]) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = randomIndex(index + 1);
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }
  return shuffled;
}

export function createLadder(participants: Participant[]) {
  const targetNames = ["김기현", "김경순", "송명훈"];
  const top = participants
    .filter((participant) => !targetNames.includes(participant.name))
    .map(toPublicParticipant);
  const bottom: Array<string | null> = Array.from({ length: top.length }, () => null);

  shuffle(Array.from({ length: top.length }, (_, index) => index))
    .slice(0, Math.min(targetNames.length, top.length))
    .forEach((position, index) => {
      bottom[position] = targetNames[index];
    });

  const levelCount = Math.max(8, Math.min(14, top.length + 4));
  const rungs: LadderState["rungs"] = [];

  for (let level = 0; level < levelCount; level += 1) {
    let column = 0;
    while (column < top.length - 1) {
      if (Math.random() < 0.34) {
        rungs.push({ level, left: column });
        column += 2;
      } else {
        column += 1;
      }
    }
  }

  return {
    top,
    bottom,
    rungs,
    started: false,
    createdAt: Date.now(),
  } satisfies LadderState;
}

export async function createAndSaveLadder(participants: Participant[]) {
  return saveLadder(createLadder(participants));
}

export async function startLadder() {
  const ladder = await getLadder();
  if (!ladder) return null;

  return saveLadder({ ...ladder, started: true });
}

export async function getStoreHealth() {
  if (!redis) {
    return {
      mode: "memory",
      redisConfigured: false,
      redisConnected: false,
    };
  }

  try {
    await redis.ping();
    return {
      mode: "redis",
      redisConfigured: true,
      redisConnected: true,
    };
  } catch {
    return {
      mode: "redis",
      redisConfigured: true,
      redisConnected: false,
    };
  }
}
