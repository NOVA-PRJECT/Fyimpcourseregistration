import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { STORAGE_KEYS } from '../config/constants';
import { apiClient } from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import { queryClient, queryKeys } from '../lib/query-client';
import { secureStorage } from '../lib/secure-store';

export type OfflineActionType = 'CAMPUS_SIGN_IN' | 'PERIOD_MARKING';

export interface PendingAction {
  id: string;
  type: OfflineActionType;
  endpoint: string;
  payload: any;
  clientTimestamp: string;
}

interface OfflineQueueContextType {
  isOnline: boolean;
  pendingActions: Record<OfflineActionType, PendingAction | null>;
  enqueueAction: (
    type: OfflineActionType,
    endpoint: string,
    payload: any
  ) => Promise<void>;
  clearAction: (type: OfflineActionType) => Promise<void>;
  syncPendingActions: () => Promise<void>;
}

const OfflineQueueContext = createContext<OfflineQueueContextType | undefined>(
  undefined
);

export const OfflineQueueProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [pendingActions, setPendingActions] = useState<
    Record<OfflineActionType, PendingAction | null>
  >({
    CAMPUS_SIGN_IN: null,
    PERIOD_MARKING: null,
  });

  // Load queued actions from encrypted SecureStore on mount
  useEffect(() => {
    secureStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE).then((raw) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          setPendingActions((prev) => ({ ...prev, ...parsed }));
        } catch (e) {
          console.warn('[OfflineQueue] Failed to parse stored queue:', e);
        }
      }
    });
  }, []);

  const saveQueue = async (
    newQueue: Record<OfflineActionType, PendingAction | null>
  ) => {
    setPendingActions(newQueue);
    await secureStorage.setItem(
      STORAGE_KEYS.OFFLINE_QUEUE,
      JSON.stringify(newQueue)
    );
  };

  const enqueueAction = useCallback(
    async (type: OfflineActionType, endpoint: string, payload: any) => {
      const action: PendingAction = {
        id: `${type}_${Date.now()}`,
        type,
        endpoint,
        payload,
        clientTimestamp: new Date().toISOString(),
      };

      setPendingActions((prev) => {
        const updated = { ...prev, [type]: action };
        secureStorage.setItem(
          STORAGE_KEYS.OFFLINE_QUEUE,
          JSON.stringify(updated)
        ).catch((err) =>
          console.warn('[OfflineQueue] Error saving pending action:', err)
        );
        return updated;
      });
    },
    []
  );

  const clearAction = useCallback(async (type: OfflineActionType) => {
    setPendingActions((prev) => {
      const updated = { ...prev, [type]: null };
      secureStorage.setItem(
        STORAGE_KEYS.OFFLINE_QUEUE,
        JSON.stringify(updated)
      ).catch((err) =>
        console.warn('[OfflineQueue] Error clearing pending action:', err)
      );
      return updated;
    });
  }, []);

  const syncPendingActions = useCallback(async () => {
    const raw = await secureStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
    if (!raw) return;

    let currentQueue: Record<OfflineActionType, PendingAction | null>;
    try {
      currentQueue = JSON.parse(raw);
    } catch {
      return;
    }

    // Process CAMPUS_SIGN_IN
    const signInAction = currentQueue.CAMPUS_SIGN_IN;
    if (signInAction) {
      try {
        await apiClient.post(signInAction.endpoint, {
          ...signInAction.payload,
          client_timestamp: signInAction.clientTimestamp,
          synced_late: true,
        });
        currentQueue.CAMPUS_SIGN_IN = null;
        queryClient.invalidateQueries({
          predicate: (query) => query.queryKey[1] === 'campus-sign-in',
        });
      } catch (err) {
        console.warn('[OfflineQueue] Retry failed for sign-in action:', err);
      }
    }

    // Process PERIOD_MARKING
    const markAction = currentQueue.PERIOD_MARKING;
    if (markAction) {
      try {
        await apiClient.post(markAction.endpoint, {
          ...markAction.payload,
          client_timestamp: markAction.clientTimestamp,
          synced_late: true,
        });
        currentQueue.PERIOD_MARKING = null;
        queryClient.invalidateQueries({
          predicate: (query) =>
            query.queryKey[1] === 'scheduled-periods' ||
            query.queryKey[1] === 'slot-roster',
        });
      } catch (err) {
        console.warn('[OfflineQueue] Retry failed for period marking:', err);
      }
    }

    await saveQueue(currentQueue);
  }, []);

  // NetInfo network state listener
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const reachable = !!state.isConnected && state.isInternetReachable !== false;
      setIsOnline(reachable);

      if (reachable) {
        syncPendingActions();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [syncPendingActions]);

  return (
    <OfflineQueueContext.Provider
      value={{
        isOnline,
        pendingActions,
        enqueueAction,
        clearAction,
        syncPendingActions,
      }}
    >
      {children}
    </OfflineQueueContext.Provider>
  );
};

export const useOfflineQueue = (): OfflineQueueContextType => {
  const context = useContext(OfflineQueueContext);
  if (!context) {
    throw new Error('useOfflineQueue must be used within an OfflineQueueProvider');
  }
  return context;
};
