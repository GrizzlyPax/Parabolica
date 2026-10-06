import { chromium } from 'playwright';
const S='/tmp/claude-0/-home-claude-parabolica/b177d2b7-5438-5da6-880f-71494b669577/scratchpad';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
p.on('pageerror', e => console.log('PAGEERROR', e.message));
await p.goto('http://localhost:4173');
await p.getByText('Race Control').first().click();
await p.waitForTimeout(300);
await p.screenshot({ path: `${S}/t1.png` });
// pick Steady Hands row, bump speed
await p.getByText('Steady Hands').first().click();
await p.locator('.rc-try-grid input').first().fill('3');
await p.getByRole('button', { name: 'Measure' }).click();
await p.waitForSelector('.rc-compare', { timeout: 100000 });
await p.locator('.rc-try').scrollIntoViewIfNeeded();
await p.screenshot({ path: `${S}/t2.png` });
console.log((await p.locator('.rc-compare').innerText()).replace(/\n/g,' | '));
await b.close();
