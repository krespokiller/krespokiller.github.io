import type { Meta, StoryObj } from '@storybook/react';
import { AboutSection } from './AboutSection';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n';

const meta: Meta<typeof AboutSection> = {
  title: 'Organisms/AboutSection',
  component: AboutSection,
  decorators: [
    (Story) => (
      <I18nextProvider i18n={i18n}>
        <Story />
      </I18nextProvider>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#0C2604' },
        { name: 'light', value: '#F2F2F2' },
      ],
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
