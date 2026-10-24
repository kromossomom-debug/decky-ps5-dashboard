"""
HowLongToBeat lookups for the PS5 home screen's info cards.

HowLongToBeat has no public API: this does what its website does. It asks for a short-lived
search token, then posts a search. Results are cached on disk so each game is looked up at most
once a week, and only when the player actually looks at it.
"""

import difflib
import json
import logging
import os
import re
import ssl
import threading
import time
import unicodedata
import urllib.error
import urllib.request

BASE = "https://howlongtobeat.com"
DEFAULT_SEARCH_PATH = "/api/search/site"
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
)
TIMEOUT_S = 12
HIT_TTL_S = 7 * 24 * 3600
MISS_TTL_S = 24 * 3600
MIN_SIMILARITY = 0.72

# Words Steam adds to names that HowLongToBeat usually leaves out.
EDITION_WORDS = re.compile(
    r"\b(game of the year|goty|definitive|complete|deluxe|ultimate|gold|enhanced|remastered|"
    r"anniversary|director'?s cut|special|standard|digital|premium|edition)\b"
)

log = logging.getLogger("ps5-dashboard.hltb")


def _ssl_context() -> ssl.SSLContext:
    """
    Decky's bundled Python doesn't know where SteamOS keeps its CA certificates, so a plain
    urlopen fails every HTTPS request with CERTIFICATE_VERIFY_FAILED. Point it at a bundle.
    """
    candidates = []
    try:
        import certifi

        candidates.append(certifi.where())
    except ImportError:
        pass
    candidates += [
        "/etc/ssl/certs/ca-certificates.crt",
        "/etc/ssl/cert.pem",
        "/etc/pki/tls/certs/ca-bundle.crt",
    ]
    for cafile in candidates:
        if cafile and os.path.exists(cafile):
            return ssl.create_default_context(cafile=cafile)
    return ssl.create_default_context()


SSL_CONTEXT = _ssl_context()


def normalize(name: str) -> str:
    # Drop ™/®/© first: NFKD would turn ™ into the letters "TM".
    name = re.sub(r"[™®©]", "", name)
    name = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    name = name.lower().replace("&", " and ")
    name = re.sub(r"[^a-z0-9]+", " ", name)
    return re.sub(r"\s+", " ", name).strip()


def search_variants(name: str) -> list[str]:
    """The Steam name, then without edition words, then without the subtitle."""
    base = normalize(name)
    variants = [base]
    plain = re.sub(r"\s+", " ", EDITION_WORDS.sub(" ", base)).strip()
    if plain and plain not in variants:
        variants.append(plain)
    for sep in (":", " - ", " – "):
        if sep in name:
            head = normalize(name.split(sep)[0])
            if head and head not in variants:
                variants.append(head)
            break
    return variants


class HltbClient:
    def __init__(self, cache_file: str):
        self.cache_file = cache_file
        self.search_path = DEFAULT_SEARCH_PATH
        self.auth: dict | None = None
        self.lock = threading.Lock()
        self.cache: dict = {}
        try:
            with open(cache_file, "r", encoding="utf-8") as f:
                self.cache = json.load(f)
        except (FileNotFoundError, ValueError):
            self.cache = {}

    # ---------- HTTP ----------

    def _request(self, path: str, body: dict | None = None, extra: dict | None = None):
        headers = {
            "User-Agent": USER_AGENT,
            "Referer": f"{BASE}/",
            "Origin": BASE,
            "Content-Type": "application/json",
            **(extra or {}),
        }
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(BASE + path, data=data, headers=headers, method="POST" if body is not None else "GET")
        with urllib.request.urlopen(req, timeout=TIMEOUT_S, context=SSL_CONTEXT) as resp:
            raw = resp.read().decode("utf-8", "replace")
        return json.loads(raw) if raw.strip().startswith(("{", "[")) else raw

    def _fetch_auth(self) -> dict | None:
        data = self._request(f"{self.search_path}/init?t={int(time.time() * 1000)}")
        if not isinstance(data, dict) or not isinstance(data.get("token"), str):
            return None
        auth = {"token": data["token"]}
        # Newer versions also hand out a key/value pair that has to be echoed back.
        for k, v in data.items():
            if not isinstance(v, str) or k == "token":
                continue
            if "key" in k.lower():
                auth.setdefault("hpKey", v)
            elif "val" in k.lower():
                auth.setdefault("hpVal", v)
        return auth

    def _discover_search_path(self) -> str | None:
        """If the default endpoint moves, find the new one in the site's own scripts."""
        html = self._request("/")
        if not isinstance(html, str):
            return None
        for src in re.findall(r'<script[^>]+src="([^"]+\.js)"', html):
            if src.startswith("http") and not src.startswith(BASE):
                continue
            path = src if src.startswith("/") else "/" + src.split(BASE, 1)[-1].lstrip("/")
            try:
                js = self._request(path)
            except Exception:
                continue
            if not isinstance(js, str) or "searchOptions" not in js:
                continue
            m = re.search(r'fetch\(\s*["`\']/api/([a-zA-Z0-9_/]+?)(?:/init)?["`\']', js)
            if m:
                return "/api/" + m.group(1).rstrip("/")
        return None

    def _search(self, terms: str) -> list[dict]:
        body = {
            "searchType": "games",
            "searchTerms": terms.split(" "),
            "searchPage": 1,
            "size": 20,
            "searchOptions": {
                "games": {
                    "userId": 0,
                    "platform": "",
                    "sortCategory": "popular",
                    "rangeCategory": "main",
                    "rangeTime": {"min": 0, "max": 0},
                    "gameplay": {"perspective": "", "flow": "", "genre": "", "difficulty": ""},
                    "rangeYear": {"min": "", "max": ""},
                    "modifier": "hide_dlc",
                },
                "users": {},
                "lists": {},
                "filter": "",
                "sort": 0,
                "randomizer": 0,
            },
            "useCache": True,
        }
        for attempt in range(3):
            if self.auth is None:
                self.auth = self._fetch_auth()
                if self.auth is None:
                    found = self._discover_search_path()
                    if not found or found == self.search_path:
                        return []
                    self.search_path = found
                    continue
            headers = {"x-auth-token": self.auth["token"]}
            payload = dict(body)
            if "hpKey" in self.auth and "hpVal" in self.auth:
                headers["x-hp-key"] = self.auth["hpKey"]
                headers["x-hp-val"] = self.auth["hpVal"]
                payload[self.auth["hpKey"]] = self.auth["hpVal"]
            try:
                data = self._request(self.search_path, payload, headers)
                return data.get("data", []) if isinstance(data, dict) else []
            except urllib.error.HTTPError as e:
                # Expired token or a moved endpoint: get a fresh token (and path) and retry.
                log.info("HLTB search failed with %s, retrying", e.code)
                self.auth = None
                if e.code == 404:
                    found = self._discover_search_path()
                    if found:
                        self.search_path = found
        return []

    # ---------- matching ----------

    @staticmethod
    def _pick(results: list[dict], query: str) -> dict | None:
        best, best_score = None, 0.0
        for item in results:
            names = [item.get("game_name") or ""] + [a for a in (item.get("game_alias") or "").split(",") if a]
            score = max(difflib.SequenceMatcher(None, query, normalize(n)).ratio() for n in names)
            # Prefer the better-known entry when two names are equally close.
            score += min(item.get("count_comp") or 0, 10000) / 1e7
            if score > best_score:
                best, best_score = item, score
        return best if best is not None and best_score >= MIN_SIMILARITY else None

    def _lookup(self, name: str) -> dict | None:
        for query in search_variants(name):
            match = self._pick(self._search(query), query)
            if match:
                return {
                    "id": match.get("game_id"),
                    "name": match.get("game_name"),
                    "main": match.get("comp_main") or 0,
                    "plus": match.get("comp_plus") or 0,
                    "full": match.get("comp_100") or 0,
                }
        return None

    # ---------- public ----------

    def get(self, appid: int, name: str) -> dict | None:
        key = str(appid)
        entry = self.cache.get(key)
        now = time.time()
        if entry and entry.get("name_query") == name:
            ttl = HIT_TTL_S if entry.get("data") else MISS_TTL_S
            if now - entry.get("ts", 0) < ttl:
                return entry.get("data")
        with self.lock:
            try:
                data = self._lookup(name)
            except Exception as e:
                log.warning("HLTB lookup failed for %s: %s", name, e)
                # Network trouble: keep showing what we had, try again later.
                return entry.get("data") if entry else None
            self.cache[key] = {"ts": now, "name_query": name, "data": data}
            self._save()
        return data

    def _save(self):
        try:
            os.makedirs(os.path.dirname(self.cache_file), exist_ok=True)
            tmp = self.cache_file + ".tmp"
            with open(tmp, "w", encoding="utf-8") as f:
                json.dump(self.cache, f)
            os.replace(tmp, self.cache_file)
        except OSError as e:
            log.warning("Could not save HLTB cache: %s", e)
