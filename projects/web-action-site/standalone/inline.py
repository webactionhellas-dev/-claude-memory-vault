import base64, os

root = r"C:\Users\mikef\web-action-site"
tpl = open(os.path.join(root, "standalone", "template.html"), encoding="utf-8").read()

def datauri(path, mime):
    with open(path, "rb") as f:
        return "data:%s;base64,%s" % (mime, base64.b64encode(f.read()).decode())

P = lambda *a: os.path.join(root, "public", *a)

html = (tpl
        .replace("__LOGO_DATA__", datauri(P("logo.png"), "image/png"))
        .replace("__EARTH_DATA__", datauri(P("earth.png"), "image/png"))
        .replace("__STUDIO_DATA__", datauri(P("studio.jpg"), "image/jpeg"))
        .replace("__SHOWCODE_DATA__", datauri(P("showcase-code.jpg"), "image/jpeg"))
        .replace("__SHOWSITE_DATA__", datauri(P("showcase-site.jpg"), "image/jpeg")))

out = r"C:\Users\mikef\Downloads\web-action.html"
with open(out, "w", encoding="utf-8") as f:
    f.write(html)

print("wrote", out)
print("size MB:", round(len(html.encode("utf-8")) / 1048576, 2))
