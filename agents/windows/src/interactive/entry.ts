import { WindowsInteractiveAgent } from './interactive.agent';

async function main(): Promise<void> {
  const agent = new WindowsInteractiveAgent();
  const ctx = agent.getDesktopContext();

  await agent.start();

  const shutdown = async () => {
    await agent.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('[InteractiveAgent] Fatal error:', err);
  process.exit(1);
});
