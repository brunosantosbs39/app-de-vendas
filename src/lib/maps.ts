
/**
 * Serviço de Mapas e Geocodificação usando Nominatim (OpenStreetMap)
 */

export interface GeocodeResult {
  lat: number;
  lng: number;
  display_name: string;
}

export const mapsService = {
  /**
   * Converte um endereço em coordenadas geográficas
   */
  async geocodeAddress(address: string): Promise<GeocodeResult | null> {
    if (!address) return null;

    try {
      // Nominatim exige um User-Agent. Usaremos um genérico para o app.
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'SynkraAIOX-AppVendas'
        }
      });

      if (!response.ok) {
        throw new Error('Falha na resposta do serviço de geocodificação');
      }

      const data = await response.json();

      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          display_name: data[0].display_name
        };
      }

      return null;
    } catch (error) {
      console.error('Erro ao geocodificar endereço:', error);
      return null;
    }
  },

  /**
   * Calcula a distância em km entre dois pontos usando a fórmula de Haversine
   */
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Raio da Terra em km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  /**
   * Ordena uma lista de destinos com base no "Vizinho Mais Próximo"
   */
  optimizeRoute(origin: { lat: number, lng: number }, destinations: any[]): any[] {
    const unvisited = [...destinations.filter(d => d.latitude && d.longitude)];
    const route: any[] = [];
    let currentPoint = origin;

    while (unvisited.length > 0) {
      let closestIndex = 0;
      let minDistance = Infinity;

      for (let i = 0; i < unvisited.length; i++) {
        const dist = this.calculateDistance(
          currentPoint.lat, currentPoint.lng,
          unvisited[i].latitude, unvisited[i].longitude
        );
        if (dist < minDistance) {
          minDistance = dist;
          closestIndex = i;
        }
      }

      const closest = unvisited.splice(closestIndex, 1)[0];
      route.push(closest);
      currentPoint = { lat: closest.latitude, lng: closest.longitude };
    }

    return route;
  }
};
