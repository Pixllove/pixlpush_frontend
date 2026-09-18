export type ProjectId = 'PixlTrace' | 'PixlLove';

export type ProjectContext = {
  id: ProjectId;
  name: string;
  plan: string;
  eyebrow: string;
  description: string;
  metrics: {
    reachable: string;
    engaged: string;
    activation: string;
    pushOpen: string;
    events: string;
    reachRate: string;
    reachableChange: string;
    engagedChange: string;
    activationChange: string;
    pushChange: string;
    eventsChange: string;
  };
};

export const projects: Record<ProjectId, ProjectContext> = {
  PixlTrace: {
    id: 'PixlTrace', name: 'PixlTrace', plan: 'Pro project', eyebrow: 'AR drawing app', description: 'PixlTrace is healthy and your retention motion is trending up.',
    metrics: { reachable: '42,320', engaged: '18,846', activation: '68.4%', pushOpen: '32.6%', events: '1.24M', reachRate: '86.5%', reachableChange: '12.4%', engagedChange: '8.7%', activationChange: '5.8%', pushChange: '9.4%', eventsChange: '18.2%' },
  },
  PixlLove: {
    id: 'PixlLove', name: 'PixlLove', plan: 'Internal project', eyebrow: 'Dating app', description: 'PixlLove is healthy with strong engagement across active lifecycle journeys.',
    metrics: { reachable: '128,904', engaged: '56,218', activation: '74.2%', pushOpen: '38.9%', events: '3.82M', reachRate: '91.8%', reachableChange: '18.1%', engagedChange: '14.6%', activationChange: '7.2%', pushChange: '11.8%', eventsChange: '24.4%' },
  },
};
