"use client";

import { createContext, useContext } from "react";

const Ctx = createContext<{ tooltipsEnabled: boolean }>({ tooltipsEnabled: true });

export function useAppSettings() {
  return useContext(Ctx);
}

export function AppSettingsProvider({
  tooltipsEnabled,
  children,
}: {
  tooltipsEnabled: boolean;
  children: React.ReactNode;
}) {
  return <Ctx.Provider value={{ tooltipsEnabled }}>{children}</Ctx.Provider>;
}
