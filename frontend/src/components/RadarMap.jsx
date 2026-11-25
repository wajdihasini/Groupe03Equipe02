import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const pin = (cls, label = "") => L.divIcon({ className: "", html: `<div class="map-pin ${cls}"><span>${label}</span></div>`, iconSize: [34, 42], iconAnchor: [17, 40] });
const dot = L.divIcon({ className: "", html: '<div class="map-me"></div>', iconSize: [20, 20], iconAnchor: [10, 10] });

// Carte OpenStreetMap (Leaflet). Sert au Campus Radar (liste de commerces) et au choix de position d'un commerce (onPick).
export default function RadarMap({ center, shops = [], user = null, radiusKm = 0, selectedId = null, onSelect, onPick, picked = null, zoom = 14 }) {
  const el = useRef(null), map = useRef(null), layer = useRef(null), cb = useRef({});
  cb.current = { onSelect, onPick };
  useEffect(() => {
    const m = L.map(el.current, { scrollWheelZoom: false }).setView([center.lat, center.lng], zoom);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(m);
    layer.current = L.layerGroup().addTo(m); map.current = m;
    m.on("focus", () => m.scrollWheelZoom.enable()); m.on("blur", () => m.scrollWheelZoom.disable());
    m.on("click", (e) => cb.current.onPick?.(+e.latlng.lat.toFixed(6), +e.latlng.lng.toFixed(6)));
    return () => m.remove();
  }, []);
  useEffect(() => { // marqueurs
    const g = layer.current; g.clearLayers();
    shops.filter(s => s.lat != null && s.lng != null).forEach(s => {
      const mk = L.marker([s.lat, s.lng], { icon: pin(s.id === selectedId ? "sel" : "", s.offersCount ?? ""), keyboard: true }).addTo(g);
      const tip = document.createElement("div"); tip.textContent = s.name; mk.bindTooltip(tip, { direction: "top", offset: [0, -34] }); // textContent : pas d'injection HTML
      mk.on("click", (e) => { L.DomEvent.stopPropagation(e); cb.current.onSelect?.(s.id); });
    });
    if (user) { L.marker([user.lat, user.lng], { icon: dot, interactive: false }).addTo(g); if (radiusKm) L.circle([user.lat, user.lng], { radius: radiusKm * 1000, color: "#059669", weight: 2, fillColor: "#059669", fillOpacity: 0.08 }).addTo(g); }
    if (picked) L.marker([picked.lat, picked.lng], { icon: pin("sel", "•") }).addTo(g);
  }, [shops, user, radiusKm, selectedId, picked]);
  useEffect(() => { // cadrage
    const m = map.current; if (!m) return;
    if (user && radiusKm) m.fitBounds(L.latLng(user.lat, user.lng).toBounds(radiusKm * 2000), { padding: [20, 20] });
    else if (user) m.setView([user.lat, user.lng], 15);
  }, [user?.lat, user?.lng, radiusKm]);
  useEffect(() => { const s = shops.find(x => x.id === selectedId); if (s && s.lat != null) map.current.panTo([s.lat, s.lng]); }, [selectedId]);
  useEffect(() => { if (picked) map.current.panTo([picked.lat, picked.lng]); }, [picked?.lat, picked?.lng]);
  return <div ref={el} className="radar-map" role="application" aria-label="Carte des commerces" />;
}
