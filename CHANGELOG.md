# Changelog

## 1.3.0

- **Game options on Select.** Press Select (View) or ≡ on any game tile, on Home, in the lower rows or in the Game
  Library, to open Steam's own game menu, with whatever other plugins add to it, such as SteamGridDB's
  "Change artwork…".
- The round **⋯** button next to Play now opens the same game menu, like on the PS5.
- If Steam's game menu can't be found after a client update, these buttons open the game's page instead.

## 1.2.0

- **Info cards under Play:** Time to beat (HowLongToBeat), Your time, Reviews and Achievements. Each opens the
  matching page. The Store and Game Library tiles get shortcut cards.
- HowLongToBeat lookups run only after the selection rests on a game, and are cached on disk for a week.
- **Menus are PlayStation blue and white now.** The Power menu and every other option menu get a dark rounded panel
  and a white focused item. Steam used to paint "Switch to Desktop" and other items red or green.
- The Steam menu and Quick Access are themed reliably: Steam bundles several copies of their style modules, and every
  copy is matched now instead of only the first.
- Shortcut tiles are glass tiles with a round icon instead of flat grey boxes.
- The background dims to PlayStation navy in the lower rows, and the game row and info fade out instead of sliding
  under the tabs.

## 1.1.0

- The selected game on the home row no longer hides or gets cut off. The row now slides by whole tiles with a GPU
  transform instead of resizing tiles and scrolling mid-animation, and the browser can no longer scroll it on its own.
- The game art crossfades with a slight zoom, and the row slides in when Home opens.
- Lighter on performance: every animation is a transform or an opacity change.

## 1.0.0

- First release: PS5 home screen, Games and Media tabs, Game Library, PS5 colors everywhere, Control Center-style
  menus, accent colors and PlayStation-style font.
