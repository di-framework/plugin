import assert from 'node:assert/strict';
import {
  RpcMessage, RpcField, RpcService, RpcMethod,
  createRpcServer, createRpcClient, memoryPair,
} from '@di-framework/rpc';

@RpcMessage()
class GreetingRequest { @RpcField(1) name!: string; }
@RpcMessage()
class GreetingReply { @RpcField(1) message!: string; }
@RpcService({ package: 'example.v1' })
class GreetingRpc {
  @RpcMethod({ input: () => GreetingRequest, output: () => GreetingReply })
  greet(request: GreetingRequest): GreetingReply { return { message: `Hello, ${request.name}` }; }
}

const { clientTransport, serverTransport } = memoryPair();
const server = createRpcServer({ transport: serverTransport });
await server.start();
try {
  const client = createRpcClient(GreetingRpc, clientTransport);
  assert.deepEqual(await client.greet({ name: 'Ada' }), { message: 'Hello, Ada' });
  const replies = await client.$batch((rpc) => [rpc.greet({ name: 'Ada' }), rpc.greet({ name: 'Grace' })]);
  assert.deepEqual(replies, [{ message: 'Hello, Ada' }, { message: 'Hello, Grace' }]);
} finally {
  await server.stop();
}
