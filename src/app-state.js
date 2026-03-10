export function createInitialState() {
  return {
    selectedTool: 'fish',
    selectedTunnelOrientation: 'horizontal',
    phase: 'build',
    facilities: [],
    tunnelBuffer: null,
    sim: null,
    plannedFlow: null,
    loopHandle: null,
    speedMultiplier: 1,
    tickMs: 450,
  };
}

export const TOOLS = [
  { id: 'fish', label: 'Fish Bowl' },
  { id: 'bed', label: 'Cat Bed' },
  { id: 'laser', label: 'Laser Pointer' },
  { id: 'tunnel', label: 'Cardboard Tunnel' },
  { id: 'erase', label: 'Erase' },
];
