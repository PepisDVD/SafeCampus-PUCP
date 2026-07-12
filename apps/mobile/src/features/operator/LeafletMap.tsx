import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from "react";
import { StyleSheet } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { colors } from "@safecampus/ui-native";

export type LeafletCoords = {
  latitude: number;
  longitude: number;
};

export type LeafletMarker = {
  id: string;
  coordinate: LeafletCoords;
  title: string;
  description?: string | null;
  color?: string;
};

export type LeafletMapHandle = {
  centerOn: (coords: LeafletCoords, zoom?: number) => void;
};

type LeafletMapProps = {
  center: LeafletCoords;
  markers?: LeafletMarker[];
  operatorLocation?: LeafletCoords | null;
  zoom?: number;
  interactive?: boolean;
  onMarkerPress?: (markerId: string) => void;
};

type LeafletPayload = Required<Pick<LeafletMapProps, "center" | "markers" | "zoom" | "interactive">> & {
  operatorLocation: LeafletCoords | null;
};

function serializeForInlineScript(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function buildHtml(payload: LeafletPayload): string {
  const initialPayload = serializeForInlineScript(payload);

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <style>
      html, body, #map { height: 100%; margin: 0; padding: 0; background: #eef2f7; }
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; overflow: hidden; }
      .fallback { align-items: center; color: #475569; display: flex; font-size: 13px; height: 100%; justify-content: center; padding: 16px; text-align: center; }
      .incident-marker { border: 2px solid #ffffff; border-radius: 999px; box-shadow: 0 2px 8px rgba(15, 23, 42, 0.3); height: 18px; width: 18px; }
      .operator-marker { background: ${colors.primary}; border: 3px solid #ffffff; border-radius: 999px; box-shadow: 0 0 0 8px rgba(37, 99, 235, 0.18), 0 2px 8px rgba(15, 23, 42, 0.3); height: 16px; width: 16px; }
      .popup-title { color: #0f172a; font-size: 13px; font-weight: 800; margin-bottom: 2px; }
      .popup-description { color: #475569; font-size: 12px; margin-bottom: 8px; }
      .popup-action { background: ${colors.primary}; border: 0; border-radius: 8px; color: #ffffff; font-size: 12px; font-weight: 800; padding: 8px 10px; }
      .leaflet-container { background: #eef2f7; }
    </style>
  </head>
  <body>
    <div id="map"><div class="fallback">Cargando mapa...</div></div>
    <script>
      window.__SC_PENDING_DATA = ${initialPayload};
      window.__SC_READY = false;
    </script>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
      (function () {
        var map;
        var incidentLayer;
        var operatorLayer;

        function postMessage(payload) {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify(payload));
          }
        }

        function makeIncidentIcon(color) {
          return L.divIcon({
            className: "",
            html: '<div class="incident-marker" style="background:' + (color || '${colors.info}') + '"></div>',
            iconSize: [22, 22],
            iconAnchor: [11, 11],
          });
        }

        function makeOperatorIcon() {
          return L.divIcon({
            className: "",
            html: '<div class="operator-marker"></div>',
            iconSize: [22, 22],
            iconAnchor: [11, 11],
          });
        }

        function popupContent(marker) {
          var root = document.createElement("div");
          var title = document.createElement("div");
          title.className = "popup-title";
          title.textContent = marker.title || "Incidente";
          root.appendChild(title);

          if (marker.description) {
            var description = document.createElement("div");
            description.className = "popup-description";
            description.textContent = marker.description;
            root.appendChild(description);
          }

          var action = document.createElement("button");
          action.className = "popup-action";
          action.textContent = "Ver incidente";
          action.onclick = function () {
            postMessage({ type: "markerPress", id: marker.id });
          };
          root.appendChild(action);
          return root;
        }

        function setInteractions(enabled) {
          var methods = [map.dragging, map.touchZoom, map.doubleClickZoom, map.scrollWheelZoom, map.boxZoom, map.keyboard];
          methods.forEach(function (method) {
            if (!method) return;
            enabled ? method.enable() : method.disable();
          });
          if (map.tap) {
            enabled ? map.tap.enable() : map.tap.disable();
          }
        }

        window.__SC_SET_MAP = function (data) {
          window.__SC_PENDING_DATA = data;
          if (!map || !data) return;

          map.setView([data.center.latitude, data.center.longitude], data.zoom || 16, { animate: true });
          setInteractions(Boolean(data.interactive));

          incidentLayer.clearLayers();
          (data.markers || []).forEach(function (marker) {
            L.marker([marker.coordinate.latitude, marker.coordinate.longitude], {
              icon: makeIncidentIcon(marker.color),
            }).bindPopup(popupContent(marker)).addTo(incidentLayer);
          });

          operatorLayer.clearLayers();
          if (data.operatorLocation) {
            L.marker([data.operatorLocation.latitude, data.operatorLocation.longitude], {
              icon: makeOperatorIcon(),
              interactive: false,
            }).addTo(operatorLayer);
          }
        };

        window.__SC_CENTER_ON = function (coords, zoom) {
          if (!map || !coords) return;
          map.setView([coords.latitude, coords.longitude], zoom || map.getZoom(), { animate: true });
        };

        function init() {
          var data = window.__SC_PENDING_DATA;
          map = L.map("map", {
            attributionControl: false,
            zoomControl: false,
          });
          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
          }).addTo(map);
          incidentLayer = L.layerGroup().addTo(map);
          operatorLayer = L.layerGroup().addTo(map);
          window.__SC_READY = true;
          window.__SC_SET_MAP(data);
          setTimeout(function () { map.invalidateSize(); }, 100);
          postMessage({ type: "ready" });
        }

        if (window.L) {
          init();
        } else {
          document.getElementById("map").innerHTML = '<div class="fallback">No se pudo cargar Leaflet.</div>';
        }
      })();
    </script>
  </body>
</html>`;
}

export const LeafletMap = forwardRef<LeafletMapHandle, LeafletMapProps>(function LeafletMap(
  {
    center,
    interactive = true,
    markers = [],
    onMarkerPress,
    operatorLocation = null,
    zoom = 16,
  },
  ref,
) {
  const webViewRef = useRef<WebView | null>(null);
  const payload = useMemo<LeafletPayload>(
    () => ({ center, interactive, markers, operatorLocation, zoom }),
    [center, interactive, markers, operatorLocation, zoom],
  );
  const html = useMemo(() => buildHtml(payload), []);

  const injectPayload = useCallback((nextPayload: LeafletPayload) => {
    const serialized = serializeForInlineScript(nextPayload);
    webViewRef.current?.injectJavaScript(
      `window.__SC_PENDING_DATA = ${serialized}; if (window.__SC_SET_MAP) window.__SC_SET_MAP(${serialized}); true;`,
    );
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      centerOn: (coords, nextZoom = zoom) => {
        const serialized = serializeForInlineScript(coords);
        webViewRef.current?.injectJavaScript(
          `if (window.__SC_CENTER_ON) window.__SC_CENTER_ON(${serialized}, ${nextZoom}); true;`,
        );
      },
    }),
    [zoom],
  );

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const message = JSON.parse(event.nativeEvent.data) as { type?: string; id?: string };
        if (message.type === "ready") {
          injectPayload(payload);
        }
        if (message.type === "markerPress" && message.id) {
          onMarkerPress?.(message.id);
        }
      } catch {
        // Ignore malformed messages from the embedded map document.
      }
    },
    [injectPayload, onMarkerPress, payload],
  );

  return (
    <WebView
      ref={webViewRef}
      allowFileAccess={false}
      allowsBackForwardNavigationGestures={false}
      domStorageEnabled={false}
      javaScriptEnabled
      onLoadEnd={() => injectPayload(payload)}
      onMessage={handleMessage}
      originWhitelist={["*"]}
      scrollEnabled={false}
      source={{ html }}
      style={styles.webView}
    />
  );
});

const styles = StyleSheet.create({
  webView: {
    backgroundColor: colors.background,
    flex: 1,
  },
});
