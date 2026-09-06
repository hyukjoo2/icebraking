"use client";

import { FormEvent, useEffect, useState } from "react";

type Participant = {
  id: string;
  name: string;
  birthDate: string;
  birthHour: string;
  calendarType: "solar" | "lunar";
  createdAt: number;
};

type PublicParticipant = Pick<Participant, "id" | "name">;

type Profile = {
  element: string;
  elementLabel: string;
  archetype: string;
  meetingRole: string;
  energy: {
    drive: number;
    focus: number;
    collaboration: number;
  };
  advice: string;
  waves?: Array<{
    label: string;
    title: string;
    description: string;
  }>;
};

const hours = [
  ["unknown", "모름"],
  ["23", "자시 23:00-00:59"],
  ["1", "축시 01:00-02:59"],
  ["3", "인시 03:00-04:59"],
  ["5", "묘시 05:00-06:59"],
  ["7", "진시 07:00-08:59"],
  ["9", "사시 09:00-10:59"],
  ["11", "오시 11:00-12:59"],
  ["13", "미시 13:00-14:59"],
  ["15", "신시 15:00-16:59"],
  ["17", "유시 17:00-18:59"],
  ["19", "술시 19:00-20:59"],
  ["21", "해시 21:00-22:59"],
];

type MatchKey = "best" | "noble" | "rightHand" | "tuneUp";

const matchLabels: Record<MatchKey, string> = {
  best: "케미 좋은 사람",
  noble: "오늘의 귀인",
  rightHand: "믿을 만한 오른팔",
  tuneUp: "조율하면 강한 조합",
};

type MatchResult = {
  participant: PublicParticipant;
  score: number;
};

type Matches = Record<MatchKey, MatchResult | null>;

const birthDatePattern = /^\d{4}-\d{2}-\d{2}$/;

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  (process.env.NODE_ENV === "development"
    ? "http://localhost:4000"
    : "https://icebraking.onrender.com");

function apiUrl(path: string) {
  if (!apiBaseUrl) return path;
  return `${apiBaseUrl}${path}`;
}

function formatBirthDate(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}

async function readJson(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error(`API가 JSON 대신 ${response.status} 응답을 보냈습니다.`);
  }
  return response.json();
}

export default function Home() {
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [birthHour, setBirthHour] = useState("unknown");
  const [calendarType, setCalendarType] = useState<"solar" | "lunar">("solar");
  const [me, setMe] = useState<Participant | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [participants, setParticipants] = useState<PublicParticipant[]>([]);
  const [matches, setMatches] = useState<Matches | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const storedId = window.localStorage.getItem("icebreaking-participant-id");
    async function load() {
      const response = await fetch(apiUrl("/api/participants"), {
        cache: "no-store",
      });
      if (!response.ok) return;
      const data = await readJson(response);
      setParticipants(data.participants);
      if (!storedId) return;

      const matchesResponse = await fetch(
        apiUrl(`/api/matches?participantId=${storedId}`),
        { cache: "no-store" },
      );
      if (!matchesResponse.ok) return;
      const matchesData = await readJson(matchesResponse);
      setProfile(matchesData.profile);
      setMatches(matchesData.matches);
    }
    load();
    const timer = window.setInterval(load, 3000);
    return () => window.clearInterval(timer);
  }, []);

  const matchItems = (Object.keys(matchLabels) as MatchKey[]).map((key) => ({
    key,
    label: matchLabels[key],
    match: matches?.[key] ?? null,
  }));

  async function join(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!birthDatePattern.test(birthDate)) {
      setError("생년월일은 YYYY-MM-DD 형식으로 입력해 주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      const participantId = window.localStorage.getItem(
        "icebreaking-participant-id",
      );
      const response = await fetch(apiUrl("/api/participants"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId,
          name,
          birthDate,
          birthHour,
          calendarType,
        }),
      });
      const data = await readJson(response);

      if (!response.ok) {
        setError(data.message ?? "입장 정보를 확인해 주세요.");
        return;
      }

      window.localStorage.setItem(
        "icebreaking-participant-id",
        data.participant.id,
      );
      setMe(data.participant);
      setProfile(data.profile);
      setParticipants(data.participants);

      const matchesResponse = await fetch(
        apiUrl(`/api/matches?participantId=${data.participant.id}`),
        { cache: "no-store" },
      );
      if (matchesResponse.ok) {
        const matchesData = await readJson(matchesResponse);
        setMatches(matchesData.matches);
      }
    } catch {
      setError("백엔드 서버에 연결할 수 없습니다. npm run dev:backend를 확인해 주세요.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function resetSession() {
    await fetch(apiUrl("/api/participants"), { method: "DELETE" });
    window.localStorage.removeItem("icebreaking-participant-id");
    setMe(null);
    setProfile(null);
    setMatches(null);
    setParticipants([]);
  }

  return (
    <main className="shell">
      <section className="topbar">
        <div>
          <p className="eyebrow">월간회의 10분 아이스브레이킹</p>
          <h1>케미 매칭</h1>
        </div>
        <div className="session-pill">{participants.length}명 입장</div>
      </section>

      {!me ? (
        <section className="entry-layout">
          <div className="intro">
            <h2>입장하면 내 분석과 오늘의 매칭이 열립니다.</h2>
            <p>
              입력값은 현재 회의 세션의 매칭 계산에만 쓰는 구조입니다. 첫
              버전은 템플릿 기반으로 빠르게 반응합니다.
            </p>
            <div className="notice">
              재미용 콘텐츠입니다. 실제 만세력 엔진은 다음 단계에서 붙일 수
              있어요.
            </div>
          </div>

          <form className="entry-form" onSubmit={join}>
            <label>
              이름 또는 닉네임
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="예: 지수"
                maxLength={20}
              />
            </label>

            <label>
              생년월일
              <input
                type="text"
                inputMode="numeric"
                value={birthDate}
                onChange={(event) =>
                  setBirthDate(formatBirthDate(event.target.value))
                }
                placeholder="YYYY-MM-DD"
                pattern="\d{4}-\d{2}-\d{2}"
                maxLength={10}
              />
            </label>

            <label>
              태어난 시간
              <select
                value={birthHour}
                onChange={(event) => setBirthHour(event.target.value)}
              >
                {hours.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <div className="segmented" aria-label="달력 선택">
              <button
                type="button"
                className={calendarType === "solar" ? "active" : ""}
                onClick={() => setCalendarType("solar")}
              >
                양력
              </button>
              <button
                type="button"
                className={calendarType === "lunar" ? "active" : ""}
                onClick={() => setCalendarType("lunar")}
              >
                음력
              </button>
            </div>

            {error ? <p className="error">{error}</p> : null}
            <button className="primary" disabled={isSubmitting}>
              {isSubmitting ? "입장 중" : "입장하기"}
            </button>
          </form>
        </section>
      ) : (
        <section className="dashboard">
          <div className="profile-panel">
            <div className="profile-head">
              <div>
                <p className="eyebrow">나의 회의 캐릭터</p>
                <h2>{profile?.archetype}</h2>
              </div>
              <span>{profile?.elementLabel}</span>
            </div>
            <p className="role">{profile?.meetingRole}</p>
            <div className="meters">
              <Meter label="추진력" value={profile?.energy.drive ?? 0} />
              <Meter label="집중력" value={profile?.energy.focus ?? 0} />
              <Meter label="협업운" value={profile?.energy.collaboration ?? 0} />
            </div>
            <p className="advice">{profile?.advice}</p>
            {profile?.waves?.length ? (
              <div className="wave-panel">
                <p className="eyebrow">2주 단위 해석</p>
                <div className="wave-list">
                  {profile.waves.map((wave) => (
                    <article key={wave.label} className="wave-item">
                      <span>{wave.label}</span>
                      <h3>{wave.title}</h3>
                      <p>{wave.description}</p>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="match-panel">
            <div className="match-panel-head">
              <p className="eyebrow">오늘의 관계 지도</p>
              <h2>4가지 매칭</h2>
            </div>

            {matchItems.some((item) => item.match) ? (
              <div className="match-wheel">
                <div className="match-core">
                  <span>{me.name}</span>
                  <strong>ME</strong>
                </div>
                {matchItems.map((item) => (
                  <article
                    key={item.key}
                    className={`radial-card radial-card-${item.key}`}
                  >
                    <p>{item.label}</p>
                    <h3>{item.match?.participant.name ?? "대기 중"}</h3>
                    <div>{item.match?.score ?? "--"}</div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty">
                <h2>조금만 더 기다려 주세요.</h2>
                <p>두 명 이상 입장하면 매칭 결과가 열립니다.</p>
              </div>
            )}
          </div>

          <aside className="people">
            <div className="people-head">
              <h2>입장 명단</h2>
              <button onClick={resetSession}>세션 초기화</button>
            </div>
            <div className="people-list">
              {participants.map((participant) => (
                <span key={participant.id}>{participant.name}</span>
              ))}
            </div>
          </aside>
        </section>
      )}
    </main>
  );
}

function Meter({ label, value }: { label: string; value: number }) {
  return (
    <div className="meter">
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div className="track">
        <div style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
