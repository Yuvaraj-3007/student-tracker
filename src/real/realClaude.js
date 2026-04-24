const Anthropic = require('@anthropic-ai/sdk');
const { SYSTEM_PROMPT, buildUserPrompt } = require('../prompts/teacherFormat');

const DEFAULT_MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 2000;
const REQUEST_TIMEOUT_MS = 60000;

let _client = null;

function getClient() {
  if (_client) return _client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is required when USE_MOCKS=false');
  }
  _client = new Anthropic({ apiKey, timeout: REQUEST_TIMEOUT_MS });
  return _client;
}

const REQUIRED_FIELDS = ['summary', 'scores', 'strengths', 'mistakes', 'suggestions', 'learning_feedback', 'risk_flag'];
const REQUIRED_SCORES = ['understanding', 'implementation', 'code_quality', 'effort', 'overall'];
const VALID_RISK_FLAGS = new Set(['none', 'low_effort', 'possible_copy', 'incomplete_work']);

function extractJson(text) {
  if (!text) throw new Error('Empty response from Claude');
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('No JSON object found in Claude response');
  }
  const candidate = text.slice(start, end + 1);
  return JSON.parse(candidate);
}

function validateAnalysis(analysis) {
  for (const field of REQUIRED_FIELDS) {
    if (!(field in analysis)) {
      throw new Error(`Claude response missing required field: ${field}`);
    }
  }
  for (const score of REQUIRED_SCORES) {
    if (typeof analysis.scores[score] !== 'number') {
      throw new Error(`Claude response missing numeric score: ${score}`);
    }
  }
  if (!VALID_RISK_FLAGS.has(analysis.risk_flag)) {
    analysis.risk_flag = 'none';
  }
  for (const arrField of ['strengths', 'mistakes', 'suggestions']) {
    if (!Array.isArray(analysis[arrField])) analysis[arrField] = [];
  }
  return analysis;
}

async function analyzeStudentWork(commitBundle) {
  const client = getClient();
  const model = process.env.CLAUDE_MODEL || DEFAULT_MODEL;

  const userPrompt = buildUserPrompt({
    intern: commitBundle.student,
    commitBundle
  });

  const response = await client.messages.create({
    model,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }]
  });

  const textBlock = Array.isArray(response.content)
    ? response.content.find((b) => b.type === 'text')
    : null;
  const text = textBlock ? textBlock.text : '';

  const parsed = extractJson(text);
  return validateAnalysis(parsed);
}

module.exports = { analyzeStudentWork };
