import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// Tasks live as one markdown file per task, inside the SAME obsidian-vault repo the
// memory sync already keeps in git sync every 5 minutes (MemoryVaultSync task). No new
// sync mechanism needed: sync-vault.ps1's `git add -A` picks up this whole repo
// recursively, while its robocopy step only mirrors ROOT-level *.md files (non-recursive
// by default), so a subfolder never bleeds into the live Claude memory folder. One file
// per task (not one shared JSON) keeps concurrent edits from two machines as separate,
// mergeable git changes instead of one file both sides fight over.
// Portable default (os.homedir(), not a hardcoded "mikef" path) so this works unmodified
// on Asteris's machine too - the exact class of bug that broke sync-vault.ps1 for 13
// hours (see memory: memory-vault-sync-incident) when it hardcoded one person's username.
const TASKS_DIR = process.env.TASKS_DIR || path.join(os.homedir(), 'obsidian-vault', 'tasks');
const STATUSES = ['todo', 'in_progress', 'blocked', 'done'];
const PRIORITIES = ['', 'low', 'normal', 'high', 'urgent'];

function slugify(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

function parseFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { fields: {}, body: raw };
  const fields = {};
  for (const line of m[1].split(/\r?\n/)) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    fields[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return { fields, body: m[2].trim() };
}

function serializeTask(t) {
  const fm = ['title', 'assignee', 'status', 'project', 'priority', 'created', 'updated']
    .map((k) => `${k}: ${t[k] ?? ''}`)
    .join('\n');
  return `---\n${fm}\n---\n\n${t.body || ''}\n`;
}

export function ensureTasksDir() {
  fs.mkdirSync(TASKS_DIR, { recursive: true });
}

// Task ids reach us straight from an HTTP URL param, so this is a real trust boundary. An
// allowlist, not a denylist of "/" "\" "..": slugify() + the date prefix only ever produce
// [a-z0-9-], and a denylist misses a Windows drive-relative segment (e.g. "C:foo", no slash
// or dot-dot in sight) and NTFS alternate-data-stream syntax (a bare ":"). Require the exact
// charset a legitimate id can have instead of trying to enumerate every dangerous one.
// Centralized here since update/delete both need it.
function taskFile(id) {
  if (!id || !/^[a-z0-9-]+$/.test(id)) throw new Error('invalid task id');
  return path.join(TASKS_DIR, `${id}.md`);
}

export function listTasks() {
  ensureTasksDir();
  return fs.readdirSync(TASKS_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const raw = fs.readFileSync(path.join(TASKS_DIR, f), 'utf8');
      const { fields, body } = parseFrontmatter(raw);
      return { id: f.replace(/\.md$/, ''), body, ...fields };
    })
    .sort((a, b) => (a.updated || '').localeCompare(b.updated) * -1);
}

export function createTask({ title, assignee, project, priority }) {
  ensureTasksDir();
  const cleanPriority = priority || '';
  // priority round-trips straight into an unescaped-by-design render path client-side
  // (the flag label), so it must be one of the fixed values the UI itself ever offers -
  // confirmed live: a raw POST with priority set to a "<b>" tag executed in the dashboard
  // DOM before this check existed. Validate at the boundary rather than trust the client.
  if (!PRIORITIES.includes(cleanPriority)) throw new Error(`invalid priority: ${cleanPriority}`);
  const now = new Date().toISOString();
  const base = `${now.slice(0, 10)}-${slugify(title)}`;
  // Two tasks with the same title on the same day (or two people creating tasks
  // at once) would otherwise collide on the same filename and silently overwrite
  // each other - confirmed live, caught before shipping. Disambiguate on collision.
  let id = base;
  let n = 2;
  while (fs.existsSync(path.join(TASKS_DIR, `${id}.md`))) { id = `${base}-${n}`; n += 1; }
  const task = {
    title, assignee: assignee || 'unassigned', status: 'todo',
    project: project || '', priority: cleanPriority,
    created: now, updated: now, body: '',
  };
  fs.writeFileSync(path.join(TASKS_DIR, `${id}.md`), serializeTask(task));
  return { id, ...task };
}

export function updateTaskStatus(id, status) {
  if (!STATUSES.includes(status)) throw new Error(`invalid status: ${status}`);
  const file = taskFile(id);
  if (!fs.existsSync(file)) throw new Error('task not found');
  const { fields, body } = parseFrontmatter(fs.readFileSync(file, 'utf8'));
  fields.status = status;
  fields.updated = new Date().toISOString();
  fs.writeFileSync(file, serializeTask({ ...fields, body }));
  return { id, ...fields, body };
}

const EDITABLE_FIELDS = ['title', 'assignee', 'project', 'priority'];

export function updateTask(id, patch) {
  const file = taskFile(id);
  if (!fs.existsSync(file)) throw new Error('task not found');
  const { fields, body } = parseFrontmatter(fs.readFileSync(file, 'utf8'));
  for (const key of EDITABLE_FIELDS) {
    if (patch[key] !== undefined) fields[key] = String(patch[key]).trim();
  }
  if (!fields.title) throw new Error('title required');
  if (!fields.assignee) fields.assignee = 'unassigned';
  if (!PRIORITIES.includes(fields.priority || '')) throw new Error(`invalid priority: ${fields.priority}`);
  fields.updated = new Date().toISOString();
  fs.writeFileSync(file, serializeTask({ ...fields, body }));
  return { id, ...fields, body };
}

export function deleteTask(id) {
  const file = taskFile(id);
  if (!fs.existsSync(file)) throw new Error('task not found');
  fs.unlinkSync(file);
}

export { STATUSES, TASKS_DIR };
