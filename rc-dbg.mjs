import { chromium } from 'playwright';
const S='/tmp/claude-0/-home-claude-parabolica/b177d2b7-5438-5da6-880f-71494b669577/scratchpad';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
for (const blockWorkers of [false, true]) {
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  if (blockWorkers) await p.addInitScript(() => { window.Worker = class { constructor() { throw new Error('workers blocked (test)'); } }; });
  p.on('pageerror', e => console.log('PAGEERROR', e.message));
  await p.goto('http://localhost:4173');
  await p.getByText('Race Control').first().click();
  // calibration quick look
  await p.locator('.rc-verify select').nth(1).selectOption('50');
  await p.getByRole('button', { name: 'Run', exact: true }).click();
  await p.waitForTimeout(2500);
  console.log(blockWorkers ? 'BLOCKED' : 'WORKER', 'calib progress:', await p.locator('.rc-progress span').last().innerText().catch(()=>'none'));
  await p.waitForSelector('.rc-compare', { timeout: 90000 });
  console.log('  calib result:', (await p.locator('.rc-compare').innerText()).replace(/\n/g,' | '));
  await p.screenshot({ path: `${S}/cal-${blockWorkers?'b':'w'}.png`, fullPage: false });
  // sim lab with rain
  await p.getByText('Sim Lab').first().click();
  await p.locator('.rc-seed input').fill('2026');
  await p.locator('.rc-card-list button').first().click();
  await p.getByText('Run Simulation').click();
  await p.waitForTimeout(3000);
  console.log('  simlab progress:', await p.locator('.percent').first().innerText().catch(()=>'none'));
  await p.waitForSelector('.results-summary', { timeout: 120000 });
  console.log('  simlab:', (await p.locator('.results-summary').innerText()).replace(/\n/g,' | '));
  await p.close();
}
await b.close();
