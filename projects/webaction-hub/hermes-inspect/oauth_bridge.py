import os, re, time, threading

WORK = r'C:\Users\mikef\hermes-inspect'
URL_FILE  = os.path.join(WORK, 'oauth_url.txt')
CODE_FILE = os.path.join(WORK, 'oauth_code.txt')
RES_FILE  = os.path.join(WORK, 'oauth_result.txt')
LOG_FILE  = os.path.join(WORK, 'oauth_bridge.log')
HERMES = r'C:\Users\mikef\AppData\Local\hermes\hermes-agent\venv\Scripts\hermes.exe'

for f in (URL_FILE, CODE_FILE, RES_FILE):
    try: os.remove(f)
    except FileNotFoundError: pass

def log(m):
    try:
        with open(LOG_FILE, 'a', encoding='utf-8') as fh: fh.write(str(m) + '\n')
    except Exception: pass

try:
    from winpty import PtyProcess
except Exception as e:
    with open(RES_FILE, 'w', encoding='utf-8') as fh: fh.write(f'IMPORT_ERROR: {e}')
    raise

ANSI = re.compile(r'\x1b\[[0-9;?]*[A-Za-z]|\x1b\][^\x07]*\x07|\x1b[()][AB012]')

# Wide PTY so the long auth URL stays on a single line.
p = PtyProcess.spawn([HERMES, 'auth', 'add', 'anthropic', '--type', 'oauth', '--no-browser'],
                     dimensions=(50, 4000))

buf = ['']
lock = threading.Lock()
done = [False]

def reader():
    while True:
        try:
            data = p.read(4096)
        except EOFError:
            break
        except Exception as e:
            log(f'read err: {e}'); break
        if data:
            with lock:
                buf[0] += data
    done[0] = True

threading.Thread(target=reader, daemon=True).start()

url_written = False
code_sent = False
deadline = time.time() + 900
while not done[0] and time.time() < deadline:
    with lock:
        clean = ANSI.sub('', buf[0])
    if not url_written:
        m = re.search(r'https://claude\.ai/oauth/authorize\S+', clean)
        if m:
            with open(URL_FILE, 'w', encoding='utf-8') as fh: fh.write(m.group(0))
            url_written = True
            log('URL captured')
    if url_written and not code_sent and os.path.exists(CODE_FILE):
        try:
            code = open(CODE_FILE, encoding='utf-8').read().strip()
        except Exception:
            code = ''
        if code:
            time.sleep(0.3)
            p.write(code + '\r')
            code_sent = True
            log('code sent')
    time.sleep(0.3)

time.sleep(2)
with lock:
    final = ANSI.sub('', buf[0])
with open(RES_FILE, 'w', encoding='utf-8') as fh:
    fh.write(final[-4000:])
log('exit')
