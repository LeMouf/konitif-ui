export type ExperienceLoadingStep = {
    label: string;
    status: 'pending' | 'running' | 'ready' | 'failed';
    detail?: string;
    duration?: number;
    startedAt?: number;
  };
