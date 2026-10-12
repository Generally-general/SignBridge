// Small, dependency-free geometry helpers shared by the Spatial Touch state
// machine. Kept separate from the hook so they're trivially unit-testable on
// their own (pure functions, no React).

// Accepts either a [x, y, z] MediaPipe landmark array or a { x, y } object
// (the state machine uses both representations in different places).
function coords(point) {
  return Array.isArray(point) ? [point[0], point[1]] : [point.x, point.y];
}

export function distance2D(a, b) {
  const [ax, ay] = coords(a);
  const [bx, by] = coords(b);
  return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
}

// Same normalization basis gesture.py already uses (index_mcp to pinky_mcp),
// kept consistent so Spatial Touch's pinch threshold is comparable to the
// backend gesture classifier's own pinch check.
export function palmWidth(indexMcp, pinkyMcp) {
  return distance2D(indexMcp, pinkyMcp);
}