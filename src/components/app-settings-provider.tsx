"use client";

import { createContext, useContext } from "react";

import { TooltipProvider } from "@/components/ui/tooltip";

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
  return (
    <Ctx.Provider value={{ tooltipsEnabled }}>
      <TooltipProvider delay={400}>{children}</TooltipProvider>
    </Ctx.Provider>
  );
}
