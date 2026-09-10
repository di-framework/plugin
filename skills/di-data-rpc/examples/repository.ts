import assert from 'node:assert/strict';
import { Container } from '@di-framework/core';
import { InMemoryRepository } from '@di-framework/repo';

interface User { id: number; name: string }
class UserRepository extends InMemoryRepository<User, number> {}
class UserService {
  constructor(readonly users: UserRepository) {}
  async rename(id: number, name: string) {
    const user = await this.users.findById(id);
    if (!user) throw new Error('User not found');
    return this.users.save({ ...user, name });
  }
}
const container = new Container();
container.register(UserRepository);
container.registerFactory(UserService, () => new UserService(container.resolve(UserRepository)));
const service = container.resolve(UserService);
await service.users.save({ id: 1, name: 'Ada' });
await service.rename(1, 'Grace');
assert.deepEqual(await service.users.findById(1), { id: 1, name: 'Grace' });
await assert.rejects(() => service.rename(2, 'Missing'), /User not found/);
assert.equal(await service.users.delete(1), true);
assert.equal(await service.users.findById(1), null);
assert.deepEqual(await new UserRepository().findAll(), []);
container.clear();
