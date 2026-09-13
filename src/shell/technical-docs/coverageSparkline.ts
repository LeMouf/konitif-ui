export type CoverageSparklinePoint = {
  x: string;
  y: string;
  value: number;
};

export function createCoverageSparklinePoints(values: number[]): CoverageSparklinePoint[] {
  const width = 52;
  const height = 16;
  const padding = 2;

  if (values.length === 0) {
    return [];
  }

  if (values.length === 1) {
    return [{ x: (width / 2).toFixed(1), y: (height / 2).toFixed(1), value: values[0] ?? 0 }];
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const availableWidth = width - padding * 2;
  const availableHeight = height - padding * 2;

  return values.map((value, index) => {
    const x = padding + (index / (values.length - 1)) * availableWidth;
    const y = range === 0 ? height / 2 : padding + (1 - (value - min) / range) * availableHeight;

    return { x: x.toFixed(1), y: y.toFixed(1), value };
  });
}

export function formatCoverageSparklinePoints(points: CoverageSparklinePoint[]): string {
  return points.map((point) => `${point.x},${point.y}`).join(' ');
}
