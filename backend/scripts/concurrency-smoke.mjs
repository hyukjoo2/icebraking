const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";
const count = Number(process.env.SMOKE_USERS ?? 50);

function birthDate(index) {
  const month = String((index % 12) + 1).padStart(2, "0");
  const day = String((index % 28) + 1).padStart(2, "0");
  return `1990-${month}-${day}`;
}

async function join(index) {
  const response = await fetch(`${baseUrl}/api/participants`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: `테스트${index}`,
      birthDate: birthDate(index),
      birthHour: String((index % 12) * 2 + 1),
      calendarType: "solar",
    }),
  });

  if (!response.ok) {
    throw new Error(`join ${index} failed: ${response.status}`);
  }

  return response.json();
}

const results = await Promise.all(
  Array.from({ length: count }, (_, index) => join(index + 1)),
);
const participantsResponse = await fetch(`${baseUrl}/api/participants`, {
  cache: "no-store",
});
const { participants } = await participantsResponse.json();
const joinedIds = new Set(results.map((result) => result.participant.id));

if (participants.length < count) {
  throw new Error(
    `expected at least ${count} participants, got ${participants.length}`,
  );
}

if (joinedIds.size !== count) {
  throw new Error(`expected ${count} unique joins, got ${joinedIds.size}`);
}

console.log(
  `OK: ${count} concurrent joins completed, ${participants.length} participants listed.`,
);
