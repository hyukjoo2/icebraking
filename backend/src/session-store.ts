import "./env.js";
import { Redis } from "@upstash/redis";
import type { Participant } from "./fortune.js";

type Store = {
  participants: Participant[];
};

const SESSION_ID = process.env.ICEBREAKING_SESSION_ID ?? "default";
const SESSION_TTL_SECONDS = Number(
  process.env.ICEBREAKING_SESSION_TTL_SECONDS ?? 60 * 60 * 6,
);
const REDIS_READY =
  Boolean(process.env.UPSTASH_REDIS_REST_URL) &&
  Boolean(process.env.UPSTASH_REDIS_REST_TOKEN);
const redis = REDIS_READY ? Redis.fromEnv() : null;

const globalForStore = globalThis as typeof globalThis & {
  icebreakingStore?: Store;
};

const memoryStore: Store =
  globalForStore.icebreakingStore ?? { participants: [] };

if (!globalForStore.icebreakingStore) {
  globalForStore.icebreakingStore = memoryStore;
}

function sessionKey() {
  return `icebreaking:session:${SESSION_ID}:participants`;
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
    return;
  }

  await redis.del(sessionKey());
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
