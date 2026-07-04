// Elevation presets — Android `elevation` + iOS shadow in one object.
const make = (elevation, opacity, r, h) => ({
  elevation,
  shadowColor: '#171029',
  shadowOpacity: opacity,
  shadowRadius: r,
  shadowOffset: { width: 0, height: h },
});

export const elevationPresets = {
  none: make(0, 0, 0, 0),
  card: make(2, 0.06, 8, 2),
  raised: make(5, 0.1, 14, 5),
  sheet: make(12, 0.16, 24, 8),
  fab: make(8, 0.22, 16, 6),
};
