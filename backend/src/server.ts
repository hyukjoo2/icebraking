import cors from "cors";
import express from "express";
import "./env.js";
import { getMatches, getProfile, toPublicParticipant, type Participant } from "./fortune.js";
import {
  clearParticipants,
  getStoreHealth,
  listParticipants,
  saveParticipant,
} from "./session-store.js";

const app = express();
const port = Number(process.env.PORT ?? 4000);
const defaultAllowedOrigins = [
  "http://localhost:3000",
  "https://icebraking-frontend.vercel.app",
];
const configuredAllowedOrigins = (process.env.FRONTEND_ORIGIN ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = Array.from(
  new Set([...defaultAllowedOrigins, ...configuredAllowedOrigins]),
);
const birthDatePattern = /^\d{4}-\d{2}-\d{2}$/;

app.use(express.json());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
  }),
);

app.get("/health", async (_request, response, next) => {
  try {
    response.json({ ok: true, store: await getStoreHealth() });
  } catch (error) {
    next(error);
  }
});

app.get("/api/participants", async (_request, response, next) => {
  try {
    const participants = await listParticipants();
    response.json({ participants: participants.map(toPublicParticipant) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/participants", async (request, response, next) => {
  try {
    const body = request.body ?? {};
    const requestedId = String(body.participantId ?? "");
    const participant: Participant = {
      id: requestedId.length > 10 ? requestedId : crypto.randomUUID(),
      name: String(body.name ?? "").trim().slice(0, 20),
      birthDate: String(body.birthDate ?? ""),
      birthHour: String(body.birthHour ?? "unknown"),
      calendarType: body.calendarType === "lunar" ? "lunar" : "solar",
      createdAt: Date.now(),
    };

    if (!participant.name || !participant.birthDate) {
      response.status(400).json({ message: "이름과 생년월일을 입력해 주세요." });
      return;
    }

    if (!birthDatePattern.test(participant.birthDate)) {
      response
        .status(400)
        .json({ message: "생년월일은 YYYY-MM-DD 형식으로 입력해 주세요." });
      return;
    }

    const participants = await saveParticipant(participant);
    response.json({
      participant,
      profile: getProfile(participant),
      participants: participants.map(toPublicParticipant),
    });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/participants", async (_request, response, next) => {
  try {
    if (process.env.NODE_ENV === "production") {
      response
        .status(403)
        .json({ message: "프로덕션에서는 관리자 기능으로 분리해 주세요." });
      return;
    }

    await clearParticipants();
    response.json({ participants: [] });
  } catch (error) {
    next(error);
  }
});

app.get("/api/matches", async (request, response, next) => {
  try {
    const participantId = String(request.query.participantId ?? "");
    const participants = await listParticipants();
    const me = participants.find((participant) => participant.id === participantId);

    if (!me) {
      response.status(404).json({ message: "참가자 정보를 찾을 수 없습니다." });
      return;
    }

    const matches = getMatches(me, participants);
    const mapMatch = (key: keyof typeof matches) => {
      const match = matches[key];
      if (!match) return null;
      return {
        participant: toPublicParticipant(match.participant),
        score: match.score,
      };
    };

    response.json({
      profile: getProfile(me),
      matches: {
        best: mapMatch("best"),
        noble: mapMatch("noble"),
        rightHand: mapMatch("rightHand"),
        tuneUp: mapMatch("tuneUp"),
      },
    });
  } catch (error) {
    next(error);
  }
});

app.use(
  (
    error: unknown,
    _request: express.Request,
    response: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(error);
    response.status(500).json({ message: "서버 오류가 발생했습니다." });
  },
);

app.listen(port, "0.0.0.0", () => {
  console.log(`Icebreaking backend listening on http://localhost:${port}`);
});
