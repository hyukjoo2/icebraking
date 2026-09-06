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
  },
  fire: {
    archetype: "분위기 점화자",
    meetingRole: "회의 초반의 온도를 올리는 사람",
    advice: "좋은 리액션 하나가 오늘 회의의 속도를 바꿉니다.",
  },
  earth: {
    archetype: "중심 설계자",
    meetingRole: "여러 의견을 현실적인 순서로 정리하는 사람",
    advice: "오늘은 결론보다 기준을 먼저 잡을 때 빛나요.",
  },
  metal: {
    archetype: "기준 정렬가",
    meetingRole: "모호한 내용을 선명한 선택지로 바꾸는 사람",
    advice: "날카로운 판단은 부드러운 표현과 만나면 더 멀리 갑니다.",
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

  const best = others[0];
  const rightHand = others.find((match) => match.score < 90) ?? others[1] ?? best;
  const noble = others.find((match) => {
    const profile = getProfile(match.participant);
    return compatibility[profile.element].includes(getProfile(me).element);
  }) ?? best;
  const tuneUp = [...others].reverse()[0];

  return {
    best,
    rightHand,
    noble,
    tuneUp,
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
