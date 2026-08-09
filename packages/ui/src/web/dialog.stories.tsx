import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../primitives/button';
import { Stack } from '../primitives/stack';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from './dialog';

const meta = {
  title: 'Web/Dialog',
  component: Dialog,
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open dialog</Button>
      </DialogTrigger>
      <DialogContent>
        <Stack gap="md">
          <Stack gap="sm">
            <DialogTitle>Delete user</DialogTitle>
            <DialogDescription>
              This is a web-only component — it lives behind the @acme/ui/web entrypoint because
              Radix depends on the DOM.
            </DialogDescription>
          </Stack>
          <Stack direction="row" gap="sm" justify="end">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <DialogClose asChild>
              <Button variant="destructive">Delete</Button>
            </DialogClose>
          </Stack>
        </Stack>
      </DialogContent>
    </Dialog>
  ),
};
