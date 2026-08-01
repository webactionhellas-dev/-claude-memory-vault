#!/usr/bin/env python3
"""Deterministic security audit for a web project (Astro or Next.js).

Implements the deterministic checks from the fleet's security gate (Group D):
secret leakage, .env hygiene, security headers, XSS surface, and dependency
vulnerabilities. Prints a grouped report and exits non-zero on any FAIL.

Usage:  python security_audit.py [project_dir] [--json]
"""
import os
import re
import sys
import json
import subprocess

ROOT = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 and not sys.argv[1].startswith('-') else os.getcwd()
JSON_OUT = '--json' in sys.argv

SKIP_DIRS = {'node_modules', '.git', 'dist', '.next', '.astro', '.vercel', '.output', 'build', 'coverage'}
SRC_EXT = {'.js', '.mjs', '.cjs', '.ts', '.mts', '.tsx', '.jsx', '.astro', '.vue', '.svelte', '.json', '.md'}

SECRET_PATTERNS = [
    ('Stripe live secret key', re.compile(r'sk_live_[0-9a-zA-Z]{20,}')),
    ('Stripe test secret key', re.compile(r'sk_test_[0-9a-zA-Z]{20,}')),
    ('Stripe webhook secret', re.compile(r'whsec_[0-9a-zA-Z]{20,}')),
    ('Supabase service-role JWT', re.compile(r'eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}')),
    ('Supabase secret key', re.compile(r'sb_secret_[0-9A-Za-z]{20,}')),
    ('Private key block', re.compile(r'-----BEGIN [A-Z ]*PRIVATE KEY-----')),
    ('Hard-coded api key/secret', re.compile(r'(?i)(api[_-]?key|secret)\s*[:=]\s*["\'][0-9a-zA-Z]{24,}["\']')),
]

findings = {'FAIL': [], 'WARN': [], 'PASS': []}
def add(level, msg):
    findings[level].append(msg)

def rel(p):
    return os.path.relpath(p, ROOT)

def walk_files():
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for f in filenames:
            ext = os.path.splitext(f)[1]
            if ext in SRC_EXT or f.startswith('.env'):
                yield os.path.join(dirpath, f), f

def read(path):
    try:
        return open(path, encoding='utf-8', errors='ignore').read()
    except Exception:
        return ''

# D1 — secrets committed in source (exclude .env, checked separately)
leaked = []
for path, name in walk_files():
    if name.startswith('.env'):
        continue
    text = read(path)
    for label, pat in SECRET_PATTERNS:
        if pat.search(text):
            leaked.append((rel(path), label))
if leaked:
    for p, l in leaked[:50]:
        add('FAIL', f'Secret in source: {l} -> {p}')
else:
    add('PASS', 'No hard-coded secrets found in source')

# .env hygiene
gi = read(os.path.join(ROOT, '.gitignore'))
has_env = os.path.exists(os.path.join(ROOT, '.env')) or os.path.exists(os.path.join(ROOT, '.env.local'))
if '.env' in gi:
    add('PASS', '.env is gitignored')
elif has_env:
    add('FAIL', '.env present but not in .gitignore (risk of committing secrets)')
else:
    add('WARN', 'No .env / .gitignore rule found (verify secret handling)')

# D5 — security headers
header_blob = ''
found_cfg = False
for cand in ['vercel.json', 'next.config.js', 'next.config.mjs', 'next.config.ts', 'astro.config.mjs']:
    p = os.path.join(ROOT, cand)
    if os.path.exists(p):
        found_cfg = True
        header_blob += '\n' + read(p)
required = {
    r'Content-Security-Policy': 'CSP',
    r'Strict-Transport-Security': 'HSTS',
    r'X-Content-Type-Options': 'nosniff',
    r'X-Frame-Options|frame-ancestors': 'clickjacking',
    r'Referrer-Policy': 'referrer',
}
missing = [label for pat, label in required.items() if not re.search(pat, header_blob)]
if not found_cfg:
    add('WARN', 'No config file found to check security headers')
elif missing:
    add('FAIL', 'Missing security headers: ' + ', '.join(missing))
else:
    add('PASS', 'Security headers present (CSP, HSTS, nosniff, clickjacking, referrer)')

# D4 — raw HTML injection surface
xss = []
for path, name in walk_files():
    if os.path.splitext(name)[1] not in {'.astro', '.tsx', '.jsx', '.ts', '.js', '.vue', '.svelte'}:
        continue
    text = read(path)
    if 'dangerouslySetInnerHTML' in text or re.search(r'set:html', text):
        xss.append(rel(path))
if xss:
    add('WARN', 'Raw HTML injection sites (confirm inputs are sanitized): ' + ', '.join(xss[:20]))
else:
    add('PASS', 'No raw HTML injection sinks found')

# D6 — dependency audit
if os.path.exists(os.path.join(ROOT, 'package.json')):
    try:
        r = subprocess.run(['npm', 'audit', '--omit=dev', '--json'], cwd=ROOT,
                           capture_output=True, text=True, timeout=240, shell=(os.name == 'nt'))
        data = json.loads(r.stdout or '{}')
        vulns = (data.get('metadata', {}) or {}).get('vulnerabilities', {}) or {}
        high, crit = vulns.get('high', 0), vulns.get('critical', 0)
        if crit or high:
            add('FAIL', f'npm audit: {crit} critical, {high} high vulnerabilities')
        else:
            add('PASS', f'npm audit clean (moderate/low: {vulns.get("moderate", 0)}/{vulns.get("low", 0)})')
    except Exception as e:
        add('WARN', f'Could not run npm audit ({e.__class__.__name__}); run it manually')
else:
    add('WARN', 'No package.json to audit')

# Report
if JSON_OUT:
    print(json.dumps(findings, indent=2))
else:
    for level in ('FAIL', 'WARN', 'PASS'):
        for m in findings[level]:
            print(f'[{level}] {m}')
    print()
    verdict = 'FAIL' if findings['FAIL'] else 'PASS'
    print(f'{len(findings["FAIL"])} FAIL  {len(findings["WARN"])} WARN  {len(findings["PASS"])} PASS  ->  {verdict}')

sys.exit(1 if findings['FAIL'] else 0)
