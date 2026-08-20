/**
 * Shared context for the subscription terminal, lifted to the Header.
 * Consumers call `openSubscriptionTerminal(forced?)` to open; Header owns state + rendering.
 */
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface SubscriptionTerminalContextValue {
  showSubscriptionTerminal: boolean;
  subscriptionTerminalForced: boolean;
  openSubscriptionTerminal: (forced?: boolean) => void;
  closeSubscriptionTerminal: () => void;
}

const SubscriptionTerminalContext = createContext<SubscriptionTerminalContextValue | null>(null);

export function SubscriptionTerminalProvider({ children }: { children: ReactNode }) {
  const [show, setShow] = useState(false);
  const [forced, setForced] = useState(false);

  const openSubscriptionTerminal = useCallback((f = false) => {
    setForced(f);
    setShow(true);
  }, []);

  const closeSubscriptionTerminal = useCallback(() => {
    setForced(false);
    setShow(false);
  }, []);

  return (
    <SubscriptionTerminalContext.Provider
      value={{ showSubscriptionTerminal: show, subscriptionTerminalForced: forced, openSubscriptionTerminal, closeSubscriptionTerminal }}
    >
      {children}
    </SubscriptionTerminalContext.Provider>
  );
}

export function useSubscriptionTerminal() {
  const ctx = useContext(SubscriptionTerminalContext);
  if (!ctx) {
    throw new Error('useSubscriptionTerminal must be used within SubscriptionTerminalProvider');
  }
  return ctx;
}