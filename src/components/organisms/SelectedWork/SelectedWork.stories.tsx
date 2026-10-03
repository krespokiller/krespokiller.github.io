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
      default: 'dark',
      values: [{ name: 'dark', value: '#0C0A09' }],
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
