# Araştırma JSON'larını uygulamanın okuduğu normalize çerçeve dosyalarına dönüştürür.
# Kural: kaynağı (source/url) olmayan ölçüt veya kanıt kalemi ALINMAZ; reddedilenler raporlanır.
import json, re, sys, os, unicodedata, glob

SRC = sys.argv[1]           # /tmp/akr-research
OUT = sys.argv[2]           # <proje>/public/frameworks
os.makedirs(OUT, exist_ok=True)
RUBRICS = dict(a.split("=", 1) for a in sys.argv[3:])  # ör. MEDEK=/tmp/akr-tools/medek_rubric.json
TR = str.maketrans("çğıöşüÇĞİÖŞÜ", "cgiosuCGIOSU")

def slug(s):
    s = unicodedata.normalize("NFKD", s.translate(TR)).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")

def nfc(x):
    if isinstance(x, str): return unicodedata.normalize("NFC", x).strip()
    if isinstance(x, list): return [nfc(i) for i in x]
    if isinstance(x, dict): return {k: nfc(v) for k, v in x.items()}
    return x

def first(d, *keys, default=None):
    for k in keys:
        if isinstance(d, dict) and d.get(k) not in (None, "", []): return d[k]
    return default

def has_url(s):
    return isinstance(s, str) and ("http://" in s or "https://" in s)

def scale_of(scoring):
    # Yalnızca belgede açıkça adlandırılmış 1-5 ölçek: 'Eksik' (1), 'Yetersiz' (2) ...
    if not isinstance(scoring, str): return None
    pairs = re.findall(r"[‘'\"]([^’'\"]{2,30})[’'\"]\s*\((\d)\)", scoring)
    return {n: label for label, n in pairs} if len(pairs) >= 3 else None

index, report = [], []
for path in sorted(glob.glob(os.path.join(SRC, "G*.json"))):
    group = json.load(open(path, encoding="utf-8"))
    for b in group.get("bodies", []):
        b = nfc(b)
        code = b.get("code", "").strip()
        if not code or code.endswith("CROSSCHECK"): continue
        rejected = {"criteria": 0, "sub": 0, "evidence": 0}
        criteria = []
        used_sub_ids = set()
        rubric = json.load(open(RUBRICS[code], encoding="utf-8")) if code in RUBRICS else None
        guide = (b.get("standardDocument") or {}).get("guide") or {}
        for ci, c in enumerate(b.get("criteria") or []):
            csrc = first(c, "source", "descriptionSource")
            subs, idmap = [], {}
            for s in c.get("subcriteria") or []:
                ssrc = first(s, "source")
                if not has_url(ssrc) and not has_url(csrc):
                    rejected["sub"] += 1; continue
                orig = str(s.get("id", "")).strip()
                sid = orig if orig not in used_sub_ids else f"K{ci + 1}/{orig}"
                used_sub_ids.add(sid); idmap[orig] = sid
                text = first(s, "text", "title", default="")
                title = s.get("title")
                # MEDEK programa özgü çıktılar: "[Teknik] Aşçılık Programı: 1. ... | 2. ..."
                m = re.match(r"^\[([^\]]+)\]\s*([^:]{3,90}?):\s*(.+)$", text, re.S)
                if m and not title:
                    title, text = f"{m.group(2).strip()} ({m.group(1)})", m.group(3)
                text = text.replace(" | ", "\n")
                rows = None
                if rubric:
                    keys = [k for k in rubric if (k == orig or k.startswith(orig + ".")) and sid == orig]
                    keys.sort(key=lambda k: [int(x) for x in k.split(".")])
                    if keys:
                        rows = [{"id": k, "statement": rubric[k]["pdr"], "levels": rubric[k]["levels"],
                                 "source": f"{guide.get('url')} (Rehber v1.1, PDF s. {rubric[k]['page']})"} for k in keys]
                subs.append({k: v for k, v in {
                    "id": sid,
                    "title": title,
                    "text": text,
                    "maturity": s.get("maturityLevels"),
                    "rubric": rows,
                    "critical": bool(s.get("critical")) or None,
                    "source": ssrc or csrc,
                    "note": s.get("note") or s.get("versionDiff") and json.dumps(s.get("versionDiff"), ensure_ascii=False),
                }.items() if v not in (None, "", {}, [])})
            evid = []
            for ei, e in enumerate(c.get("evidence") or []):
                esrc = first(e, "source")
                if not has_url(esrc) or not first(e, "title"):
                    rejected["evidence"] += 1; continue
                kind = e.get("kind") if e.get("kind") in ("explicit", "derived") else "derived"
                evid.append({k: v for k, v in {
                    "id": f"{slug(str(c.get('id') or ci))}-{ei + 1}",
                    "title": e["title"],
                    "kind": kind,
                    "basis": e.get("basis"),
                    "source": esrc,
                    "sub": idmap.get(str(first(e, "subcriterion", "sub", "appliesTo", "subcriterionId", default="")).strip()),
                    "versions": e.get("versions"),
                    "note": e.get("note"),
                }.items() if v not in (None, "", [])})
            # Aynı ÖDR tablosu hem ÖDR şablonunda ("Tablo 1.1 ...") hem rehberde ("... (ÖDR Tablo 1.1)") geçiyorsa tek kalem
            merged = []
            for e in evid:
                m = re.search(r"\(ÖDR Tablo\s*(\d+(?:\.\d+)*)\.?\)", e["title"])
                twin = m and next((x for x in merged if re.match(r"^Tablo\s*" + re.escape(m.group(1)) + r"\b", x["title"]) and x.get("sub") == e.get("sub")), None)
                if twin:
                    twin["note"] = ((twin.get("note") or "") + f" Rehberde de örnek kanıt: “{e['title']}” — {e['source']}").strip()
                else:
                    merged.append(e)
            evid = merged
            if not subs and not evid and not has_url(csrc):
                rejected["criteria"] += 1; continue
            criteria.append({k: v for k, v in {
                "id": str(c.get("id") or f"K{ci + 1}").strip(),
                "title": c.get("title") or str(c.get("id")),
                "heading": c.get("heading"),
                "points": c.get("points"),
                "headingPoints": c.get("headingPoints"),
                "description": c.get("description"),
                "disciplineSpecific": bool(c.get("disciplineSpecific")),
                "critical": bool(c.get("critical")) or None,
                "appliesTo": first(c, "scope", "appliesTo") if isinstance(first(c, "scope", "appliesTo"), str) else None,
                "source": csrc,
                "sub": subs,
                "evidence": evid,
            }.items() if v not in (None, "", [])})
        docs = []
        sd = b.get("standardDocument") or {}
        if sd.get("url"): docs.append({**{k: sd.get(k) for k in ("title", "version", "date", "url")}, "role": "Ölçütler"})
        if isinstance(sd.get("guide"), dict) and sd["guide"].get("url"): docs.append({"title": sd["guide"].get("title"), "url": sd["guide"]["url"], "role": "Rehber"})
        if isinstance(sd.get("rubric"), dict) and sd["rubric"].get("url"): docs.append({"title": sd["rubric"].get("title"), "url": sd["rubric"]["url"], "role": "Rubrik"})
        for rd in (sd.get("relatedDocuments") or []) + (b.get("additionalStandardDocuments") or []):
            if rd.get("url"): docs.append({**{k: rd.get(k) for k in ("title", "version", "date", "url")}, "role": "İlgili"})
        ssr = b.get("selfStudyReport") or {}
        if ssr.get("url"): docs.append({"title": ssr.get("title"), "url": ssr["url"], "role": "Öz değerlendirme"})
        fw = {k: v for k, v in {
            "code": code,
            "slug": slug(code),
            "name": b.get("name"),
            "kind": "institutional" if code.startswith("YÖKAK") else "program",
            "scope": b.get("scope"),
            "website": b.get("website"),
            "status": b.get("status") or "partial",
            "documents": docs,
            "cycle": b.get("cycle") if isinstance(b.get("cycle"), str) else (json.dumps(b.get("cycle"), ensure_ascii=False) if b.get("cycle") else None),
            "report": {k: v for k, v in {"title": ssr.get("title"), "url": ssr.get("url"), "sections": ssr.get("sections"), "requiredAppendices": ssr.get("requiredAppendices"), "writingRules": ssr.get("writingRules")}.items() if v} or None,
            "notes": b.get("notes") if isinstance(b.get("notes"), str) else (json.dumps(b.get("notes"), ensure_ascii=False) if b.get("notes") else None),
            "scoring": b.get("scoring") if isinstance(b.get("scoring"), str) else (json.dumps(b.get("scoring"), ensure_ascii=False) if b.get("scoring") else None),
            "scale": scale_of(b.get("scoring")),
            "programOutcomes": [{k: v for k, v in {"id": po.get("id"), "group": po.get("group"), "text": po.get("text"), "source": po.get("source")}.items() if v}
                                for po in (b.get("programOutcomes") or []) if isinstance(po, dict) and po.get("text") and has_url(po.get("source"))] or None,
            "accessed": "2026-10-23",
            "criteria": criteria,
        }.items() if v not in (None, "", [])}
        nE = sum(len(c.get("evidence", [])) for c in criteria)
        nS = sum(len(c.get("sub", [])) for c in criteria)
        nX = sum(1 for c in criteria for e in c.get("evidence", []) if e["kind"] == "explicit")
        json.dump(fw, open(os.path.join(OUT, f"{fw['slug']}.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
        index.append({"code": code, "registryCode": re.split(r"\s+[(/]|-v\d", code)[0].strip(), "slug": fw["slug"], "name": fw.get("name"), "kind": fw["kind"], "scope": fw.get("scope"), "status": fw["status"],
                      "criteria": len(criteria), "subcriteria": nS, "evidence": nE, "explicit": nX,
                      "document": (docs[0] if docs else None), "website": fw.get("website")})
        report.append((code, fw["status"], len(criteria), nS, nE, nX, rejected))
json.dump(sorted(index, key=lambda x: (x["kind"] != "institutional", x["code"])), open(os.path.join(OUT, "index.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
for r in report: print("%-12s %-9s ölçüt=%-3d alt=%-4d kanıt=%-4d (açık %d) reddedilen=%s" % r)
