import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from './badge';

const meta = {
  title: 'Primitives/Badge',
  component: Badge,
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Badge tone="primary">PR Alert</Badge>
      <Badge tone="warning">Recovery Mode</Badge>
      <Badge tone="destructive">High Intensity</Badge>
      <Badge tone="neutral">Completed</Badge>
      <Badge tone="muted">Scheduled</Badge>
    </div>
  ),
};
