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
    index: {
      control: { type: 'number' },
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
    index: 0,
    description: [
      'Developed backend services for checkout, lending, and risk evaluation processing 1,000+ daily leads using NestJS, AWS, and event-driven microservices.',
      'Reduced risk evaluation latency from minutes to seconds by optimizing the event-driven microservices architecture and query performance.',
      'Built 2 new microservices and maintained 4–5 existing services across the checkout, lending, and risk pipelines.',
      'Managed cloud infrastructure, observability, and deployment pipelines using Terraform, Datadog, GitHub Actions, and AWS.',
    ],
    tags: ['NestJS', 'AWS', 'Event-driven', 'Terraform', 'Datadog'],
  },
};

export const CurrentPosition: Story = {
  args: {
    company: 'Loopay',
    role: 'Tech Lead',
    dates: 'Oct 2025 – Present',
    location: 'Remote',
    index: 1,
    description: [
      'Led a team of 5 engineers building cloud-native fintech platforms, owning architecture decisions, code reviews, and production support with NestJS, React, PostgreSQL, AWS ECS, and Terraform.',
      'Scaled payment infrastructure processing $1M+ in daily transaction volume for 100+ active merchants, with multi-tenant backend services and payment-gateway integrations.',
      'Built SOBERANA, the deploy monorepo that orchestrates Loopay Suite\'s production infrastructure: Terraform IaC for AWS (S3, Lambda, Secrets Manager, ECR), CI/CD pipelines with GitHub Actions, and local development with Docker.',
    ],
    tags: ['NestJS', 'React', 'PostgreSQL', 'AWS ECS', 'Terraform', 'Google Gemini', 'GitHub Actions', 'Docker'],
  },
};

export const CompactEntry: Story = {
  args: {
    company: 'Trebet',
    role: 'Co-founder & Lead Engineer',
    dates: 'Sep 2024 – Sep 2025',
    note: 'Parallel project, concurrent with Galgo',
    location: 'Bogotá, Colombia',
    index: 2,
    description: [
      'Co-founded a startup and led a team of 6 engineers, owning every technical decision from architecture to production.',
      'Launched a real-time communication platform from MVP to production in 1 month, building the mobile app, backend services, and CI/CD with React Native, Laravel, WebRTC, WebSockets, and DigitalOcean.',
    ],
    tags: ['React Native', 'Laravel', 'WebRTC', 'WebSockets', 'DigitalOcean'],
  },
};
