import { CreateUserForm } from '@/components/create-user-form';
import { getServerApiClient } from '@/lib/api-server';

export default async function UsersPage() {
  const apiClient = await getServerApiClient();
  const result = await apiClient.users.list({ query: { page: 1, pageSize: 20 } });
  const users = result.status === 200 ? result.body.items : [];

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <h1 className="text-xl font-semibold">Users</h1>
      <CreateUserForm />
      <ul className="flex flex-col gap-2">
        {users.map((user) => (
          <li key={user.id} className="border-border rounded-md border p-3">
            <p className="font-medium">{user.name}</p>
            <p className="text-muted-foreground text-sm">{user.email}</p>
          </li>
        ))}
        {users.length === 0 && <p className="text-muted-foreground">No users yet.</p>}
      </ul>
    </main>
  );
}
