export interface StereoAudioMeterValue {
  left: number;
  right: number;
  peakDb: number;
}

export const SILENT_STEREO_AUDIO_METER: Readonly<StereoAudioMeterValue> = {
  left: 0,
  right: 0,
  peakDb: -90
};

export function clampStereoAudioLevel(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
}

export function normalizeStereoAudioMeter(meter: StereoAudioMeterValue | undefined): StereoAudioMeterValue {
  if (!meter) return { ...SILENT_STEREO_AUDIO_METER };
  return {
    left: clampStereoAudioLevel(meter.left),
    right: clampStereoAudioLevel(meter.right),
    peakDb: Number.isFinite(meter.peakDb) ? Math.max(-90, Math.min(6, meter.peakDb)) : -90
  };
}

export function formatStereoAudioLevelPercent(value: number): string {
  return `${Math.round(clampStereoAudioLevel(value) * 100)}%`;
}

export function formatStereoAudioPeakDb(value: number): string {
  if (!Number.isFinite(value) || value <= -89.5) return '-90.0 dB';
  return `${Math.max(-90, Math.min(6, value)).toFixed(1)} dB`;
}
