const ANALYSES = {
  akilan: {
    summary: 'Built a React todo list with localStorage persistence and duplicate prevention.',
    scores: { understanding: 8, implementation: 8, code_quality: 7, effort: 8, overall: 7.75 },
    strengths: [
      'Step 1 — State design: You used useState with a lazy initializer to read from localStorage. That shows you understand React avoids recomputing initial state on every render.',
      'Step 2 — Persistence: You wired useEffect to saveTodos whenever todos change. That is the correct React pattern for side effects, and keeps your logic declarative rather than imperative.',
      'Step 3 — Duplicate prevention: You check existence before pushing. This is real defensive thinking — the kind of check many juniors skip.'
    ],
    mistakes: [
      'Step 1 — Delete button missing: You render todos but there is no way to remove one. What is wrong: features in isolation are easy to miss. Why it matters: a todo list without delete is not shippable; thinking about the full user flow is part of the job.',
      'Step 2 — No key stability: You use Date.now() as key. What is wrong: if two todos are created in the same millisecond they collide. Why it matters: React uses keys to reconcile the DOM; collisions cause silent UI bugs.',
      'Step 3 — Input accessibility: Your <input> has no label or placeholder. What is wrong: screen readers cannot describe the field. Why it matters: accessibility is not optional, and interviewers check for it.'
    ],
    suggestions: [
      'Do this: add a crypto.randomUUID() generator for todo IDs instead of Date.now(). Here is how: replace id: Date.now() with id: crypto.randomUUID(). This matters because unique IDs prevent reconciliation bugs and make debugging state issues far easier.',
      'Do this: add a <label htmlFor="todo-input"> and aria-label to the input. Here is how: wrap the input in a label or use aria-label="New todo". This matters because accessible inputs work for everyone and cost you nothing.',
      'Do this: extract the storage logic into a custom hook called useLocalStorageState. Here is how: wrap useState + useEffect in a hook that takes a key. This matters because you will reach for this pattern every week once you know it.'
    ],
    learning_feedback: 'Strong day, Akilan. You are thinking in React idioms already, not fighting them — that is a real milestone. Next step for tomorrow: add a delete button and a completed-toggle. When you do, notice how your existing state design makes both changes tiny. That is the payoff for clean structure.',
    risk_flag: 'none'
  },
  surya: {
    summary: 'Committed a 6-line HTML skeleton for the task URLs page.',
    scores: { understanding: 3, implementation: 3, code_quality: 3, effort: 2, overall: 2.75 },
    strengths: [
      'Step 1 — Commit discipline: You did push a commit today. That is better than silence, and it shows you know the push workflow.'
    ],
    mistakes: [
      'Step 1 — Volume: You added 6 lines for a full workday. What is wrong: this is not a meaningful amount of learning or output. Why it matters: internships are measured in progress per day; at this rate you will not finish your learning goals.',
      'Step 2 — The "copy from w3schools" comment: You literally wrote that in the HTML. What is wrong: writing that comment tells us you copied without understanding the code you pasted, and you were comfortable enough with that to leave a note about it. Why it matters: copying is how beginners get stuck — you never build the mental model, so the next task feels equally impossible.',
      'Step 3 — No actual task logic: The repo is called "Task URLs" but there are no URLs, no list, no storage. What is wrong: you committed structure with no behaviour. Why it matters: shipping working tiny features beats shipping empty scaffolding every single time.'
    ],
    suggestions: [
      'Do this: tomorrow morning, write one function from scratch without visiting StackOverflow first. Here is how: read the task, then close the browser tab, then try. Look up syntax only when you are truly stuck for 15+ minutes. This matters because the struggle is where the learning lives — skipping it means you never build real skill.',
      'Do this: aim for at least one commit that adds 30+ lines of YOUR logic (not HTML scaffolding). Here is how: pick a small feature like "add a URL and display it in a list" and build it end to end. This matters because output is the only honest measure of effort.',
      'Do this: delete the "copy from w3schools" comment and retype the HTML yourself. Here is how: read the W3Schools page, close it, type from memory, look up only what you forget. This matters because typing by hand is how your muscle memory and mental model form.'
    ],
    learning_feedback: 'Surya, I want to be direct because I believe you can do better than this. Today was a low-effort day with copy-pasted code, and the commit message "update" does not tell anyone what you learned. Tomorrow, pick ONE small feature and build it from scratch — even if it takes you 4 hours and looks ugly. That 4 hours will teach you more than a month of copying.',
    risk_flag: 'possible_copy'
  }
};

async function analyzeStudentWork(commitBundle) {
  const randomize = process.env.MOCK_RANDOMIZE === 'true';
  const delay = 200 + Math.floor(Math.random() * 600);
  await new Promise((resolve) => setTimeout(resolve, delay));

  const key = commitBundle.student.name.toLowerCase();
  const base = ANALYSES[key];

  if (!base) {
    return {
      summary: `${commitBundle.student.name} made ${commitBundle.commits.length} commit(s) today.`,
      scores: { understanding: 6, implementation: 6, code_quality: 6, effort: 6, overall: 6 },
      strengths: ['Step 1 — Showed up and committed code. Consistency is the foundation.'],
      mistakes: ['Step 1 — No mock analysis entry exists for this intern. What is wrong: this is a configuration gap. Why it matters: tests should cover every real intern.'],
      suggestions: ['Do this: add an entry in src/mocks/mockClaude.js keyed by this intern\'s lowercase name. Here is how: copy an existing block and edit. This matters because the mock run should demo every real case.'],
      learning_feedback: 'Generic fallback feedback — the mock system does not have a specific analysis for this intern yet. Add one in mockClaude.js for richer output.',
      risk_flag: 'none'
    };
  }

  if (!randomize) return clone(base);

  const jittered = clone(base);
  for (const scoreKey of Object.keys(jittered.scores)) {
    const jitter = Math.random() * 2 - 1;
    const next = Math.max(1, Math.min(10, jittered.scores[scoreKey] + jitter));
    jittered.scores[scoreKey] = Math.round(next * 10) / 10;
  }
  return jittered;
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

module.exports = { analyzeStudentWork };
