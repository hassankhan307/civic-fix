/**
 * Calculates great-circle distance between two geographic coordinates using the Haversine formula.
 * Returns distance in meters.
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Returns a bounding box [minLat, maxLat, minLon, maxLon] around a center point for indexed SQL queries.
 */
export function calculateBoundingBox(
  lat: number,
  lon: number,
  radiusMeters: number
): { minLat: number; maxLat: number; minLon: number; maxLon: number } {
  const R = 6371e3;
  const deltaLat = (radiusMeters / R) * (180 / Math.PI);
  const deltaLon = (radiusMeters / (R * Math.cos((lat * Math.PI) / 180))) * (180 / Math.PI);

  return {
    minLat: lat - deltaLat,
    maxLat: lat + deltaLat,
    minLon: lon - deltaLon,
    maxLon: lon + deltaLon,
  };
}

/**
 * Computes Jaccard word-level similarity between two texts (0.0 to 1.0).
 */
export function calculateTextSimilarity(text1: string, text2: string): number {
  const tokenize = (t: string): Set<string> => {
    return new Set(
      t
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter((w) => w.length > 2)
    );
  };

  const set1 = tokenize(text1);
  const set2 = tokenize(text2);

  if (set1.size === 0 && set2.size === 0) return 1.0;
  if (set1.size === 0 || set2.size === 0) return 0.0;

  let intersectionCount = 0;
  set1.forEach((word) => {
    if (set2.has(word)) intersectionCount++;
  });

  const unionCount = set1.size + set2.size - intersectionCount;
  return unionCount === 0 ? 0 : Number((intersectionCount / unionCount).toFixed(3));
}
