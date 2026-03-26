import { createApp } from './app';
import { getEnv } from './config/env';

function main(): void {
  const env = getEnv();
  const app = createApp();

  app.listen(env.PORT, () => {
    console.log(`Synexia Nexus backend listening on port ${env.PORT}`);
  });
}

main();
