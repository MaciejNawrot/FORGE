import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Switch } from './switch';

const meta = {
  title: 'Primitives/Switch',
  component: Switch,
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Controlled: Story = {
  render: () => {
    function Demo() {
      const [checked, setChecked] = useState(true);
      return (
        <label htmlFor="warmup-sets" className="flex items-center gap-3">
          <Switch id="warmup-sets" checked={checked} onCheckedChange={setChecked} />
          <span>Warmup Sets</span>
        </label>
      );
    }
    return <Demo />;
  },
};

export const Uncontrolled: Story = {
  render: () => (
    <label htmlFor="auto-rest" className="flex items-center gap-3">
      <Switch id="auto-rest" defaultChecked={false} />
      <span>Auto-Rest</span>
    </label>
  ),
};
