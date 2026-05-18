import { createContext, useContext, useState, useMemo, ReactNode } from "react";

export type Plan = "30-days" | "60-days";

export interface Member {
  id: number;
  telegramId: string;
  plan: string;
  country: string;
  paymentMethod: string;
  screenshotUrl?: string | null;
  status: string;
  expiryDate?: string | null;
  createdAt: string;
}

interface StoreContextType {
  currentUser: Member | null;
  setCurrentUser: (user: Member | null) => void;
  adminToken: string | null;
  setAdminToken: (token: string | null) => void;
  sessionLoading: boolean;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<Member | null>(null);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const sessionLoading = false;

  const value = useMemo(
    () => ({ currentUser, setCurrentUser, adminToken, setAdminToken, sessionLoading }),
    [currentUser, adminToken, sessionLoading]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used within a StoreProvider");
  return context;
}
