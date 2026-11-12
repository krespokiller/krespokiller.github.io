import type { Meta, StoryObj } from '@storybook/react';
import { ExperienceItem } from './ExperienceItem';

const meta: Meta<typeof ExperienceItem> = {
  title: 'Molecules/ExperienceItem',
  component: ExperienceItem,
  parameters: {
    layout: 'padded',
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#0C2604' },
        { name: 'light', value: '#F2F2F2' },
      ],
    },
  },
  tags: ['autodocs'],
  argTypes: {
    company: {
      control: { type: 'text' },
    },
    role: {
      control: { type: 'text' },
    },
    dates: {
      control: { type: 'text' },
    },
    note: {
      control: { type: 'text' },
    },
    location: {
      control: { type: 'text' },
    },
    description: {
      control: { type: 'object' },
    },
    tags: {
      control: { type: 'object' },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    company: 'Galgo',
    role: 'Software Engineer',
    dates: 'Dec 2023 – Sep 2025',
    location: 'Remote',
    description: [
      'Worked on the Checkout and Risk teams building NestJS backend services, a backend-for-frontend (BFF) layer, and Next.js interfaces on event-driven microservices in AWS.',
      'Maintained systems on the critical path of checkout and risk evaluation, with incidents handled through PagerDuty.',
      'Managed cloud infrastructure, observability, and deployment pipelines using Terraform, Datadog, GitHub Actions, and AWS.',
    ],
    tags: ['NestJS', 'Next.js', 'AWS', 'Event-driven', 'Terraform', 'Datadog'],
  },
};

export const LongEntry: Story = {
  args: {
    company: 'Loopay',
    role: 'Tech Lead',
    dates: 'Oct 2025 – Nov 2026',
    location: 'Remote',
    description: [
      'Led a team of 5 engineers on SOBERANA, a multi-tenant cross-border treasury and payments platform for fintech companies, owning architecture decisions, code reviews, and production support.',
      'Led the AWS-to-Azure migration with the CTO, rebuilding the infrastructure in Terraform: Container Apps, Static Web Apps, PostgreSQL Flexible Server, Key Vault, and managed identities.',
      'Built CI/CD on GitHub Actions with OIDC (no stored cloud credentials), ephemeral environments per pull request, and releases by version tag.',
    ],
    tags: ['NestJS', 'React', 'PostgreSQL', 'Azure', 'Terraform', 'GitHub Actions', 'Docker'],
  },
};

export const CompactEntry: Story = {
  args: {
    company: 'Trebet',
    role: 'Co-founder & Software Engineer',
    dates: 'Sep 2024 – Nov 2025',
    note: 'Parallel project, concurrent with Galgo',
    location: 'Bogotá, Colombia',
    description: [
      'Co-founded a startup and took a digital-intercom mobile app from MVP to production in about a month, working in a remote team of 7 across Colombia, Mexico, and Venezuela.',
      'Built the mobile app and backend with React Native, Laravel, WebRTC with a TURN server, and WebSockets, and kept releasing until a pilot with a test community.',
    ],
    tags: ['React Native', 'Laravel', 'WebRTC', 'WebSockets', 'DigitalOcean'],
  },
};
