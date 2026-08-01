/**
 * Pure helpers for the CMS text layer.
 * The next-intl message bundles are nested JSON; the CMS stores overrides as
 * flattened keys ("hero.kicker"). These helpers convert between the two.
 * No server or client dependencies on purpose: used by the i18n request
 * config (server) and by the admin texts editor (client).
 */

export type MessageTree = { [key: string]: string | MessageTree };

/** Flatten a nested message tree into { "a.b.c": "value" }. */
export function flattenMessages(tree: MessageTree, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      out[path] = value;
    } else if (value && typeof value === 'object') {
      Object.assign(out, flattenMessages(value, path));
    }
  }
  return out;
}

/**
 * Apply flattened overrides ONTO a bundled message tree.
 * The bundled JSON always wins as the fallback: an override only replaces a
 * leaf that already exists as a string, so a stale or malformed DB key can
 * never corrupt the message shape the components rely on.
 */
export function applyOverrides(
  tree: MessageTree,
  overrides: Record<string, string>
): MessageTree {
  const clone: MessageTree = structuredClone(tree);
  for (const [path, value] of Object.entries(overrides)) {
    if (typeof value !== 'string') continue;
    const parts = path.split('.');
    let node: MessageTree = clone;
    let ok = true;
    for (let i = 0; i < parts.length - 1; i++) {
      const next = node[parts[i]];
      if (!next || typeof next === 'string') {
        ok = false;
        break;
      }
      node = next;
    }
    const leaf = parts[parts.length - 1];
    if (ok && typeof node[leaf] === 'string') {
      node[leaf] = value;
    }
  }
  return clone;
}
