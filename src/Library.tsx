import { Focusable } from "@decky/ui";
import { ReactNode, useMemo, useState } from "react";
import { MdApps, MdComputer, MdFolder, MdGridView, MdPlayCircle, MdSort, MdStar } from "react-icons/md";

import { FOCUSED_CLASS, GameTile } from "./components";
import { t } from "./i18n";
import {
  App,
  byName,
  byRecent,
  favoriteApps,
  gameApps,
  installedApps,
  nonSteamApps,
  softwareApps,
  userCollections,
} from "./steam";

interface View {
  id: string;
  label: string;
  icon: ReactNode;
  apps: () => App[];
}

type Sort = "recent" | "name";

/** A pill in the row along the top of the Game Library ("Playable", "Your Collection"...). */
function Chip({
  icon,
  label,
  active,
  onActivate,
}: {
  icon: ReactNode;
  label: string;
  active?: boolean;
  onActivate: () => void;
}) {
  return (
    <Focusable
      className={`psd-chip ${active ? "psd-active" : ""}`}
      focusClassName={FOCUSED_CLASS}
      noFocusRing
      onActivate={onActivate}
      onOKActionDescription={t.select}
    >
      <span className="psd-chip-icon">{icon}</span>
      <span className="psd-chip-label">{label}</span>
    </Focusable>
  );
}

/** The PS5 Game Library: filters as pills on top, a grid of square tiles below. */
export function LibraryTab({ initialView = "installed" }: { initialView?: string }) {
  const views = useMemo<View[]>(
    () => [
      { id: "installed", label: t.viewPlayable, icon: <MdPlayCircle />, apps: installedApps },
      { id: "collection", label: t.viewCollection, icon: <MdGridView />, apps: gameApps },
      { id: "apps", label: t.viewApps, icon: <MdApps />, apps: softwareApps },
      { id: "favorites", label: t.viewFavorites, icon: <MdStar />, apps: favoriteApps },
      { id: "nonsteam", label: t.viewNonSteam, icon: <MdComputer />, apps: nonSteamApps },
      ...userCollections().map((c) => ({ id: `c:${c.id}`, label: c.name, icon: <MdFolder />, apps: c.apps })),
    ],
    [],
  );
  // Nothing installed yet? Open on the whole collection instead of an empty page.
  const [viewId, setViewId] = useState(() =>
    initialView === "installed" && installedApps().length === 0 ? "collection" : initialView,
  );
  const [sort, setSort] = useState<Sort>("recent");
  const view = views.find((v) => v.id === viewId) ?? views[0];
  const list = useMemo(() => view.apps().sort(sort === "recent" ? byRecent : byName), [view, sort]);

  return (
    <Focusable className="psd-page psd-lib" flow-children="column">
      <Focusable className="psd-chips" flow-children="row">
        {views.map((v) => (
          <Chip key={v.id} icon={v.icon} label={v.label} active={v.id === view.id} onActivate={() => setViewId(v.id)} />
        ))}
        <div className="psd-chip-sep" />
        <Chip
          icon={<MdSort />}
          label={sort === "recent" ? t.sortRecent : t.sortName}
          onActivate={() => setSort(sort === "recent" ? "name" : "recent")}
        />
      </Focusable>
      <div className="psd-lib-head">
        {view.label} <span className="psd-lib-count">{list.length}</span>
      </div>
      {list.length === 0 ? (
        <div className="psd-lib-empty">{t.empty}</div>
      ) : (
        <Focusable className="psd-grid" flow-children="grid" key={`${view.id}-${sort}`}>
          {list.map((app, i) => (
            <GameTile key={app.appid} app={app} size="small" preferredFocus={i === 0} />
          ))}
        </Focusable>
      )}
    </Focusable>
  );
}
