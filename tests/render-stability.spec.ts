import { test, expect, login } from './fixtures';

test('unchanged queue polling leaves the student scene idle', async ({ page }) => {
  await page.addInitScript(() => {
    const samples: number[] = [];
    Reflect.set(window, '__queueRenderSamples', samples);
    Reflect.set(window, '__REACT_DEVTOOLS_GLOBAL_HOOK__', {
      supportsFiber: true, renderers: new Map(), inject: () => 1,
      onCommitFiberRoot: () => samples.push(performance.now()),
      onCommitFiberUnmount: () => {},
    });
  });
  let polls = 0;
  page.on('response', response => { if (new URL(response.url()).pathname.endsWith('/queue')) polls++; });
  await login(page);
  await expect.poll(() => polls).toBeGreaterThan(0);
  expect(await page.evaluate(() => Reflect.get(window, '__queueRenderSamples').length)).toBeGreaterThan(0);
  await page.waitForTimeout(1200);
  await page.evaluate(() => { Reflect.get(window, '__queueRenderSamples').length = 0; });
  const start = polls;
  await expect.poll(() => polls, { timeout: 7000 }).toBeGreaterThanOrEqual(start + 2);
  const renders = await page.evaluate(() => Reflect.get(window, '__queueRenderSamples').length);
  expect(renders).toBe(0);
});
