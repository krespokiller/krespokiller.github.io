import type { Meta, StoryObj } from '@storybook/react';
import { SelectedWork } from './SelectedWork';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n';

const meta: Meta<typeof SelectedWork> = {
  title: 'Organisms/SelectedWork',
  component: SelectedWork,
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
      default: 'light',
      values: [
        { name: 'light', value: '#FAF8F3' },
        { name: 'dark', value: '#0C0A09' },
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

// Each theme story forces the matching data-theme so the CSS vars
// (card surfaces, borders, amber accents) resolve for that mode.
export const LightTheme: Story = {
  args: {},
  decorators: [
    (Story) => (
      <div data-theme="light" style={{ background: 'var(--bg)', minHeight: '100vh' }}>
        <Story />
      </div>
    ),
  ],
};

export const DarkTheme: Story = {
  args: {},
  decorators: [
    (Story) => (
      <div data-theme="dark" style={{ background: 'var(--bg)', minHeight: '100vh' }}>
        <Story />
      </div>
    ),
  ],
};
