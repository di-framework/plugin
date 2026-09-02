import { Container, createToken, Lifecycle } from '@di-framework/core';

export interface DatabaseService {
  query(sql: string): Promise<any[]>;
}

export interface UserService {
  getUser(id: string): Promise<any>;
}

export const DB_TOKEN = createToken<DatabaseService>('DatabaseService');
export const USER_SERVICE_TOKEN = createToken<UserService>('UserService');

export class SqlDatabaseService implements DatabaseService {
  async query(sql: string) {
    return [{ id: '1', name: 'Sample' }];
  }
}

export class DefaultUserService implements UserService {
  constructor(private db: DatabaseService) {}

  async getUser(id: string) {
    return this.db.query(`SELECT * FROM users WHERE id = '${id}'`);
  }
}

export function configureAppContainer(): Container {
  const container = new Container();

  container.register(DB_TOKEN, {
    useClass: SqlDatabaseService,
    lifecycle: Lifecycle.Singleton,
  });

  container.register(USER_SERVICE_TOKEN, {
    useFactory: (c) => new DefaultUserService(c.resolve(DB_TOKEN)),
    lifecycle: Lifecycle.Scoped,
  });

  return container;
}
