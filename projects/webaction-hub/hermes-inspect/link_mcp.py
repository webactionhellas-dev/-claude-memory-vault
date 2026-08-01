import json, os, shutil, datetime

cj = os.path.join(os.environ['USERPROFILE'], '.claude.json')
bak = cj + '.bak-' + datetime.datetime.now().strftime('%Y%m%d-%H%M%S')
shutil.copy2(cj, bak)

with open(cj, 'r', encoding='utf-8') as f:
    data = json.load(f)

servers = data.setdefault('mcpServers', {})
servers['hermes'] = {
    'type': 'stdio',
    'command': r'C:\Users\mikef\AppData\Local\hermes\hermes-agent\venv\Scripts\hermes.exe',
    'args': ['mcp', 'serve'],
    'env': {},
}

tmp = cj + '.tmp'
with open(tmp, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
os.replace(tmp, cj)   # atomic

# re-validate the written file
with open(cj, 'r', encoding='utf-8') as f:
    reparsed = json.load(f)

print('backup    :', bak)
print('mcpServers:', list(reparsed.get('mcpServers', {}).keys()))
print('hermes ->', json.dumps(reparsed['mcpServers']['hermes']))
print('re-parse  : OK')
