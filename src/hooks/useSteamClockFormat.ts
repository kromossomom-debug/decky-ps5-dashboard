import { useEffect, useState } from "react";

export function useSteamClockFormat() {
  const [is24Hour, setIs24Hour] = useState<boolean>(true);

  useEffect(() => {
    let unregister: (() => void) | undefined;

    if (window.SteamClient?.Settings?.GetAccountSettings) {
      window.SteamClient.Settings.GetAccountSettings().then((settings: any) => {
        if (settings?.b24HourClock !== undefined) {
          setIs24Hour(settings.b24HourClock);
        }
      });
    }

    if (window.SteamClient?.Settings?.RegisterForSettingsChanges) {
      const handle = window.SteamClient.Settings.RegisterForSettingsChanges(
        (newSettings: any) => {
          if (newSettings?.b24HourClock !== undefined) {
            setIs24Hour(newSettings.b24HourClock);
          }
        }
      );

      // Handle extrahieren für Unmount (je nach Steam Client API Version)
      if (typeof handle?.unregister === "function") {
        unregister = () => handle.unregister();
      } else if (typeof handle === "function") {
        unregister = handle;
      }
    }

    // Clean-up beim Unmounten der Komponente
    return () => {
      if (unregister) unregister();
    };
  }, []);

  return is24Hour;
}