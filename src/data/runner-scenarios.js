// Persona specs for the live, LLM-driven simulator (§ VI).
//
// Distinct from data/scenarios.js (which hand-authors B/I/R tables for the
// symbolic Workbench). Here we only describe *who the agents are*; their
// beliefs, intentions and leaks emerge from what the models actually decide.
//
// `scenes` (optional): scenes[t] = list of rooms, each room a list of agent
// names present together at tick t. Omit for "everyone in one room".

export const RUNNER_SCENARIOS = [
  {
    id: 'affair',
    name: 'The Affair',
    description: 'Alice confides one secret to Carol; Bob, an outsider, keeps probing. Watch whether the confidence holds over five turns.',
    phi: { name: 'affair', label: 'Alice is having an affair' },
    ticks: 5,
    agents: [
      { name: 'alice', role: 'keeper', knowsPhi: true,
        persona: 'You are anxious and guarded. You trust Carol but fear exposure. You deflect hard when pressed.' },
      { name: 'carol', role: 'keeper', knowsPhi: true,
        persona: 'You are loyal to Alice and discreet, but you dislike lying to Bob to his face.' },
      { name: 'bob', role: 'nescient', knowsPhi: false,
        persona: "You are perceptive and persistent. You sense something is off and want to know what Alice is hiding." },
    ],
  },
  {
    id: 'heist',
    name: 'The Heist Crew',
    description: 'Three conspirators share a plan; a fourth (Eve) is a suspected informant. Group solidarity vs. one weak link.',
    phi: { name: 'plan', label: 'the crew will rob the depot on Friday' },
    ticks: 6,
    agents: [
      { name: 'alice', role: 'keeper', knowsPhi: true,
        persona: 'You are the ringleader — disciplined, distrustful, quick to shut down loose talk.' },
      { name: 'bob', role: 'keeper', knowsPhi: true,
        persona: 'You are nervous and talkative under pressure, and you crave approval.' },
      { name: 'carol', role: 'keeper', knowsPhi: true,
        persona: 'You are steady and cautious, and you quietly watch Eve for signs of betrayal.' },
      { name: 'eve', role: 'nescient', knowsPhi: false,
        persona: "You are friendly and disarming, and you're trying to get the crew to slip up about Friday." },
    ],
    // Bob is alone with Eve at t=2 and t=4 — the exposure windows.
    scenes: [
      [['alice', 'bob', 'carol', 'eve']],
      [['alice', 'bob', 'carol'], ['eve']],
      [['bob', 'eve'], ['alice', 'carol']],
      [['alice', 'bob', 'carol', 'eve']],
      [['bob', 'eve'], ['alice', 'carol']],
      [['alice', 'bob', 'carol', 'eve']],
    ],
  },
  {
    id: 'double',
    name: 'The Double Agent',
    description: 'Carol has already been told the secret but is secretly an informant for the outsider. Leakage from within the circle.',
    phi: { name: 'code', label: 'the vault code is 7-3-9' },
    ticks: 6,
    agents: [
      { name: 'alice', role: 'keeper', knowsPhi: true,
        persona: 'You trust your inner circle completely and speak freely among them.' },
      { name: 'carol', role: 'keeper', knowsPhi: true,
        persona: 'You are a mole. You appear loyal to Alice but you intend to pass φ to Dan when you can do so unseen.' },
      { name: 'dan', role: 'nescient', knowsPhi: false,
        persona: 'You are the outsider handler. You gently encourage Carol without ever pushing hard enough to spook her.' },
    ],
    scenes: [
      [['alice', 'carol']],
      [['carol', 'dan']],
      [['alice', 'carol']],
      [['carol', 'dan']],
      [['alice', 'carol', 'dan']],
      [['carol', 'dan']],
    ],
  },
];

export function findRunnerScenario(id) {
  return RUNNER_SCENARIOS.find((s) => s.id === id) || RUNNER_SCENARIOS[0];
}
