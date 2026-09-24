import { createContext, useCallback, useContext, useRef, useState, useSyncExternalStore, useEffect } from "react";
import { useBlocker } from "react-router-dom";
import ConfirmModal from "../components/common/ConfirmModal";
import axiosInstance from "../configs/axiosInstance";
import { cancelOperations, getOperations, subscribeOperations } from "../services/operationTracker";

const OperationGuardContext = createContext(null);
// eslint-disable-next-line react-refresh/only-export-components
export const useOperationGuard = () => useContext(OperationGuardContext);

export default function OperationGuardProvider({ children }) {
  const operations = useSyncExternalStore(subscribeOperations, getOperations);
  const bypass = useRef(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");
  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    !bypass.current && getOperations().length > 0 && currentLocation.pathname !== nextLocation.pathname);
  const open = blocker.state === "blocked" || !!pendingAction;

  // beforeunload cannot display a custom React dialog or custom browser text.
  useEffect(() => {
    if (!operations.length) return;
    const beforeUnload = (event) => { event.preventDefault(); event.returnValue = ""; };
    const pageHide = () => {
      for (const operation of getOperations()) {
        const base = new URL(axiosInstance.defaults.baseURL || "/", window.location.origin);
        const url = new URL(`/api/poverty/operations/${operation.id}/cancel`, base);
        fetch(url, { method: "POST", credentials: "include", keepalive: true }).catch(() => {});
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener("pagehide", pageHide);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      window.removeEventListener("pagehide", pageHide);
    };
  }, [operations.length]);

  const requestLeave = useCallback((action) => {
    if (!getOperations().length) return action();
    setError("");
    setPendingAction(() => action);
  }, []);

  const stay = () => {
    if (cancelling) return;
    if (blocker.state === "blocked") blocker.reset();
    setPendingAction(null);
    setError("");
  };
  const leave = async () => {
    if (cancelling) return;
    setCancelling(true);
    setError("");
    try {
      await cancelOperations(axiosInstance);
      bypass.current = true;
      if (pendingAction) await pendingAction();
      if (blocker.state === "blocked") blocker.proceed();
      setPendingAction(null);
    } catch (failure) {
      setError(failure.message || "Could not stop the operation. Please try again.");
    } finally {
      bypass.current = false;
      setCancelling(false);
    }
  };
  const labels = [...new Set(operations.map((operation) => operation.label))];
  const warning = !labels.length
    ? "The operation has finished. Do you still want to leave this page?"
    : labels.length === 1 && labels[0] === "Model training"
    ? "Model training has started. Your training will stop if you leave this page."
    : `${labels.join(", ") || "The operation"} ${labels.length > 1 ? "are" : "is"} in progress. Active work will stop if you leave this page.`;

  return (
    <OperationGuardContext.Provider value={requestLeave}>
      {children}
      <ConfirmModal
        isOpen={open}
        title="Leave this page?"
        subtitle="Do you want to leave? Previously saved data will be kept."
        warning={error || (cancelling ? "Stopping active work safely. Please wait…" : warning)}
        confirmLabel={cancelling ? "Stopping…" : "Yes"}
        cancelLabel="No"
        busy={cancelling}
        onConfirm={leave}
        onCancel={stay}
      />
    </OperationGuardContext.Provider>
  );
}
