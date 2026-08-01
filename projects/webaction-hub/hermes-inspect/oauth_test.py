import traceback, time, re
HERMES = r'C:\Users\mikef\AppData\Local\hermes\hermes-agent\venv\Scripts\hermes.exe'
try:
    from winpty import PtyProcess
    p = PtyProcess.spawn([HERMES, 'auth', 'add', 'anthropic', '--type', 'oauth', '--no-browser'],
                         dimensions=(50, 4000))
    out = ''
    t = time.time()
    while time.time() - t < 9:
        try:
            out += p.read(4096)
        except EOFError:
            break
        if 'claude.ai/oauth' in out:
            break
        time.sleep(0.3)
    m = re.search(r'https://claude\.ai/oauth/authorize\S+', out)
    print('SPAWN_OK; url =', (m.group(0) if m else 'NONE'))
    print('RAW_TAIL:', repr(out[-400:]))
    try:
        p.terminate(force=True)
    except Exception:
        pass
except Exception:
    traceback.print_exc()
