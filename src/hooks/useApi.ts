import { useState, useCallback } from "react";
import { useAuth } from "./useAuth";

interface UseApiOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  onSuccess?: (data: unknown) => void;
  onError?: (error: string) => void;
}

export function useApi<T = unknown>() {
  const { accessToken } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<T | null>(null);

  const call = useCallback(
    async (endpoint: string, options: UseApiOptions = {}) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api${endpoint}`, {
          method: options.method || "GET",
          headers: {
            "Content-Type": "application/json",
            ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
          },
          body: options.body ? JSON.stringify(options.body) : undefined,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || `HTTP ${response.status}`);
        }

        const result = await response.json();
        setData(result);

        if (options.onSuccess) {
          options.onSuccess(result);
        }

        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);

        if (options.onError) {
          options.onError(errorMessage);
        }

        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [accessToken]
  );

  return { call, isLoading, error, data };
}
