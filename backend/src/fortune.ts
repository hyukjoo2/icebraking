export type Participant = {
  id: string;
  name: string;
  birthDate: string;
  birthHour: string;
  calendarType: "solar" | "lunar";
  createdAt: number;
};

export type PublicParticipant = Pick<Participant, "id" | "name">;

export type ElementKey = "wood" | "fire" | "earth" | "metal" | "water";

export type Profile = {
  element: ElementKey;
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

const elements: Array<{ key: ElementKey; label: string }> = [
  { key: "wood", label: "목" },
  { key: "fire", label: "화" },
  { key: "earth", label: "토" },
  { key: "metal", label: "금" },
  { key: "water", label: "수" },
];

const profileCopy: Record<
  ElementKey,
  Pick<Profile, "archetype" | "meetingRole" | "advice" | "waves">
> = {
  wood: {
    archetype: "아이디어 확장가",
    meetingRole: "막힌 주제를 다음 질문으로 넓히는 사람",
    advice: "오늘은 떠오른 아이디어를 하나만 고르면 더 강해져요.",
    waves: [
      {
        label: "Wave 21",
        title: "아이디어를 넓히는 2주",
        description:
          "새로운 가능성을 많이 발견하는 구간입니다. 회의에서는 바로 결론을 내리기보다, 선택지를 넓혀 팀이 보지 못한 길을 열어줄 때 강점이 살아나요.",
      },
      {
        label: "Wave 22",
        title: "확장을 구조로 묶는 2주",
        description:
          "흩어진 아이디어를 실행 가능한 흐름으로 정리하기 좋은 구간입니다. 좋은 생각을 하나의 제목과 다음 행동으로 압축하면 주변의 신뢰가 따라옵니다.",
      },
    ],
  },
  fire: {
    archetype: "분위기 점화자",
    meetingRole: "회의 초반의 온도를 올리는 사람",
    advice: "좋은 리액션 하나가 오늘 회의의 속도를 바꿉니다.",
    waves: [
      {
        label: "Wave 21",
        title: "분위기를 깨우는 2주",
        description:
          "사람들의 참여 온도를 올리기 좋은 구간입니다. 회의에서는 짧은 리액션과 먼저 던지는 한마디가 어색함을 풀고, 팀의 집중을 앞으로 끌어냅니다.",
      },
      {
        label: "Wave 22",
        title: "열기를 성과로 잇는 2주",
        description:
          "활기와 실행력이 잘 맞물리는 구간입니다. 분위기를 띄우는 데서 멈추지 않고, 누가 무엇을 할지 가볍게 연결해주면 영향력이 더 또렷해집니다.",
      },
    ],
  },
  earth: {
    archetype: "중심 설계자",
    meetingRole: "여러 의견을 현실적인 순서로 정리하는 사람",
    advice: "오늘은 결론보다 기준을 먼저 잡을 때 빛나요.",
    waves: [
      {
        label: "Wave 21",
        title: "기준을 세우는 2주",
        description:
          "복잡한 이야기를 안정적인 기준으로 묶기 좋은 구간입니다. 회의에서는 우선순위와 판단 기준을 먼저 잡아주면, 흩어진 의견이 한 방향으로 모입니다.",
      },
      {
        label: "Wave 22",
        title: "현실적인 순서를 만드는 2주",
        description:
          "좋은 방향을 실제 일정과 역할로 옮기기 좋은 구간입니다. 큰 목표보다 다음 한 단계에 집중하면 팀이 부담 없이 움직일 수 있습니다.",
      },
    ],
  },
  metal: {
    archetype: "기준 정렬가",
    meetingRole: "모호한 내용을 선명한 선택지로 바꾸는 사람",
    advice: "날카로운 판단은 부드러운 표현과 만나면 더 멀리 갑니다.",
    waves: [
      {
        label: "Wave 21",
        title: "선택지를 선명하게 가르는 2주",
        description:
          "모호한 내용을 정리하고 기준을 세우기 좋은 구간입니다. 회의에서는 장단점을 차분히 나눠주면, 팀이 결정을 미루지 않고 앞으로 갈 수 있어요.",
      },
      {
        label: "Wave 22",
        title: "정교함을 신뢰로 바꾸는 2주",
        description:
          "디테일을 챙길수록 신뢰가 쌓이는 구간입니다. 다만 지적보다 제안의 형태로 말하면, 당신의 기준이 더 편하게 받아들여집니다.",
      },
    ],
  },
  water: {
    archetype: "흐름 관찰자",
    meetingRole: "놓치기 쉬운 맥락과 리스크를 읽는 사람",
    advice: "오늘은 마지막에 던지는 한 문장이 힘을 가질 수 있어요.",
    waves: [
      {
        label: "Wave 21",
        title: "흐름을 읽고 정리하는 2주",
        description:
          "흩어진 신호를 빠르게 결론 내리기보다, 반복해서 나타나는 패턴을 모아두면 좋습니다. 회의에서는 먼저 듣고 마지막에 방향을 정리할 때 존재감이 커져요.",
      },
      {
        label: "Wave 22",
        title: "관찰을 실행으로 넘기는 2주",
        description:
          "읽어낸 맥락을 작은 액션으로 바꾸기 좋은 구간입니다. 조용히 보완하던 부분을 한 가지 제안으로 꺼내면 팀의 다음 움직임이 훨씬 선명해집니다.",
      },
    ],
  },
};

const compatibility: Record<ElementKey, ElementKey[]> = {
  wood: ["fire", "water"],
  fire: ["earth", "wood"],
  earth: ["metal", "fire"],
  metal: ["water", "earth"],
  water: ["wood", "metal"],
};

function hashInput(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function getProfile(participant: Participant): Profile {
  const seed = hashInput(
    `${participant.birthDate}-${participant.birthHour}-${participant.calendarType}`,
  );
  const element = elements[seed % elements.length];

  return {
    element: element.key,
    elementLabel: element.label,
    ...profileCopy[element.key],
    energy: {
      drive: 55 + (seed % 41),
      focus: 55 + ((seed >> 3) % 41),
      collaboration: 55 + ((seed >> 6) % 41),
    },
  };
}

export function getMatchScore(me: Participant, other: Participant) {
  const myProfile = getProfile(me);
  const otherProfile = getProfile(other);
  const base = compatibility[myProfile.element].includes(otherProfile.element)
    ? 78
    : myProfile.element === otherProfile.element
      ? 72
      : 58;
  const variance = hashInput(`${me.id}:${other.id}`) % 19;
  return Math.min(97, base + variance);
}

export function getMatches(me: Participant, participants: Participant[]) {
  const others = participants
    .filter((participant) => participant.id !== me.id)
    .map((participant) => ({
      participant,
      score: getMatchScore(me, participant),
    }))
    .sort((a, b) => b.score - a.score);

  const usedParticipantIds = new Set<string>();
  const pick = (
    candidate:
      | {
          participant: Participant;
          score: number;
        }
      | undefined,
  ) => {
    if (!candidate || usedParticipantIds.has(candidate.participant.id)) {
      return undefined;
    }

    usedParticipantIds.add(candidate.participant.id);
    return candidate;
  };
  const available = () =>
    others.filter((match) => !usedParticipantIds.has(match.participant.id));

  const best = pick(others[0]);
  const noble = pick(available().find((match) => {
    const profile = getProfile(match.participant);
    return compatibility[profile.element].includes(getProfile(me).element);
  }) ?? available()[0]);
  const rightHand = pick(
    available().find((match) => match.score < 90) ?? available()[0],
  );
  const tuneUp = pick([...available()].reverse()[0]);
  const drag = pick([...available()].reverse()[0]);

  return {
    best,
    rightHand,
    noble,
    tuneUp,
    drag,
  };
}

export function toPublicParticipant(
  participant: Participant,
): PublicParticipant {
  return {
    id: participant.id,
    name: participant.name,
  };
}
