import asyncio
import json
import os

import decky

from hltb_client import HltbClient

SETTINGS_FILE = os.path.join(decky.DECKY_PLUGIN_SETTINGS_DIR, "settings.json")
HLTB_CACHE_FILE = os.path.join(decky.DECKY_PLUGIN_RUNTIME_DIR, "hltb_cache.json")


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

    async def _main(self):
        decky.logger.info("PS5 Dashboard loaded")

    async def _unload(self):
        decky.logger.info("PS5 Dashboard unloaded")
