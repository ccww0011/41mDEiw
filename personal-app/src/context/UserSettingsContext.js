import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getUserSettings, putUserSettings as putUserSettingsApi } from "@/utils_protected/userSettingsApi";

const UserSettingsContext = createContext(null);

export function useUserSettings() {
  const context = useContext(UserSettingsContext);
  if (context === null) throw new Error("useUserSettings must be used within UserSettingsProvider");
  return context;
}

const DEFAULT_SETTINGS = {
  corporate_actions_applied: {},
  corporate_actions_excluded: [],
  corporate_actions_added: {},
  basis: "Local",
};

function normalizeUserSettings(next) {
  if (!next || typeof next !== "object") return { ...DEFAULT_SETTINGS };
  return {
    ...DEFAULT_SETTINGS,
    ...next,
    basis: next.basis || "Local",
  };
}

export function UserSettingsProvider({ children }) {
  const [userSettings, setUserSettings] = useState(DEFAULT_SETTINGS);
  const [loadingUserSettings, setLoadingUserSettings] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoadingUserSettings(true);
      const result = await getUserSettings((data) => {
        setUserSettings(normalizeUserSettings(data));
      });
      if (result?.status !== "Success") {
        setUserSettings(DEFAULT_SETTINGS);
      }
      setLoadingUserSettings(false);
    };
    fetchData();
  }, []);

  const putUserSettings = async (body) => {
    setLoadingUserSettings(true);
    if (body?.items) {
      let parsed = body.items;
      if (typeof parsed === "string") {
        try {
          parsed = JSON.parse(parsed);
        } catch {
          parsed = null;
        }
      }
      if (parsed && typeof parsed === "object") {
        setUserSettings((prev) => ({ ...(prev ?? {}), ...parsed }));
      }
    }
    try {
      return await putUserSettingsApi(body, setUserSettings);
    } finally {
      setLoadingUserSettings(false);
    }
  };

  const setBasis = async (nextBasis) => {
    if (!userSettings) return;
    if (userSettings.basis === nextBasis) return;
    const next = normalizeUserSettings({ ...(userSettings ?? {}), basis: nextBasis });
    return putUserSettings({ items: JSON.stringify(next) });
  };

  const setUserCorporateActionsMask = async ({ applied, excluded, added }) => {
    if (!userSettings) return;
    const next = normalizeUserSettings({
      ...(userSettings ?? {}),
      corporate_actions_applied: applied ?? userSettings?.corporate_actions_applied ?? {},
      corporate_actions_excluded: excluded ?? userSettings?.corporate_actions_excluded ?? [],
      corporate_actions_added: added ?? userSettings?.corporate_actions_added ?? {},
    });
    return putUserSettings({ items: JSON.stringify(next) });
  };

  const value = useMemo(
    () => ({
      basis: userSettings?.basis,
      userCorporateActionsMask: {
        applied: userSettings?.corporate_actions_applied ?? {},
        excluded: userSettings?.corporate_actions_excluded ?? [],
        added: userSettings?.corporate_actions_added ?? {},
      },
      loadingUserSettings,
      setLoadingUserSettings,
      setUserCorporateActionsMask,
      setBasis,
    }),
    [userSettings, loadingUserSettings]
  );
  // console.log(userSettings?.basis)

  return <UserSettingsContext.Provider value={value}>{children}</UserSettingsContext.Provider>;
}
