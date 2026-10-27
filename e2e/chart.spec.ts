import { test, expect } from '@playwright/test';
import { setLoginInfo, defaultMocks } from './helpers';

test.describe('Chart', () => {
  test.beforeEach(async ({ page }) => {
    await defaultMocks(page);
    await setLoginInfo(page);
  });
  test('Chart page', async ({ page }) => {
    await Promise.all([
      page.goto('/graph'),
      page.waitForResponse('**/whitelist'),
      page.waitForResponse('**/blacklist'),
      page.waitForResponse('**/pair_candles'),
    ]);

    // await page.waitForResponse('**/pair_candles');

    await page.getByRole('button', { name: 'Reload chart data' }).click();
    // await page.click('input[title="AutoRefresh"]');

    await expect(
      page.getByRole('toolbar', { name: 'Chart controls' }).getByText('NoActionStrategyFut'),
    ).toBeVisible();
    // Candle options live in the Display popover
    await page.getByRole('button', { name: 'Chart display options' }).click();
    const heikinAshiSwitch = page.getByRole('switch', { name: 'Heikin Ashi candles' });
    await heikinAshiSwitch.click();
    await expect(heikinAshiSwitch).toBeChecked();
    // Default plotconfig exists
    await expect(page.locator('#plotConfigSelect').nth(0)).toHaveText('default');
    // Disable Heikin Ashi
    await heikinAshiSwitch.click();
    await expect(heikinAshiSwitch).not.toBeChecked();
    await page.keyboard.press('Escape');

    // Reload triggers a new request
    await Promise.all([
      page.getByRole('button', { name: 'Reload chart data' }).click(),
      page.waitForResponse('**/pair_candles'),
    ]);
  });

  test('Plot configurator', async ({ page }) => {
    await Promise.all([
      page.goto('/graph'),
      page.waitForResponse('**/whitelist'),
      page.waitForResponse('**/blacklist'),
      page.waitForResponse('**/pair_candles'),
    ]);

    // Wait for the chart to load
    await expect(
      page.getByRole('toolbar', { name: 'Chart controls' }).getByText('NoActionStrategyFut'),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Chart display options' }).click();
    await page.getByRole('button', { name: 'Edit indicators' }).click();
    await page.getByRole('button', { name: 'From template' }).click();
    // Apply bollinger bands

    await page.getByRole('option', { name: 'BollingerBands' }).click();

    // await page.getByLabel('Select Templates').selectOption('BollingerBands');
    // Select template - Try to use
    await page.getByRole('button', { name: 'Use Template' }).click();
    // Accept remapping and close
    await page.getByRole('button', { name: 'Apply Template' }).click();
    await page.getByRole('button', { name: 'Save' }).click();

    const indicatorPanel = page.getByText('Indicators in this plotb');

    const options = await indicatorPanel.getByRole('option').allTextContents();
    await expect(options).toContain('bb_lowerband');
    await expect(options).toStrictEqual(['bb_upperband', 'bb_lowerband']);

    // indicatorPanel.selectOption('bb_lowerband');
    // Close Plot configurator
    await page.getByRole('button', { name: 'Close' }).click();

    await expect(page.locator('canvas')).toHaveScreenshot(
      'Chart-Plot-with_BollingerBands-Dark.png',
      {
        threshold: 0.15,
        maxDiffPixelRatio: 0.15,
      },
    );

    await page.getByRole('button', { name: /Switch to (light|dark) mode/ }).click();

    await expect(page.locator('canvas')).toHaveScreenshot('Chart-Plot-with_BollingerBands.png', {
      threshold: 0.15,
      maxDiffPixelRatio: 0.15,
    });
    // Should assert if indicators have been set
    // but it's a canvas ...
  });
});
