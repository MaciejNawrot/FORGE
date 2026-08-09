import { Card, Stack, Text } from '@acme/ui';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@acme/ui/web';
import { CreateUserForm } from '@/components/create-user-form';
import { getServerApiClient } from '@/lib/api-server';

export default async function UsersPage() {
  const apiClient = await getServerApiClient();
  const result = await apiClient.users.list({ query: { page: 1, pageSize: 20 } });
  const users = result.status === 200 ? result.body.items : [];

  return (
    <main className="mx-auto max-w-2xl p-6">
      <Stack gap="lg">
        <Text variant="heading">Users</Text>
        <CreateUserForm />
        <Card>
          {users.length === 0 ? (
            <Text tone="muted">No users yet.</Text>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>
                      <Text tone="muted" variant="caption">
                        {user.email}
                      </Text>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </Stack>
    </main>
  );
}
