"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Configuração de ícones customizados
const createIcon = (color: string) => new L.Icon({
  iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const userIcon = createIcon('blue');
const stopIcon = createIcon('green');

interface RealTimeRouteMapProps {
  userLocation: { lat: number; lng: number } | null;
  route: any[];
}

// Componente para ajustar o zoom do mapa conforme os pontos mudam
function ChangeView({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

export default function RealTimeRouteMap({ userLocation, route }: RealTimeRouteMapProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted || !userLocation) {
    return (
      <div className="h-[400px] w-full bg-[#1A1A1A] rounded-[2.5rem] flex items-center justify-center border border-white/5">
        <p className="text-slate-500 font-black uppercase text-[10px] tracking-widest animate-pulse">
          Aguardando sinal do GPS...
        </p>
      </div>
    );
  }

  const polylinePositions: [number, number][] = [
    [userLocation.lat, userLocation.lng],
    ...route.map(p => [p.latitude, p.longitude] as [number, number])
  ];

  return (
    <div className="h-[400px] w-full bg-[#1A1A1A] rounded-[2.5rem] overflow-hidden border border-white/5 relative z-0">
      <MapContainer 
        center={[userLocation.lat, userLocation.lng]} 
        zoom={13} 
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <ChangeView center={[userLocation.lat, userLocation.lng]} zoom={13} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          // Estilo dark mode para o mapa (usando filtros CSS no container do mapa)
        />
        
        {/* Marcador do Usuário */}
        <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
          <Popup>Você está aqui</Popup>
        </Marker>

        {/* Marcadores das Paradas */}
        {route.map((point, idx) => (
          <Marker 
            key={point.id || idx} 
            position={[point.latitude, point.longitude]} 
            icon={stopIcon}
          >
            <Popup>
              <div className="font-bold text-xs uppercase tracking-tighter">
                Parada {idx + 1}: {point.name}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Linha da Rota */}
        <Polyline positions={polylinePositions} color="#5DD62C" weight={4} opacity={0.6} dashArray="10, 10" />
      </MapContainer>
    </div>
  );
}
