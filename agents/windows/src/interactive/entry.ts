import { WindowsInteractiveAgent } from './interactive.agent';

async function main(): Promise<void> {
  console.log(`[InteractiveAgent Entry] Process started with PID: ${process.pid}`);
  const agent = new WindowsInteractiveAgent();
  const ctx = agent.getDesktopContext();

  console.log(`[InteractiveAgent Entry] Verified Windows Session ID: ${ctx.windowsSessionId}`);
  console.log(`[InteractiveAgent Entry] Resolved WindowStation: ${ctx.windowStationName}`);
  console.log(`[InteractiveAgent Entry] Resolved Desktop: ${ctx.desktopName}`);
  console.log(`[InteractiveAgent Entry] Lock Status: ${ctx.isLocked ? 'LOCKED' : 'UNLOCKED'}`);
  console.log(`[InteractiveAgent Entry] Primary Display: ${ctx.screenWidth}x${ctx.screenHeight} @ ${ctx.dpi} DPI`);
  console.log(`[InteractiveAgent Entry] Discovered Monitors: ${ctx.monitors.length}`);

  await agent.start();
  console.log('[InteractiveAgent Entry] Connected and authenticated with Watchdog via Named Pipe IPC');

  const shutdown = async () => {
    console.log('[InteractiveAgent Entry] Shutting down gracefully...');
    await agent.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('[InteractiveAgent Entry] Fatal error:', err);
  process.exit(1);
});
