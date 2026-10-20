import { Box, Typography } from '@mui/material';

const team = [
  {
    name: 'Ben',
    role: 'Lifecycle & Campaign Data Analyst',
    image: '/assets/agent-avatar-ben-v2.png',
    className: 'ben',
  },
  {
    name: 'Nova',
    role: 'Campaign & Journey Creator',
    image: '/assets/agent-avatar-nova-v2.png',
    className: 'nova',
  },
  {
    name: 'Anna',
    role: 'Cross-Sell & Marketing Expert',
    image: '/assets/agent-avatar-anna-v3.png',
    className: 'anna',
  },
];

export default function HeroTeamNetwork() {
  return (
    <Box className="hero-team-network" aria-label="Meet your AI marketing team">
      <Box className="hero-team-heading">
        <Typography component="p" className="hero-team-eyebrow hero-push-accent">Meet the AI team</Typography>
      </Box>

      <svg className="hero-team-connectors" viewBox="0 0 600 470" aria-hidden="true">
        <path className="hero-team-line hero-team-line-ben" d="M300 108 L105 330" />
        <path className="hero-team-line hero-team-line-nova" d="M300 108 L300 365" />
        <path className="hero-team-line hero-team-line-anna" d="M300 108 L495 330" />
        <path className="hero-team-pulse hero-team-pulse-ben" d="M300 108 L105 330" />
        <path className="hero-team-pulse hero-team-pulse-nova" d="M300 108 L300 365" />
        <path className="hero-team-pulse hero-team-pulse-anna" d="M300 108 L495 330" />
      </svg>

      <Box className="hero-team-max hero-team-node">
        <Typography component="p" className="hero-team-name">Max</Typography>
        <Typography component="p" className="hero-team-role">Growth Concierge</Typography>
        <Box className="hero-team-avatar hero-team-avatar-max">
          <Box component="img" src="/assets/agent-avatar-max-v2.png" alt="Max" />
        </Box>
      </Box>

      {team.map((agent) => (
        <Box key={agent.name} className={`hero-team-agent hero-team-node ${agent.className}`}>
          <Box className="hero-team-avatar">
            <Box component="img" src={agent.image} alt={agent.name} />
          </Box>
          <Typography component="p" className="hero-team-name">{agent.name}</Typography>
          <Typography component="p" className="hero-team-role">{agent.role}</Typography>
        </Box>
      ))}
    </Box>
  );
}
