import type { Meta, StoryObj } from '@storybook/react-vite';
import { MiniBarGraph } from './bar-graph';

const meta = {
  title: 'Primitives/MiniBarGraph',
  component: MiniBarGraph,
} satisfies Meta<typeof MiniBarGraph>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { values: [40, 60, 30, 80, 100, 50, 70], highlightIndex: 4 },
  render: () => <MiniBarGraph values={[40, 60, 30, 80, 100, 50, 70]} highlightIndex={4} />,
};
