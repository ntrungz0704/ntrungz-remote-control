// ============================================================================
// FAST-SHIP-HUB — GEOSPATIAL UTILITIES
// Haversine Distance Calculation, ETA Estimation & Polyline Generation
// ============================================================================

/**
 * Tính khoảng cách đường chim bay giữa hai tọa độ WGS84 theo công thức Haversine (đơn vị km)
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Bán kính Trái Đất (km)
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const straightDistance = R * c;

  // Hệ số đường bộ nội đô thực tế (Manhattan / Đường quanh co tại VN x 1.25)
  const roadDistanceKm = straightDistance * 1.25;

  return Math.round(roadDistanceKm * 10) / 10;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Ước tính thời gian giao hàng đường bộ (phút) dựa trên khoảng cách và loại phương tiện
 * Vận tốc trung bình nội đô Hà Nội & TP.HCM: 20 km/h (Bike)
 */
export function estimateDeliveryMinutes(distanceKm: number): number {
  const averageSpeedKmH = 20;
  const transitMinutes = (distanceKm / averageSpeedKmH) * 60;
  // Tối thiểu 5 phút di chuyển
  return Math.max(5, Math.round(transitMinutes));
}

/**
 * Tạo một chuỗi polyline mô phỏng lộ trình tuyến đường giữa điểm đi và điểm đến
 */
export function generateMockPolyline(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  steps = 5
): string {
  // Sinh danh sách tọa độ nội suy giữa 2 điểm
  const points: Array<[number, number]> = [];
  for (let i = 0; i <= steps; i++) {
    const fraction = i / steps;
    // Thêm một chút dao động nhẹ để mô phỏng khúc cua đường phố
    const curveOffset = Math.sin(fraction * Math.PI) * 0.0015;
    const lat = lat1 + (lat2 - lat1) * fraction + curveOffset;
    const lng = lng1 + (lng2 - lng1) * fraction - curveOffset * 0.5;
    points.push([lat, lng]);
  }

  // Mã hóa polyline cơ bản (hoặc trả về dạng GeoJSON coordinate sequence)
  return JSON.stringify(points);
}

/**
 * Trợ giúp tổng hợp thông tin lộ trình
 */
export function calculateRouteInfo(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const distanceKm = calculateHaversineDistanceKm(lat1, lon1, lat2, lon2);
  const distanceMeters = Math.round(distanceKm * 1000);
  const durationMinutes = estimateDeliveryMinutes(distanceKm);
  const durationSeconds = durationMinutes * 60;
  const polyline = generateMockPolyline(lat1, lon1, lat2, lon2);

  return {
    distanceKm,
    distanceMeters,
    durationMinutes,
    durationSeconds,
    polyline,
  };
}
