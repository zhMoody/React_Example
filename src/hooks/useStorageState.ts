import { useCallback, useEffect, useState } from "react";

export enum StorageType {
  Local = "local",
  Session = "session",
}

interface StorageOptions<T> {
  storageType?: StorageType;
  namespace?: string;
  ttl?: number;
  serializer?: (value: T) => string;
  deserializer?: (value: string) => T;
  onError?: (err: unknown) => void;
}

interface StoragePayload<T> {
  data: T;
  expiry?: number;
}

export const useStorageState = <T>(
  key: string,
  initialValue: T,
  options: StorageOptions<T> = {},
) => {
  const {
    storageType = StorageType.Local,
    namespace = "APP_V1",
    ttl,
    serializer = JSON.stringify,
    deserializer = JSON.parse,
    onError = console.error,
  } = options;
  const fullKey = `${namespace}_${key}`;
  const storage =
    typeof window !== "undefined" ? window[`${storageType}Storage`] : null;
  console.log(fullKey, storage);

  // 惰性初始化
  const [state, setState] = useState<T>(() => {
    if (!storage) return initialValue;
    try {
      const raw = storage.getItem(fullKey);
      if (raw) {
        const payload: StoragePayload<T> = deserializer(raw);
        if (payload.expiry && Date.now() > payload.expiry) {
          storage.removeItem(fullKey);
          return initialValue;
        }
        return payload.data;
      }
    } catch (err) {
      onError(err);
    }
    return initialValue;
  });
  const setPersistentState = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        setState((prev) => {
          const nextValue = value instanceof Function ? value(prev) : value;
          const payload: StoragePayload<T> = {
            data: nextValue,
            ...(ttl ? { expiry: Date.now() + ttl } : {}),
          };
          storage?.setItem(fullKey, serializer(payload));
          return nextValue;
        });
      } catch (err) {
        onError(err);
      }
    },
    [fullKey, storage, ttl, serializer, onError],
  );
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key !== fullKey) return;
      if (e.newValue === null) {
        setState(initialValue);
        return;
      }
      try {
        const payload: StoragePayload<T> = deserializer(e.newValue);
        setState(payload.data);
      } catch (err) {
        onError(err);
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [fullKey, deserializer, onError]);

  const remove = useCallback(() => {
    storage?.removeItem(fullKey);
    setState(initialValue);
  }, [fullKey, storage, initialValue]);

  return [state, setPersistentState, remove] as const;
};
