"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(index_exports);
var import_client_secrets_manager = require("@aws-sdk/client-secrets-manager");
var ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
var CLAUDE_MODEL = "claude-sonnet-4-6";
var CLAUDE_TIMEOUT_MS = 25e3;
var CLAUDE_SKILL_TIMEOUT_MS = 6e4;
var MAX_RETRIES = 1;
var MAX_PAUSE_TURNS = 8;
var ANTHROPIC_BETA_SKILLS = "code-execution-2025-08-25,skills-2025-10-02";
var GROUP_COLORS = ["#DC241F", "#007D32", "#0019A8", "#FFD329"];
var secretsClient = new import_client_secrets_manager.SecretsManagerClient({});
var cachedSecrets = null;
async function getSecrets() {
  if (cachedSecrets) return cachedSecrets;
  const secretArn = process.env.SECRET_ARN;
  if (!secretArn) throw new Error("SECRET_ARN env var not set");
  const res = await secretsClient.send(new import_client_secrets_manager.GetSecretValueCommand({ SecretId: secretArn }));
  if (!res.SecretString) throw new Error("Secret has no string value");
  cachedSecrets = JSON.parse(res.SecretString);
  return cachedSecrets;
}
function log(step, detail) {
  try {
    console.log(JSON.stringify({ step, detail, ts: (/* @__PURE__ */ new Date()).toISOString() }));
  } catch {
    console.log(`[${step}]`);
  }
}
function baseUrl(raw) {
  return raw.replace(/\/$/, "");
}
function restHeaders(serviceKey, extra) {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    Accept: "application/json",
    "Content-Type": "application/json",
    ...extra
  };
}
async function restGameExists(supabaseUrl, serviceKey, gameDate) {
  const q = new URLSearchParams({
    select: "id",
    game_type: "eq.connections",
    game_date: `eq.${gameDate}`,
    limit: "1"
  });
  const url = `${baseUrl(supabaseUrl)}/rest/v1/games?${q.toString()}`;
  const res = await fetch(url, { headers: restHeaders(serviceKey) });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    log("rest_select_warn", { status: res.status, body: t.slice(0, 200) });
    return false;
  }
  const rows = await res.json().catch(() => []);
  return Array.isArray(rows) && rows.length > 0;
}
async function restNextval(supabaseUrl, serviceKey, fallback) {
  const url = `${baseUrl(supabaseUrl)}/rest/v1/rpc/nextval_text`;
  const res = await fetch(url, {
    method: "POST",
    headers: restHeaders(serviceKey),
    body: JSON.stringify({ seq_name: "connections_puzzle_id_seq" })
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    log("rest_rpc_warn", { status: res.status, body: t.slice(0, 200) });
    return String(fallback);
  }
  const val = await res.json().catch(() => null);
  if (val != null && val !== "") return String(val);
  return String(fallback);
}
async function restInsertGame(supabaseUrl, serviceKey, row) {
  const url = `${baseUrl(supabaseUrl)}/rest/v1/games`;
  const res = await fetch(url, {
    method: "POST",
    headers: restHeaders(serviceKey, { Prefer: "return=minimal" }),
    body: JSON.stringify({ ...row, game_type: "connections" })
  });
  if (res.status === 201 || res.status === 200) return "inserted";
  if (res.status === 409) return "duplicate";
  const t = await res.text().catch(() => "");
  throw new Error(`REST insert games ${res.status}: ${t.slice(0, 500)}`);
}
function getSkillConfig(secrets) {
  if (secrets.DISABLE_CLAUDE_SKILL === "1") return null;
  const skillId = secrets.ANTHROPIC_CONNECTIONS_SKILL_ID?.trim();
  if (!skillId) return null;
  const version = secrets.ANTHROPIC_CONNECTIONS_SKILL_VERSION?.trim() || "latest";
  return { skillId, version };
}
function joinTextFromContentBlocks(content) {
  if (!Array.isArray(content)) return "";
  const parts = [];
  for (const block of content) {
    if (block && typeof block === "object" && "type" in block) {
      const b = block;
      if (b.type === "text" && typeof b.text === "string") parts.push(b.text);
    }
  }
  return parts.join("\n");
}
async function callClaudeSimple(apiKey, system, prompt) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CLAUDE_TIMEOUT_MS);
  try {
    const res = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 4096,
        system,
        messages: [{ role: "user", content: prompt }]
      })
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "(unreadable body)");
      throw new Error(`Claude ${res.status}: ${body.slice(0, 400)}`);
    }
    let data;
    try {
      data = await res.json();
    } catch {
      throw new Error("Claude response was not valid JSON");
    }
    if (data == null || typeof data !== "object") {
      throw new Error("Claude JSON was empty or not an object");
    }
    const text = joinTextFromContentBlocks(data.content);
    if (!text.trim()) {
      throw new Error(`Empty Claude text; keys=${Object.keys(data).join(",")}`);
    }
    return text;
  } finally {
    clearTimeout(timer);
  }
}
async function callClaudeWithSkill(apiKey, system, userPrompt, skill) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CLAUDE_SKILL_TIMEOUT_MS);
  const tools = [{ type: "code_execution_20250825", name: "code_execution" }];
  const skillEntry = { type: "custom", skill_id: skill.skillId, version: skill.version };
  const messages = [{ role: "user", content: userPrompt }];
  let container = { skills: [skillEntry] };
  try {
    for (let turn = 0; turn < MAX_PAUSE_TURNS; turn++) {
      const res = await fetch(ANTHROPIC_API_URL, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-beta": ANTHROPIC_BETA_SKILLS
        },
        body: JSON.stringify({
          model: CLAUDE_MODEL,
          max_tokens: 8192,
          system,
          messages,
          tools,
          container
        })
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "(unreadable body)");
        throw new Error(`Claude (skills) ${res.status}: ${body.slice(0, 500)}`);
      }
      let data;
      try {
        data = await res.json();
      } catch {
        throw new Error("Claude (skills) response was not valid JSON");
      }
      if (data == null || typeof data !== "object") {
        throw new Error("Claude (skills) JSON was empty or not an object");
      }
      const payload = data;
      const stopReason = payload.stop_reason;
      const text = joinTextFromContentBlocks(payload.content);
      log("claude_skill_turn", {
        turn,
        stop_reason: stopReason,
        text_len: text.length,
        container_id: payload.container?.id
      });
      if (stopReason !== "pause_turn") {
        if (!text.trim()) {
          throw new Error(
            `Empty Claude (skills) stop_reason=${stopReason} snippet=${JSON.stringify(data).slice(0, 300)}`
          );
        }
        return text;
      }
      const cid = payload.container?.id;
      if (!cid) throw new Error("pause_turn but missing container.id");
      messages.push({ role: "assistant", content: payload.content });
      container = { id: cid, skills: [skillEntry] };
    }
    throw new Error(`Exceeded MAX_PAUSE_TURNS (${MAX_PAUSE_TURNS})`);
  } finally {
    clearTimeout(timer);
  }
}
async function callClaude(apiKey, secrets, system, prompt) {
  const skill = getSkillConfig(secrets);
  if (skill) {
    log("claude_mode", { mode: "skill", skill_id: skill.skillId });
    const systemWithSkill = `The "Connections Generator" Agent Skill is active. Use it for quality, then output ONLY JSON (no markdown).

${system}`;
    const userWithSkill = `Apply the skill, then output only this JSON task:

${prompt}`;
    try {
      return await callClaudeWithSkill(apiKey, systemWithSkill, userWithSkill, skill);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      log("claude_skill_fallback", { reason: msg.slice(0, 200) });
      return callClaudeSimple(apiKey, system, prompt);
    }
  }
  log("claude_mode", { mode: "messages_only" });
  return callClaudeSimple(apiKey, system, prompt);
}
function extractJSON(text) {
  const fenced = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const braces = text.match(/\{[\s\S]*\}/);
  if (braces) return braces[0].trim();
  return text.trim();
}
var CONNECTIONS_SYSTEM = `You are a puzzle designer for TubeRush, a London-themed daily word game. Create "Connections" puzzles: four groups of four related words.

Rules:
- Exactly 4 groups, each with exactly 4 items. Difficulty 1 (easy) to 4 (hard).
- Items: single words or very short phrases (2-3 words max), ALL CAPS.
- At least one London/British culture group. Mix topics: pop culture, wordplay, geography, history, food, etc.
- Some items should plausibly fit multiple groups. No duplicates across groups.
- Return ONLY a JSON object, no markdown fences, no extra text.`;
function connectionsPrompt(date, id) {
  return `Connections puzzle for ${date} (#${id}). Return: {"groups":[{"category":"NAME","items":["A","B","C","D"],"difficulty":1}, ...4 groups]}`;
}
function validateConnections(d) {
  if (!d || typeof d !== "object") return false;
  const o = d;
  if (!Array.isArray(o.groups) || o.groups.length !== 4) return false;
  const seen = /* @__PURE__ */ new Set();
  for (const g of o.groups) {
    if (typeof g.category !== "string") return false;
    if (!Array.isArray(g.items) || g.items.length !== 4) return false;
    if (typeof g.difficulty !== "number" || g.difficulty < 1 || g.difficulty > 4) return false;
    for (const item of g.items) {
      if (typeof item !== "string" || !item) return false;
      if (seen.has(item)) return false;
      seen.add(item);
    }
  }
  return seen.size === 16;
}
async function generateConnections(apiKey, secrets, date, id) {
  let lastErr;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      log("claude_call", { type: "connections", date, attempt });
      const raw = await callClaude(apiKey, secrets, CONNECTIONS_SYSTEM, connectionsPrompt(date, id));
      const parsed = JSON.parse(extractJSON(raw));
      if (!validateConnections(parsed)) {
        throw new Error(`Invalid structure: ${JSON.stringify(parsed).slice(0, 200)}`);
      }
      return {
        id,
        date,
        groups: parsed.groups.map((g, i) => ({ ...g, color: GROUP_COLORS[i] }))
      };
    } catch (err) {
      lastErr = err;
      log("claude_error", { type: "connections", date, attempt, error: String(err).slice(0, 300) });
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}
function formatDate(d) {
  return d.toISOString().split("T")[0];
}
async function findNextMissingDate(supabaseUrl, serviceKey, maxDaysAhead) {
  const today = /* @__PURE__ */ new Date();
  for (let i = 0; i < maxDaysAhead; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const dateStr = formatDate(d);
    if (!await restGameExists(supabaseUrl, serviceKey, dateStr)) return dateStr;
  }
  return null;
}
async function handler(event, _context) {
  const startMs = Date.now();
  try {
    const secrets = await getSecrets();
    const daysAhead = typeof event.days_ahead === "number" && event.days_ahead > 0 ? event.days_ahead : 8;
    const count = typeof event.count === "number" && event.count > 0 ? Math.min(event.count, 3) : 1;
    const skillCfg = getSkillConfig(secrets);
    log("start", {
      game_type: "connections",
      daysAhead,
      count,
      skill: skillCfg ? { id: skillCfg.skillId, version: skillCfg.version } : null
    });
    const {
      ANTHROPIC_API_KEY: anthropicApiKey,
      SUPABASE_URL: supabaseUrl,
      SUPABASE_SERVICE_ROLE_KEY: serviceKey
    } = secrets;
    const results = [];
    let generated = 0;
    for (let round = 0; round < count; round++) {
      const date = await findNextMissingDate(supabaseUrl, serviceKey, daysAhead);
      if (!date) {
        log("all_filled", { game_type: "connections", daysAhead });
        break;
      }
      try {
        const id = await restNextval(supabaseUrl, serviceKey, generated + round + 1);
        log("generating", { type: "connections", date, id });
        const puzzle = await generateConnections(anthropicApiKey, secrets, date, id);
        const ins = await restInsertGame(supabaseUrl, serviceKey, {
          game_date: date,
          puzzle_data: puzzle,
          is_published: true
        });
        results.push({
          date,
          game_type: "connections",
          status: ins === "duplicate" ? "skipped_duplicate" : "created"
        });
        if (ins === "inserted") generated++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log("failed", { type: "connections", date, error: msg.slice(0, 500) });
        results.push({ date, game_type: "connections", status: "error", detail: msg.slice(0, 500) });
      }
    }
    const elapsed = Date.now() - startMs;
    const errors = results.filter((r) => r.status === "error").length;
    log("done", { game_type: "connections", generated, elapsed, errors });
    return { success: true, generated, elapsed_ms: elapsed, results, had_errors: errors > 0 };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("fatal", { error: msg.slice(0, 1500) });
    return {
      success: false,
      generated: 0,
      elapsed_ms: Date.now() - startMs,
      results: [],
      had_errors: true,
      error: msg.slice(0, 2e3)
    };
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
//# sourceMappingURL=index.js.map
