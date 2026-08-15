import { Card, Stack, Text } from '@acme/ui';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@acme/ui/web';
import { CreateUserForm } from '@/components/create-user-form';
import { getServerApiClient } from '@/shared/api';
import { getServerDictionary } from '@/shared/i18n/server';

export default async function UsersPage() {
  const dict = await getServerDictionary();
  const apiClient = await getServerApiClient();
  const result = await apiClient.users.list({ query: { page: 1, pageSize: 20 } });
  const users = result.status === 200 ? result.body.items : [];

  return (
    <main className="mx-auto max-w-2xl p-6">
      <Stack gap="lg">
        <Text variant="heading">{dict.users.title}</Text>
        <CreateUserForm />
        <Card>
          {users.length === 0 ? (
            <Text tone="muted">{dict.users.empty}</Text>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{dict.common.personName}</TableHead>
                  <TableHead>{dict.common.email}</TableHead>
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
