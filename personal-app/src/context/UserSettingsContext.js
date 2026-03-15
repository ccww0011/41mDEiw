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
  corporate_actions_unapplied: [],
  corporate_actions_added: {},
};

export function UserSettingsProvider({ children }) {
  const [userSettings, setUserSettings] = useState(DEFAULT_SETTINGS);
  const [loadingUserSettings, setLoadingUserSettings] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoadingUserSettings(true);
      const result = await getUserSettings(setUserSettings);
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

  const value = useMemo(
    () => ({
      userSettings,
      setUserSettings,
      loadingUserSettings,
      setLoadingUserSettings,
      putUserSettings,
    }),
    [userSettings, loadingUserSettings]
  );

  return <UserSettingsContext.Provider value={value}>{children}</UserSettingsContext.Provider>;
}
