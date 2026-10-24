import { Focusable } from "@decky/ui";
import { ReactNode } from "react";
import { MdEmojiEvents, MdSchedule, MdStarRate, MdTimer } from "react-icons/md";

import { FOCUSED_CLASS, useFocusHook } from "./components";
import { formatBytes, formatDuration, useAchievements, useHltb } from "./gameinfo";
import { t } from "./i18n";
import { currentSettings } from "./settings";
import { APP_TYPE_SHORTCUT, App, lastPlayedText, openAchievements, openDetails, openExternal, openStore } from "./steam";

/** A shortcut card shown under the Store and Game Library tiles. */
export interface ActionCard {
  icon: ReactNode;
  title: string;
  caption: string;
  go: () => void;
}

/** One PS5-style card: dark glass panel, title row with an icon, white glow when focused. */
function InfoCard({
  icon,
  title,
  size = "m",
  label,
  onActivate,
  onFocus,
  children,
}: {
  icon: ReactNode;
  title: string;
  size?: "s" | "m" | "l";
  label: string;
  onActivate: () => void;
  onFocus: () => void;
  children: ReactNode;
}) {
  const ref = useFocusHook(onFocus);
  return (
    <Focusable
      ref={ref}
      className={`psd-infocard psd-infocard-${size}`}
      focusClassName={FOCUSED_CLASS}
      noFocusRing
      onActivate={onActivate}
      onOKActionDescription={label}
    >
      <div className="psd-infocard-head">
        <span className="psd-infocard-icon">{icon}</span>
        {title}
      </div>
      <div className="psd-infocard-body">{children}</div>
    </Focusable>
  );
}

function Bar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <div className="psd-bar">
      <div className="psd-bar-fill" style={{ transform: `scaleX(${pct})` }} />
    </div>
  );
}

function HltbCard({ app, onFocus }: { app: App; onFocus: () => void }) {
  const hltb = useHltb(app);
  const times = hltb.state === "done" ? hltb.value : null;
  const played = (app.minutes_playtime_forever ?? 0) * 60;
  const open = () =>
    openExternal(times?.id ? `https://howlongtobeat.com/game/${times.id}` : `https://howlongtobeat.com/?q=${encodeURIComponent(app.display_name)}`);
  return (
    <InfoCard icon={<MdTimer />} title={t.cardHltb} size="l" label={t.open} onActivate={open} onFocus={onFocus}>
      {hltb.state === "loading" ? (
        <div className="psd-infocard-muted psd-pulse">{t.cardHltbLoading}</div>
      ) : !times ? (
        <div className="psd-infocard-muted">{t.cardHltbNone}</div>
      ) : (
        <>
          <div className="psd-hltb">
            {[
              [t.cardHltbMain, times.main],
              [t.cardHltbPlus, times.plus],
              [t.cardHltbFull, times.full],
            ].map(([label, secs]) => (
              <div key={label as string} className="psd-hltb-col">
                <div className="psd-hltb-time">{(secs as number) > 0 ? formatDuration(secs as number) : "—"}</div>
                <div className="psd-hltb-label">{label}</div>
              </div>
            ))}
          </div>
          {times.main > 0 && played > 0 && (
            <>
              <Bar value={played / times.main} />
              <div className="psd-infocard-caption">
                {t.cardHltbYou(formatDuration(played), Math.min(999, Math.round((played / times.main) * 100)))}
              </div>
            </>
          )}
        </>
      )}
    </InfoCard>
  );
}

function PlaytimeCard({ app, onFocus }: { app: App; onFocus: () => void }) {
  const total = (app.minutes_playtime_forever ?? 0) * 60;
  const recent = (app.minutes_playtime_last_two_weeks ?? 0) * 60;
  return (
    <InfoCard icon={<MdSchedule />} title={t.cardPlaytime} size="s" label={t.details} onActivate={() => openDetails(app)} onFocus={onFocus}>
      <div className="psd-infocard-big">{total > 0 ? formatDuration(total) : "—"}</div>
      <div className="psd-infocard-caption">{total > 0 ? lastPlayedText(app) : t.cardPlaytimeNever}</div>
      {recent > 0 && <div className="psd-infocard-caption">{t.cardTwoWeeks(formatDuration(recent))}</div>}
    </InfoCard>
  );
}

function ReviewsCard({ app, onFocus }: { app: App; onFocus: () => void }) {
  const pct = app.review_percentage_with_bombs ?? 0;
  const size = Number(app.size_on_disk ?? 0);
  if (!pct && !app.metacritic_score && !size) return null;
  return (
    <InfoCard
      icon={<MdStarRate />}
      title={t.cardReviews}
      size="s"
      label={t.storeTitle}
      onActivate={() => openStore(`app/${app.appid}`)}
      onFocus={onFocus}
    >
      <div className="psd-infocard-big">
        {pct ? `${pct}%` : "—"}
        {pct > 0 && <span className="psd-infocard-unit">{t.cardReviewsPositive}</span>}
      </div>
      <div className="psd-chips-mini">
        {!!app.metacritic_score && <span className="psd-mini">{t.cardMetacritic(app.metacritic_score)}</span>}
        {app.installed && size > 0 && <span className="psd-mini">{t.cardSize(formatBytes(size))}</span>}
      </div>
    </InfoCard>
  );
}

function AchievementsCard({ app, onFocus }: { app: App; onFocus: () => void }) {
  const ach = useAchievements(app);
  // Appears once loaded and only for games that have achievements; it's last, so nothing shifts.
  if (ach.state !== "done" || !ach.value) return null;
  const { done, total, recent } = ach.value;
  return (
    <InfoCard
      icon={<MdEmojiEvents />}
      title={t.cardAchievements}
      size="m"
      label={t.cardAchievements}
      onActivate={() => openAchievements(app)}
      onFocus={onFocus}
    >
      <div className="psd-ach-top">
        <div className="psd-infocard-big">
          {done === total ? t.cardAchievementsAll : t.cardAchievementsOf(done, total)}
        </div>
        <div className="psd-ach-icons">
          {recent.map((a) => (
            <img key={a.image} className="psd-ach-icon" src={a.image} loading="lazy" decoding="async" title={a.name} />
          ))}
        </div>
      </div>
      <Bar value={done / total} />
      <div className="psd-infocard-caption">{Math.round((done / total) * 100)}%</div>
    </InfoCard>
  );
}

/** The cards under a game's Play button, PS5 style. */
export function GameCards({ app, onFocus }: { app: App; onFocus: () => void }) {
  if (!currentSettings().infoCards) return null;
  const steam = app.app_type !== APP_TYPE_SHORTCUT;
  return (
    <Focusable className="psd-infocards" flow-children="row">
      {currentSettings().hltb && <HltbCard app={app} onFocus={onFocus} />}
      <PlaytimeCard app={app} onFocus={onFocus} />
      {steam && <ReviewsCard app={app} onFocus={onFocus} />}
      {steam && <AchievementsCard app={app} onFocus={onFocus} />}
    </Focusable>
  );
}

/** Shortcut cards under the Store and Game Library tiles. */
export function ActionCards({ cards, onFocus }: { cards: ActionCard[]; onFocus: () => void }) {
  if (!currentSettings().infoCards || cards.length === 0) return null;
  return (
    <Focusable className="psd-infocards" flow-children="row">
      {cards.map((c) => (
        <InfoCard key={c.title} icon={c.icon} title={c.title} size="s" label={t.open} onActivate={c.go} onFocus={onFocus}>
          <div className="psd-infocard-caption">{c.caption}</div>
        </InfoCard>
      ))}
    </Focusable>
  );
}
