export type TechnicalDocsCoverageMeterBucket = {
  id: string;
  value: number;
};

export type TechnicalDocsRepoQualityMeterSegmentId = 'covered' | 'partial' | 'open';

export type TechnicalDocsRepoQualityMeterSegment = {
  id: TechnicalDocsRepoQualityMeterSegmentId;
  label: string;
  value: number;
  percent: number;
};

const repoQualityMeterSegmentConfig: Array<{
  id: TechnicalDocsRepoQualityMeterSegmentId;
  label: string;
  bucketIds: string[];
}> = [
  { id: 'covered', label: 'Covered', bucketIds: ['covered'] },
  { id: 'partial', label: 'Partial', bucketIds: ['partial'] },
  { id: 'open', label: 'Open', bucketIds: ['missing', 'risk'] }
];

export function createRepoQualityMeterSegments(input: {
  buckets: TechnicalDocsCoverageMeterBucket[];
}): TechnicalDocsRepoQualityMeterSegment[] {
  const total = getCoverageBucketValue(input.buckets, 'total');
  const measuredTotal =
    total > 0
      ? total
      : repoQualityMeterSegmentConfig.reduce((sum, segment) => {
          return sum + segment.bucketIds.reduce((segmentSum, bucketId) => segmentSum + getCoverageBucketValue(input.buckets, bucketId), 0);
        }, 0);

  if (measuredTotal <= 0) {
    return [];
  }

  return repoQualityMeterSegmentConfig.map((segment) => {
    const value = segment.bucketIds.reduce((sum, bucketId) => sum + getCoverageBucketValue(input.buckets, bucketId), 0);

    return {
      id: segment.id,
      label: segment.label,
      value,
      percent: (value / measuredTotal) * 100
    };
  });
}

export function formatRepoQualityMeterSegmentStyle(segment: Pick<TechnicalDocsRepoQualityMeterSegment, 'percent'>): string {
  return `--repo-quality-segment-width: ${formatMeterPercent(segment.percent)}%`;
}

export function formatRepoQualityMeterSummary(segments: TechnicalDocsRepoQualityMeterSegment[]): string {
  if (segments.length === 0) {
    return '';
  }

  return segments
    .map((segment) => `${segment.label.toLowerCase()} ${segment.value} (${formatMeterPercent(segment.percent)}%)`)
    .join(', ');
}

function getCoverageBucketValue(buckets: TechnicalDocsCoverageMeterBucket[], bucketId: string): number {
  return buckets.find((bucket) => bucket.id === bucketId)?.value ?? 0;
}

function formatMeterPercent(percent: number): string {
  const boundedPercent = Math.max(0, Math.min(100, percent));

  if (Number.isInteger(boundedPercent)) {
    return `${boundedPercent}`;
  }

  return boundedPercent.toFixed(1);
}
