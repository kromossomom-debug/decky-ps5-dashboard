# Changelog

## 1.9.0

- **New setting: Hide bottom bar (Ocultar barra inferior).** Under the Layout section, users can now toggle off the
  controller button hints footer bar (A, B, X, Y buttons, Legion Go / Xbox / Steam glyphs) at the bottom of the screen.
- **Fixed SteamOS native language detection.** Robust locale detection mapping 30+ internal Steam language codes
  (such as "brazilian", "portuguese", "latam", etc.) to proper ISO prefixes, ensuring SteamOS in Portuguese or English
  always shows the matching UI text seamlessly.
- **Improved header and game row spacing.** Adjusted spacing between the top-right option buttons (search, settings,
  power, profile avatar) and the main home game tiles to prevent overlap when tiles or avatar focus labels are selected.

## 1.8.0

- **New setting: Open Steam's library.** When it's on, the Game Library tile at the end of the home row, its shortcut
  cards, the Game Library shortcut and the Media tab's Apps card open Steam's own library instead of the PS5 Game
  Library, so your TabMaster tabs and sorting are right there. The tile then shows "Steam Library". It's off by
  default, so the PS5 Game Library stays the default. Requested by a user on Reddit.

## 1.7.0

- **New setting: Style Steam's library.** Turn it off to leave Steam's own library as Steam draws it (capsule corners,
  focus, tabs and page background), for example to use TabMaster's tabs and sorting. The PS5 home screen, menus and
  Game Library are not affected. Requested by a user on Reddit.

## 1.6.0

- **Steam menu pills fixed.** Steam scaled the focused and the current item to 110%, pushing the pill past the
  panel's edge, where it lost its right corners. Items now stay inside the panel, the focus gets a gentle 2% lift,
  and its glow is no longer cut into a hard band.
- **Long labels fit.** Items are sized so "Friends & Chat" and similar labels fit instead of turning into Steam's
  scrolling marquee, and the focused label is always black on white.
- **Quick Access tabs are real circles.** The tabs are 48 × 64 px, so rounding them gave stretched ovals; a fixed
  circle behind the icon is the highlight now, without Steam's scale-and-clip focus effect.
- **Steam's library looks like the PS5.** A navy gradient page, tabs as pills in sentence case with dimmed counts, and
  a crisp white edge with a soft lift on the focused capsule instead of a wide white bloom.

## 1.5.0

- **Steam menu (left side) in PS5 style.** Dark navy glass panel, rounded items, a white focused item with black text
  and a soft glow, and the current page in bold with a small PlayStation-blue dot. Steam's blue panel and its
  translucent focus animation are gone.
- **The theme now reaches the Steam menu and Quick Access windows.** In Game Mode they don't always appear in Steam's
  popup list, so the plugin also looks them up through Steam's controller navigation, the way Steam itself tracks them.
- **Your time** card: non-Steam games show when you last played them instead of "Not played yet".
- The plugin panel shows its version, so you can check which build Steam has loaded.

## 1.4.0

- **Home row like the PS5.** The next games now sit right after the selected one instead of leaving a wide gap, and
  the game's name moves under them. The tile before the selected one peeks in at the left edge.
- **Lift and glass aura.** The focused game lifts slightly with a drop shadow, and a glass light band keeps circling
  its edge, blending white, grey and translucent black. It only rotates (a GPU transform), so it costs nothing per
  frame, and only the focused tile has it.

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
