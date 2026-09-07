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

type MatchKey = "best" | "noble" | "rightHand" | "tuneUp" | "drag";

const matchLabels: Record<MatchKey, string> = {
  best: "케미 좋은 사람",
  noble: "오늘의 귀인",
  rightHand: "믿을 만한 오른팔",
  tuneUp: "조율하면 강한 조합",
  drag: "내 발목을 잡는 사람",
};

type MatchResult = {
  participant: PublicParticipant;
  score: number;
};

type Matches = Record<MatchKey, MatchResult | null>;

type LadderState = {
  top: PublicParticipant[];
  bottom: Array<string | null>;
  rungs: Array<{
    level: number;
    left: number;
  }>;
  started: boolean;
  createdAt: number;
};

const birthDatePattern = /^\d{4}-\d{2}-\d{2}$/;

const apiBaseUrl = "https://icebraking.onrender.com";

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
  const [matchingStarted, setMatchingStarted] = useState(false);
  const [ladder, setLadder] = useState<LadderState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAdminActionRunning, setIsAdminActionRunning] = useState(false);
  const [error, setError] = useState("");

  async function refreshMatches(participantId: string) {
    const matchesResponse = await fetch(
      apiUrl(`/api/matches?participantId=${participantId}`),
      { cache: "no-store" },
    );
    if (!matchesResponse.ok) return;

    const matchesData = await readJson(matchesResponse);
    setProfile(matchesData.profile);
    setMatches(matchesData.matches);
    setMatchingStarted(Boolean(matchesData.matchingStarted));
    setLadder(matchesData.ladder ?? null);
  }

  useEffect(() => {
    async function load() {
      const storedId = window.localStorage.getItem("icebreaking-participant-id");
      const response = await fetch(apiUrl("/api/participants"), {
        cache: "no-store",
      });
      if (!response.ok) return;
      const data = await readJson(response);
      setParticipants(data.participants);
      setMatchingStarted(Boolean(data.matchingStarted));
      setLadder(data.ladder ?? null);
      if (!storedId) return;

      await refreshMatches(storedId);
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
      setMatchingStarted(Boolean(data.matchingStarted));
      setLadder(data.ladder ?? null);

      await refreshMatches(data.participant.id);
    } catch {
      setError("백엔드 서버에 연결할 수 없습니다. npm run dev:backend를 확인해 주세요.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function resetSession() {
    if (!me) return;
    setIsAdminActionRunning(true);
    await fetch(apiUrl(`/api/participants?participantId=${me.id}`), {
      method: "DELETE",
    });
    window.localStorage.removeItem("icebreaking-participant-id");
    setMe(null);
    setProfile(null);
    setMatches(null);
    setMatchingStarted(false);
    setLadder(null);
    setParticipants([]);
    setIsAdminActionRunning(false);
  }

  async function startMatchingSession() {
    if (!me) return;
    setIsAdminActionRunning(true);
    try {
      const response = await fetch(apiUrl("/api/session/matching"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId: me.id }),
      });
      const data = await readJson(response);
      if (!response.ok) {
        setError(data.message ?? "매칭을 시작할 수 없습니다.");
        return;
      }

      setMatchingStarted(Boolean(data.matchingStarted));
      await refreshMatches(me.id);
    } catch {
      setError("매칭 시작 요청에 실패했습니다.");
    } finally {
      setIsAdminActionRunning(false);
    }
  }

  async function createLadderSession() {
    if (!me) return;
    setIsAdminActionRunning(true);
    try {
      const response = await fetch(apiUrl("/api/session/ladder"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId: me.id }),
      });
      const data = await readJson(response);
      if (!response.ok) {
        setError(data.message ?? "사다리를 만들 수 없습니다.");
        return;
      }

      setLadder(data.ladder);
    } catch {
      setError("사다리 생성 요청에 실패했습니다.");
    } finally {
      setIsAdminActionRunning(false);
    }
  }

  async function startLadderSession() {
    if (!me) return;
    setIsAdminActionRunning(true);
    try {
      const response = await fetch(apiUrl("/api/session/ladder/start"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId: me.id }),
      });
      const data = await readJson(response);
      if (!response.ok) {
        setError(data.message ?? "사다리를 시작할 수 없습니다.");
        return;
      }

      setLadder(data.ladder);
    } catch {
      setError("사다리 시작 요청에 실패했습니다.");
    } finally {
      setIsAdminActionRunning(false);
    }
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
              재미용 콘텐츠입니다. 실제 만세력을 기반으로 매칭합니다.
            </div>
            <div className="qr-card">
              <img src="/icebraking-frontend-qr.png" alt="입장 QR 코드" />
              <div>
                <strong>QR로 바로 입장</strong>
                <span>스마트폰 카메라로 스캔해 주세요.</span>
              </div>
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
            {ladder ? (
              <LadderGame
                isAdmin={me.name === "이혁주"}
                isBusy={isAdminActionRunning}
                ladder={ladder}
                onStart={startLadderSession}
              />
            ) : (
              <>
                <div className="match-panel-head">
                  <p className="eyebrow">오늘의 관계 지도</p>
                  <h2>5가지 매칭</h2>
                </div>

                {!matchingStarted ? (
                  <div className="empty">
                    <h2>매칭 대기 중</h2>
                    <p>모든 참가자가 입장한 뒤 관리자가 매칭을 시작합니다.</p>
                  </div>
                ) : matchItems.some((item) => item.match) ? (
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
              </>
            )}
          </div>

          <aside className="people">
            <div className="people-head">
              <h2>입장 명단</h2>
              {me.name === "이혁주" ? (
                <div className="admin-actions">
                  <button
                    className="admin-primary"
                    onClick={startMatchingSession}
                    disabled={isAdminActionRunning || matchingStarted}
                  >
                    매칭 시작
                  </button>
                  <button
                    className="admin-secondary"
                    onClick={createLadderSession}
                    disabled={isAdminActionRunning}
                  >
                    NEXT
                  </button>
                  <button onClick={resetSession} disabled={isAdminActionRunning}>
                    캐시 초기화
                  </button>
                </div>
              ) : null}
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

function LadderGame({
  isAdmin,
  isBusy,
  ladder,
  onStart,
}: {
  isAdmin: boolean;
  isBusy: boolean;
  ladder: LadderState;
  onStart: () => void;
}) {
  const columnCount = Math.max(ladder.top.length, 1);
  const width = Math.max(720, columnCount * 92);
  const topY = 68;
  const bottomY = 380;
  const leftPadding = 52;
  const gap = columnCount > 1 ? (width - leftPadding * 2) / (columnCount - 1) : 0;
  const xFor = (column: number) => leftPadding + column * gap;
  const yFor = (level: number) =>
    topY + ((level + 1) * (bottomY - topY)) / 15;

  const paths = ladder.top.map((person, index) => {
    let column = index;
    const points = [`${xFor(column)},${topY}`];

    [...ladder.rungs]
      .sort((a, b) => a.level - b.level)
      .forEach((rung) => {
        const y = yFor(rung.level);
        if (column === rung.left) {
          points.push(`${xFor(column)},${y}`, `${xFor(column + 1)},${y}`);
          column += 1;
        } else if (column === rung.left + 1) {
          points.push(`${xFor(column)},${y}`, `${xFor(column - 1)},${y}`);
          column -= 1;
        }
      });

    points.push(`${xFor(column)},${bottomY}`);
    return {
      column,
      person,
      points: points.join(" "),
    };
  });

  return (
    <div className="ladder-panel">
      <div className="match-panel-head">
        <p className="eyebrow">NEXT</p>
        <h2>사다리 게임</h2>
      </div>
      <div className="ladder-copy">
        <p>위쪽은 김기현, 김경순, 송명훈을 제외한 참가자입니다.</p>
        {isAdmin ? (
          <button onClick={onStart} disabled={isBusy || ladder.started}>
            {ladder.started ? "진행 중" : "시작"}
          </button>
        ) : null}
      </div>

      <div className="ladder-scroll">
        <div className="ladder-board" style={{ minWidth: width }}>
          <div className="ladder-labels top-labels">
            {ladder.top.map((person, index) => (
              <span key={person.id} style={{ left: xFor(index) }}>
                {person.name}
              </span>
            ))}
          </div>

          <svg
            className={ladder.started ? "ladder-svg started" : "ladder-svg"}
            viewBox={`0 0 ${width} 430`}
            role="img"
            aria-label="사다리 게임 경로"
          >
            {ladder.top.map((person, index) => (
              <line
                key={person.id}
                x1={xFor(index)}
                x2={xFor(index)}
                y1={topY}
                y2={bottomY}
              />
            ))}
            {ladder.rungs.map((rung, index) => (
              <line
                key={`${rung.level}-${rung.left}-${index}`}
                x1={xFor(rung.left)}
                x2={xFor(rung.left + 1)}
                y1={yFor(rung.level)}
                y2={yFor(rung.level)}
              />
            ))}
            {paths.map((path, index) => (
              <polyline
                key={path.person.id}
                className="runner-path"
                points={path.points}
                style={{ animationDelay: `${index * 0.08}s` }}
              />
            ))}
          </svg>

          <div className="ladder-labels bottom-labels">
            {ladder.bottom.map((label, index) => (
              <span
                key={`${label ?? "empty"}-${index}`}
                className={label ? "winner-label" : ""}
                style={{ left: xFor(index) }}
              >
                {label ?? "-"}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
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
