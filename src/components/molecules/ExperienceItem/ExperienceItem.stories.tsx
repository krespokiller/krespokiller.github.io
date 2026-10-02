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
      'Checkout BFF: transactional microservices under a Backend-for-Frontend architecture with Next.js and NestJS, integrating MongoDB for high-speed session data storage.',
      'Financial risk systems (EDA): event-driven microservices on AWS, integrating decision engines with Taktile and operational UI panels with Retool.',
      'Cloud operations: Terraform Infrastructure as Code managed through env0, Datadog telemetry, Amplitude user analytics, HubSpot lead integrations, and CI/CD pipelines on GitHub Actions targeting AWS.',
    ],
    tags: ['Next.js', 'NestJS', 'MongoDB', 'AWS', 'Terraform', 'env0', 'Datadog', 'Amplitude', 'HubSpot', 'GitHub Actions'],
  },
};

export const CurrentPosition: Story = {
  args: {
    company: 'Loopay',
    role: 'Senior Software Engineer',
    dates: 'Oct 2025 – Present',
    location: 'Remote',
    index: 1,
    description: [
      'End-to-end product delivery: full-stack architecture for Soberana (React/Vite frontend, NestJS backend, optimized PostgreSQL schemas, AWS ECS + GCP hosting, Route 53, GitHub Actions CI/CD) and Loopay FX, a foreign exchange intermediation platform built from scratch with Python (Django) and PostgreSQL/AWS Aurora.',
      'Scalable architecture & AI-driven workflow: multi-tenant NestJS design with Strategy and Adapter patterns for decoupled payment-gateway integrations, plus daily Spec-Driven Development (SDD) with Opencode and Engram to accelerate delivery, automate repetitive tasks, and enforce modularity.',
      'DevOps & technical leadership: Terraform Infrastructure as Code, OneUptime observability, AWS CloudTrail security audits, GitHub Actions automation, production incident resolution, SOLID refactoring of legacy code, and thorough code reviews.',
    ],
    tags: ['NestJS', 'React', 'Vite', 'PostgreSQL', 'AWS ECS', 'GCP', 'Route 53', 'Terraform', 'Django', 'Aurora', 'GitHub Actions', 'SDD', 'OneUptime'],
  },
};

export const CompactEntry: Story = {
  args: {
    company: 'Loopay',
    role: 'Full Stack Developer',
    dates: 'Jan 2023 – 2024',
    location: 'Remote',
    index: 2,
    description: [
      'Full-stack development of the main platform on RedwoodJS: interactive React UI and server-side Node.js logic.',
      'Optimized data access via GraphQL and Prisma ORM.',
      'CI/CD setup and maintenance with GitHub Actions for automated deployment and integration workflows.',
    ],
    tags: ['RedwoodJS', 'React', 'GraphQL', 'Prisma', 'Node.js', 'GitHub Actions'],
  },
};
