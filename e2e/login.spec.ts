import { test, expect } from '@playwright/test';
import { defaultMocks } from './helpers';

test.describe('Login', () => {
  test('Is not logged in', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('button', { hasText: 'Login' })).toBeInViewport();

    await page.locator('li', { hasText: 'No bot selected' });
    await page.locator('button:has-text("Login")').click();
    await expect(page.getByText('Connect a bot')).toBeVisible();
    // Connection settings are expanded when adding a bot from the modal
    await expect(page.locator('input[id=url-input]').inputValue()).resolves.toBe(
      'http://localhost:3000',
    );
    await expect(page.locator('#name-input')).toBeVisible();
    await expect(page.locator('#username-input')).toBeVisible();
    await expect(page.locator('#password-input')).toBeVisible();
    await expect(page.locator('button[type=submit]')).toBeVisible();
  });

  test('Explicit login page', async ({ page }) => {
    await page.goto('/login');
    // No app navigation before signing in
    await expect(page.locator('button', { hasText: 'Login' })).not.toBeVisible();
    await expect(page.getByRole('heading', { name: 'Sign in to FreqtradeUI' })).toBeVisible();
    await expect(page.locator('#username-input')).toBeFocused();
    await expect(page.locator('#password-input')).toBeVisible();
    await expect(page.locator('button[type=submit]')).toContainText('Sign in');

    // Connection settings are collapsed by default and show the prefilled URL
    await expect(page.locator('#url-input')).not.toBeVisible();
    await page.getByRole('button', { name: /Connection/ }).click();
    await expect(page.locator('input[id=url-input]').inputValue()).resolves.toBe(
      'http://localhost:3000',
    );
    await expect(page.locator('#name-input')).toBeVisible();
  });

  test('Shows and hides the password', async ({ page }) => {
    await page.goto('/login');
    const password = page.locator('#password-input');
    await password.fill('SuperDuperBot');
    await expect(password).toHaveAttribute('type', 'password');
    await page.getByRole('button', { name: 'Show password' }).click();
    await expect(password).toHaveAttribute('type', 'text');
    await page.getByRole('button', { name: 'Hide password' }).click();
    await expect(password).toHaveAttribute('type', 'password');
  });

  test('Validates required fields', async ({ page }) => {
    await page.goto('/login');
    await page.locator('button[type=submit]').click();
    await expect(page.getByText('Enter your username.')).toBeVisible();
    await expect(page.getByText('Enter your password.')).toBeVisible();
    await expect(page.locator('#username-input')).toBeFocused();
  });

  test('Redirect when not logged in', async ({ page }) => {
    await page.goto('/trade');
    await expect(page).toHaveURL(/.*\/login\?redirect=\/trade/);
    await expect(page.getByRole('heading', { name: 'Sign in to FreqtradeUI' })).toBeVisible();
  });

  test('Test Login', async ({ page }) => {
    await defaultMocks(page);
    await page.goto('/login');

    await page.getByRole('button', { name: /Connection/ }).click();
    await page.getByRole('textbox', { name: 'Display name' }).fill('TestBot');
    await page.getByRole('textbox', { name: 'Username' }).fill('Freqtrader');
    await page.getByRole('textbox', { name: 'Password' }).fill('SuperDuperBot');

    await page.route('**/api/v1/token/login', (route) => {
      return route.fulfill({
        status: 200,
        json: { access_token: 'access_token_tesst', refresh_token: 'refresh_test' },
        headers: { 'access-control-allow-origin': '*' },
      });
    });
    const loginButton = await page.locator('button[type=submit]');
    await expect(loginButton).toBeVisible();
    await expect(loginButton).toContainText('Sign in');
    await Promise.all([loginButton.click(), page.waitForResponse('**/api/v1/token/login')]);

    await expect(page.getByText('TestBot', { exact: true })).toBeVisible();
    await expect(page.locator('button', { hasText: 'Add bot' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'Login' })).not.toBeVisible();
    // Test logout
    await page.getByRole('button', { name: 'Account and layout menu' }).click();
    await page.getByRole('menuitem', { name: 'Logout' }).click();
    // Assert we're logged out again
    await expect(page.locator('button', { hasText: 'Login' })).toBeVisible();
  });

  test('Test Login failed - wrong api url', async ({ page }) => {
    await defaultMocks(page);
    await page.goto('/login');
    await page.getByRole('textbox', { name: 'Username' }).fill('Freqtrader');
    await page.getByRole('textbox', { name: 'Password' }).fill('SuperDuperBot');

    await page.route('**/api/v1/token/login', (route) => {
      return route.fulfill({
        status: 404,
        json: { access_token: 'access_token_tesst', refresh_token: 'refresh_test' },
        headers: { 'access-control-allow-origin': '*' },
      });
    });
    const loginButton = await page.locator('button[type=submit]');
    await expect(loginButton).toContainText('Sign in');
    await Promise.all([loginButton.click(), page.waitForResponse('**/api/v1/token/login')]);
    await expect(page.getByRole('alert')).toContainText("Can't reach the bot");
    await expect(page.getByRole('link', { name: 'Test the connection' })).toBeVisible();
    // Connection settings open so the URL can be fixed
    await expect(page.locator('#url-input')).toBeVisible();
    await expect(page.locator('#url-input')).toHaveAttribute('aria-invalid', 'true');
  });

  test('Test Login failed - wrong password', async ({ page }) => {
    await defaultMocks(page);
    await page.goto('/login');
    await page.getByRole('textbox', { name: 'Username' }).fill('Freqtrader');
    await page.getByRole('textbox', { name: 'Password' }).fill('SuperDuperBot');

    await page.route('**/api/v1/token/login', (route) => {
      return route.fulfill({
        status: 401,
        json: { access_token: 'access_token_tesst', refresh_token: 'refresh_test' },
        headers: { 'access-control-allow-origin': '*' },
      });
    });

    const loginButton = await page.locator('button[type=submit]');
    await expect(loginButton).toContainText('Sign in');
    await expect(page.getByText('Wrong username or password')).not.toBeVisible();

    await Promise.all([loginButton.click(), page.waitForResponse('**/api/v1/token/login')]);
    await expect(page.getByRole('alert')).toContainText('Wrong username or password');
    await expect(page.locator('#password-input')).toHaveAttribute('aria-invalid', 'true');

    // Editing the password clears the error
    await page.getByRole('textbox', { name: 'Password' }).fill('Another');
    await expect(page.getByText('Wrong username or password')).not.toBeVisible();
  });
});
