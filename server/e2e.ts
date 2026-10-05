import { Store } from './store';
import { createApi } from './http';

const store = new Store(':memory:');
const password = 'e2e-test-password-123';
for (const [role, login] of [['student', 'student1'], ['staff', 'staff1'], ['admin', 'admin']] as const) {
  await store.createAccount({ login, name: `${role} Test`, email: `${login}@example.test`, password }, role);
}
const server = createApi(store);
server.listen(0, '127.0.0.1', () => {
  const address = server.address();
  if (address && typeof address !== 'string') console.log(`TEST_PORT=${address.port}`);
});
process.stdin.resume();
process.stdin.on('end', () => server.close(() => { store.close(); process.exit(0); }));
