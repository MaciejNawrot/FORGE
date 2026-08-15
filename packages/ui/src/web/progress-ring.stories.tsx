import type { Meta, StoryObj } from '@storybook/react-vite';
import { ProgressRing } from './progress-ring';

const meta = {
  title: 'Web/ProgressRing',
  component: ProgressRing,
} satisfies Meta<typeof ProgressRing>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WorkoutProgress: Story = {
  args: { percent: 66, glow: true },
  render: () => (
    <ProgressRing percent={66} glow>
      <span className="text-primary text-sm">66%</span>
    </ProgressRing>
  ),
};

export const RestTimer: Story = {
  args: { percent: 45, size: 128, tone: 'warning', glow: true },
  render: () => (
    <ProgressRing percent={45} size={128} tone="warning" glow>
      <span className="text-primary text-lg">0:45</span>
    </ProgressRing>
  ),
};
