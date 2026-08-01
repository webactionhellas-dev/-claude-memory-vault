import json, urllib.request, urllib.error

key = None
with open(r'C:\Users\mikef\AppData\Local\hermes\.env', encoding='utf-8') as f:
    for line in f:
        if line.strip().startswith('GEMINI_API_KEY='):
            key = line.split('=', 1)[1].strip()
base = 'https://generativelanguage.googleapis.com/v1beta/openai'
candidates = [
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-2.5-flash-lite',
    'gemini-2.5-flash',          # control: expect 429 (exhausted)
    'gemini-flash-latest',
    'gemini-flash-lite-latest',
]
for model in candidates:
    body = json.dumps({'model': model, 'messages': [{'role': 'user', 'content': 'say ok'}], 'max_tokens': 5}).encode()
    req = urllib.request.Request(base + '/chat/completions', data=body,
                                 headers={'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'})
    try:
        r = urllib.request.urlopen(req, timeout=30)
        print(f'{model:28s} -> OK ({r.status})')
    except urllib.error.HTTPError as e:
        msg = e.read().decode()
        short = 'QUOTA/429' if e.code == 429 else ('NOT FOUND/404' if e.code == 404 else msg[:80])
        print(f'{model:28s} -> {e.code} {short}')
    except Exception as e:
        print(f'{model:28s} -> ERR {str(e)[:80]}')
