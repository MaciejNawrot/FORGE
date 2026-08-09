import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './button';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Input } from './input';
import { Stack } from './stack';
import { Text } from './text';

const meta = {
  title: 'Primitives/Card',
  component: Card,
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card className="max-w-sm">
      <CardHeader>
        <CardTitle>Create a user</CardTitle>
        <Text variant="caption" tone="muted">
          Composed entirely from cross-platform primitives.
        </Text>
      </CardHeader>
      <CardContent>
        <Stack gap="sm">
          <Input placeholder="Name" />
          <Input placeholder="you@example.com" type="email" />
          <Button>Add user</Button>
        </Stack>
      </CardContent>
    </Card>
  ),
};
