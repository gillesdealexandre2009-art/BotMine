import json, re, glob, os, sys

BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "RP", "ui")
VAN = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "vanilla_1.26.52", "ui")


def strip(s):
    out = []
    i = 0
    n = len(s)
    ins = False
    while i < n:
        c = s[i]
        if ins:
            out.append(c)
            if c == "\\":
                out.append(s[i + 1])
                i += 2
                continue
            if c == '"':
                ins = False
            i += 1
            continue
        if c == '"':
            ins = True
            out.append(c)
            i += 1
            continue
        if s.startswith("//", i):
            j = s.find("\n", i)
            i = n if j < 0 else j
            continue
        if s.startswith("/*", i):
            j = s.find("*/", i)
            i = j + 2
            continue
        out.append(c)
        i += 1
    return "".join(out)


ok = True
defs = {}
for f in sorted(glob.glob(os.path.join(BASE, "**", "*.json"), recursive=True)):
    raw = open(f, "rb").read()
    if raw.startswith(b"\xef\xbb\xbf"):
        print("BOM:", f)
    d = json.loads(strip(raw.decode("utf-8")))
    print("OK", os.path.relpath(f, BASE), "keys:", len(d))
    if d.get("namespace") == "vulpus_menu":
        defs = d

names = {k.split("@")[0] for k in defs if k != "namespace"}
dump = json.dumps(defs, ensure_ascii=False)
refs = set(re.findall(r"vulpus_menu\.([a-z_0-9]+)", dump))
print("missing vulpus_menu refs:", refs - names or "none")
print("unreferenced defs:", (names - refs - {"root"}) or "none")

# vanilla refs used
van_refs = set(re.findall(r"@?((?:common|common_dialogs|server_form|settings_common)\.[a-z_0-9]+)", dump))
vanilla_defs = {}
for f in glob.glob(os.path.join(VAN, "**", "*.json"), recursive=True):
    try:
        d = json.load(open(f, encoding="utf-8"))
    except Exception:
        continue
    ns = d.get("namespace")
    for k in d:
        if k != "namespace":
            vanilla_defs.setdefault(ns, set()).add(k.split("@")[0])
for r in sorted(van_refs):
    ns, el = r.split(".", 1)
    print("vanilla ref", r, "->", "OK" if el in vanilla_defs.get(ns, set()) else "MISSING")


def walk(name, node, parent):
    if isinstance(node, dict):
        if "collection_index" in node:
            pt = parent.get("type") if parent else None
            pc = parent.get("collection_name") if parent else None
            flag = "OK" if (pt in ("stack_panel", "grid") and pc == "form_buttons") else "CHECK"
            print("collection_index", node["collection_index"], "at", name, "parent:", pt, pc, flag)
        if "collection_name" in node and node.get("type") not in ("stack_panel", "grid", None):
            print("WARN collection_name on", node.get("type"), "at", name)
        for c in node.get("controls", []) or []:
            for k, v in c.items():
                walk(name + "/" + k, v, node)


for k, v in defs.items():
    if isinstance(v, dict):
        walk(k, v, None)

# button with collection_details?
for k, v in defs.items():
    if isinstance(v, dict) and v.get("type") == "button":
        has = any(b.get("binding_type") == "collection_details" for b in v.get("bindings", []))
        print("button", k, "collection_details:", has)

# expressions sanity: every view binding mentions a #property
for m in re.finditer(r'"source_property_name": "([^"]*)"', dump):
    e = m.group(1)
    if "#" not in e:
        print("WARN expression without #property:", e)
    for bad in (">=", "<=", "!="):
        if bad in e:
            print("WARN operator", bad, "in", e)
print("done")
