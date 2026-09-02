export function scaffoldProvider(serviceName: string, lifecycle = 'Singleton'): string {
  const tokenName = `${serviceName.toUpperCase().replace(/SERVICE$/, '')}_TOKEN`;
  return `import { createToken, Lifecycle } from '@di-framework/core';

export interface ${serviceName} {
  // Define ${serviceName} interface methods here
}

export const ${tokenName} = createToken<${serviceName}>('${serviceName}');

export class Default${serviceName} implements ${serviceName} {
  constructor() {}
}

export const ${serviceName}Provider = {
  token: ${tokenName},
  provider: {
    useClass: Default${serviceName},
    lifecycle: Lifecycle.${lifecycle},
  },
};
`;
}
