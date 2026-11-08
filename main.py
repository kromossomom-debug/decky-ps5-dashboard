import asyncio
import json
import os
import re

import decky

from hltb_client import HltbClient

SETTINGS_FILE = os.path.join(decky.DECKY_PLUGIN_SETTINGS_DIR, "settings.json")
HLTB_CACHE_FILE = os.path.join(decky.DECKY_PLUGIN_RUNTIME_DIR, "hltb_cache.json")
# Where Steam keeps the per-account settings; first the SteamOS location, then the loader's own home.
STEAM_USERDATA_DIRS = (
    "/home/steam/.local/share/Steam/steamapps/userdata",
    os.path.expanduser("~/.local/share/Steam/steamapps/userdata"),
)


class Plugin:
    hltb: HltbClient | None = None

    async def hltb_times(self, appid: int, name: str) -> dict | None:
        """HowLongToBeat times (in seconds) for a game, or None if it isn't found."""
        if self.hltb is None:
            self.hltb = HltbClient(HLTB_CACHE_FILE)
        # The lookup does blocking HTTP; keep it off the loader's event loop.
        return await asyncio.get_running_loop().run_in_executor(None, self.hltb.get, int(appid), str(name))

    async def get_settings(self) -> dict:
        try:
            with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except FileNotFoundError:
            return {}
        except Exception as e:
            decky.logger.error(f"Could not read settings: {e}")
            return {}

    async def set_settings(self, settings: dict) -> bool:
        try:
            os.makedirs(decky.DECKY_PLUGIN_SETTINGS_DIR, exist_ok=True)
            tmp = SETTINGS_FILE + ".tmp"
            with open(tmp, "w", encoding="utf-8") as f:
                json.dump(settings, f, indent=2)
            os.replace(tmp, SETTINGS_FILE)
            return True
        except Exception as e:
            decky.logger.error(f"Could not save settings: {e}")
            return False

    async def get_24hour(self) -> bool | None:
        """Steam's 24-hour clock toggle (Settings > Time and date), or None when it was never saved.

        SteamOS stores it per account in localconfig.vdf and it can differ from the locale's
        default, so the frontend can't derive it from Intl alone.
        """
        return await asyncio.get_running_loop().run_in_executor(None, self._read_24hour)

    @staticmethod
    def _read_24hour() -> bool | None:
        for base in STEAM_USERDATA_DIRS:
            try:
                profiles = [d for d in os.listdir(base) if os.path.isdir(os.path.join(base, d))]
            except OSError:
                continue
            if not profiles:
                continue
            if len(profiles) > 1:
                # More than one account: read the profile Steam wrote to most recently.
                def mtime(name: str) -> float:
                    try:
                        return os.stat(os.path.join(base, name, "config", "localconfig.vdf")).st_mtime
                    except OSError:
                        return 0.0

                profiles.sort(key=mtime, reverse=True)
            for name in profiles:
                vdf = os.path.join(base, name, "config", "localconfig.vdf")
                try:
                    with open(vdf, "r", encoding="utf-8", errors="replace") as f:
                        text = f.read()
                except OSError:
                    continue
                # b24HourClock is not a plain VDF key: it lives inside the FriendsUIJSON value,
                # a JSON string the VDF stores with escaped quotes ("{\"b24HourClock\":true,...}").
                # Steam serialises it as a JSON boolean, but we also accept 0/1 to be safe.
                match = re.search(r'\\"b24HourClock\":"\s*:\s*(true|false|[01])', text)
                if match:
                    return match.group(1) in ("true", "1")
            # Profiles exist but the toggle was never saved: let the locale decide.
            return None
        decky.logger.warning("PS5 Dashboard: Steam userdata not found, using the locale's clock format")
        return None

    async def _main(self):
        decky.logger.info("PS5 Dashboard loaded")

    async def _unload(self):
        decky.logger.info("PS5 Dashboard unloaded")
