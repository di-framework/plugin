import assert from 'node:assert/strict';
import { Container } from '@di-framework/core';
import { Component } from '@di-framework/core/decorators';

class Logger {
  messages: string[] = [];
  info(message: string) { this.messages.push(message); }
}
class GreetingService {
  constructor(@Component(Logger) readonly logger: Logger) {}
  greet(name: string) { this.logger.info(`Hello, ${name}`); }
}

const root = new Container();
root.register(Logger).register(GreetingService);
root.resolve(GreetingService).greet('Ada');
assert.deepEqual(root.resolve(Logger).messages, ['Hello, Ada']);
assert.equal(root.resolve(GreetingService), root.resolve(GreetingService));
root.register(GreetingService, { singleton: false });
assert.notEqual(root.resolve(GreetingService), root.resolve(GreetingService));

// A fork copies registrations; it is not a parent-linked request scope.
const isolated = root.fork();
assert.notEqual(isolated.resolve(Logger), root.resolve(Logger));
const shared = root.fork({ carrySingletons: true });
assert.equal(shared.resolve(Logger), root.resolve(Logger));

// Factories receive no arguments. Close over the intended container explicitly.
const factoryContainer = new Container();
factoryContainer.register(Logger);
factoryContainer.registerFactory('greeting', () => new GreetingService(factoryContainer.resolve(Logger)));
assert.equal(factoryContainer.resolve<GreetingService>('greeting').logger, factoryContainer.resolve(Logger));
root.clear(); isolated.clear(); shared.clear(); factoryContainer.clear();
