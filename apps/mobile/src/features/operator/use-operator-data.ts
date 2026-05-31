import { useCallback, useEffect, useMemo, useState } from "react";

import {
  addIncidentComment,
  getDashboardStats,
  getIncident,
  listIncidents,
  updateIncidentStatus,
} from "../../shared/api/client";
import { logger } from "../../shared/fallback/logger";
import {
  buildMockDetail,
  mockIncidents,
  mockStats,
} from "../../shared/mocks/operator-data";
import type {
  DashboardStats,
  IncidentDetail,
  IncidentListItem,
  IncidentStatus,
} from "../../shared/types/api";

export function useOperatorData(token: string | null) {
  const [incidents, setIncidents] = useState<IncidentListItem[]>(mockIncidents);
  const [stats, setStats] = useState<DashboardStats>(mockStats);
  const [selected, setSelected] = useState<IncidentDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);

  const isDemo = !token || token === "demo-token";

  const refresh = useCallback(async () => {
    if (isDemo) {
      setIncidents(mockIncidents);
      setStats(mockStats);
      setLastSyncAt(new Date());
      return;
    }
    setLoading(true);
    try {
      const [nextIncidents, nextStats] = await Promise.all([
        listIncidents(token),
        getDashboardStats(token),
      ]);
      setIncidents(nextIncidents.items);
      setStats(nextStats);
      setLastSyncAt(new Date());
    } catch (error) {
      // Degradación: conservar los últimos datos disponibles; el 401 ya transiciona la sesión.
      logger.error("operator-data/refresh", error);
    } finally {
      setLoading(false);
    }
  }, [isDemo, token]);

  const openIncident = useCallback(
    async (incident: IncidentListItem) => {
      if (isDemo) {
        setSelected(buildMockDetail(incident));
        return;
      }
      setLoading(true);
      try {
        setSelected(await getIncident(token, incident.id));
      } finally {
        setLoading(false);
      }
    },
    [isDemo, token],
  );

  const changeStatus = useCallback(
    async (incidentId: string, estado: IncidentStatus, comentario?: string) => {
      if (isDemo) {
        setSelected((current) => (current ? { ...current, estado } : current));
        setIncidents((current) =>
          current.map((item) => (item.id === incidentId ? { ...item, estado } : item)),
        );
        return;
      }
      const detail = await updateIncidentStatus(token, incidentId, estado, comentario);
      setSelected(detail);
      await refresh();
    },
    [isDemo, refresh, token],
  );

  const addNote = useCallback(
    async (incidentId: string, contenido: string) => {
      if (!contenido.trim()) return;
      if (isDemo) {
        setSelected((current) =>
          current
            ? {
                ...current,
                comentarios: [
                  ...current.comentarios,
                  {
                    id: `demo-${Date.now()}`,
                    contenido,
                    es_interno: true,
                    created_at: new Date().toISOString(),
                  },
                ],
              }
            : current,
        );
        return;
      }
      await addIncidentComment(token, incidentId, contenido, true);
      setSelected(await getIncident(token, incidentId));
    },
    [isDemo, token],
  );

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => void refresh(), 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  const activeIncidents = useMemo(
    () => incidents.filter((item) => !["RESUELTO", "CERRADO"].includes(item.estado)),
    [incidents],
  );

  return {
    activeIncidents,
    addNote,
    changeStatus,
    closeIncident: () => setSelected(null),
    incidents,
    lastSyncAt,
    loading,
    openIncident,
    refresh,
    selected,
    stats,
  };
}
