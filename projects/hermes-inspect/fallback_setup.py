import shutil, datetime
from ruamel.yaml import YAML

path = r'C:\Users\mikef\AppData\Local\hermes\config.yaml'
bak = path + '.bak-' + datetime.datetime.now().strftime('%Y%m%d-%H%M%S')
shutil.copy2(path, bak)

yaml = YAML()
yaml.preserve_quotes = True
with open(path, encoding='utf-8') as f:
    data = yaml.load(f)

# Chain of free Gemini models — each has its OWN separate free quota bucket,
# so when the primary 429s, Hermes rotates to the next one.
data['fallback_model'] = [
    {'provider': 'gemini', 'model': 'gemini-flash-lite-latest'},
    {'provider': 'gemini', 'model': 'gemini-flash-latest'},
    {'provider': 'gemini', 'model': 'gemini-2.5-flash'},
]

with open(path, 'w', encoding='utf-8') as f:
    yaml.dump(data, f)

print('backup:', bak)
print('fallback chain:', [e['model'] for e in data['fallback_model']])
