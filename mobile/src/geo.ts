type Coordinates = { lat: number; lng: number };
export function distanceMetersBetween(a: Coordinates, b: Coordinates) {
  const values = [a.lat, a.lng, b.lat, b.lng];
  if (
    values.some((value) => !Number.isFinite(value)) ||
    Math.abs(a.lat) > 90 ||
    Math.abs(b.lat) > 90 ||
    Math.abs(a.lng) > 180 ||
    Math.abs(b.lng) > 180
  )
    return Infinity;
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const lat = radians(b.lat - a.lat);
  const lng = radians(b.lng - a.lng);
  const h =
    Math.sin(lat / 2) ** 2 +
    Math.cos(radians(a.lat)) *
      Math.cos(radians(b.lat)) *
      Math.sin(lng / 2) ** 2;
  return (
    6371000 *
    2 *
    Math.atan2(Math.sqrt(Math.min(1, h)), Math.sqrt(Math.max(0, 1 - h)))
  );
}
export function nearDestination<T extends Coordinates>(
  origin: Coordinates,
  places: T[],
  radius = 20000,
) {
  return places
    .map((place) => ({
      ...place,
      distanceMeters: Math.round(distanceMetersBetween(origin, place)),
    }))
    .filter((place) => place.distanceMeters <= radius)
    .sort((a, b) => a.distanceMeters - b.distanceMeters);
}
