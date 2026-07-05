import { test, expect } from '@playwright/test';
import { clerkSetup, clerk } from '@clerk/testing/playwright'; 

// Keys
const PUB_KEY = process.env.VITE_CLERK_PUBLISHABLE_KEY || 'pk_test_aGVscGluZy1iYXJuYWNsZS00OS5jbGVyay5hY2NvdW50cy5kZXYk';
const SEC_KEY = process.env.CLERK_SECRET_KEY || 'sk_test_BbhwrAPJ5SHhjGrUJavsHECAdU8Vhyvz0gloFfSqLE';

let useUiFallback = false;

// ✅ FIX: A mathematically valid 1x1 pixel transparent PNG
const validPngBuffer = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

test.describe('System Test: Visitor Pass Lifecycle', () => {

  test.beforeAll(async () => {
    try {
      await clerkSetup({ publishableKey: PUB_KEY, secretKey: SEC_KEY });
    } catch (error) {
      console.warn('\n❌ Clerk API Key invalid/rejected. Falling back to robust UI Login...\n');
      useUiFallback = true; 
    }
  });

  test('User can fill and submit the Visitor Application Form', async ({ page }) => {
    test.setTimeout(90000); 

    // Intercept backend API
    await page.route('**/api/visits', async route => {
      const origin = route.request().headers().origin || '*';
      const corsHeaders = {
        'Access-Control-Allow-Origin': origin, 
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, *'
      };

      if (route.request().method() === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: corsHeaders });
        return;
      }

      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        headers: corsHeaders,
        body: JSON.stringify({ message: "Success", id: "mock-system-id-123" })
      });
    });

    // ==========================================
    // 🛡️ AUTHENTICATION ROUTING
    // ==========================================
    if (!useUiFallback) {
      await page.goto('/');
      await clerk.signIn({ page, emailAddress: 'test+clerk_test@example.com' });
      await page.goto('/apply');
    } else {
      await page.goto('/apply'); 
      await page.waitForURL('**/sign-in**', { timeout: 30000 });

      const emailInput = page.getByRole('textbox', { name: /email address/i });
      await emailInput.waitFor({ state: 'visible', timeout: 30000 });
      await emailInput.fill('test+clerk_test@example.com');
      await page.getByRole('button', { name: 'Continue', exact: true }).click();

      const passwordInput = page.getByPlaceholder(/password/i);
      await passwordInput.waitFor({ state: 'visible', timeout: 30000 });
      
      // 🚨 REPLACE THIS WITH YOUR REAL CLERK TEST ACCOUNT PASSWORD 🚨
      await passwordInput.fill('YOUR_ACTUAL_PASSWORD_HERE'); 
      
      await page.getByRole('button', { name: 'Continue', exact: true }).click();
      await page.waitForURL('**/apply', { timeout: 30000 });
    }

    // ==========================================
    // 📝 THE ACTUAL TEST
    // ==========================================
    await expect(page.locator('text=Gate Pass Application')).toBeVisible({ timeout: 15000 });

    await page.getByText('Visitor / Parent').click();

    await page.fill('input[name="name"]', 'John System Tester');
    await page.fill('input[name="arrivalDate"]', '2026-12-01T10:00');
    await page.fill('input[name="departureDate"]', '2026-12-01T12:00');
    await page.fill('input[name="hostName"]', 'Jane Doe');
    await page.fill('input[name="hostId"]', 'ABCDE12345');

    // ✅ FIX: Inject the mathematically valid PNG image
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByText('Upload Photo').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'test-image.png',
      mimeType: 'image/png',
      buffer: validPngBuffer, 
    });

    const getDropdown = (labelText) => page.locator('label').filter({ hasText: labelText }).locator('..');
    const selectDropdownOption = async (labelName, optionText) => {
      const div = getDropdown(labelName);
      await div.locator('button').first().click(); 
      await page.waitForTimeout(300); 
      await div.locator('button').filter({ hasText: optionText }).click(); 
      await page.waitForTimeout(300); 
    };

    await selectDropdownOption('Transport Mode', 'Bus');
    await selectDropdownOption('Student Course', 'B.Tech');
    await selectDropdownOption('Student Hostel', 'Gargi Bhawan');

    const submitButton = page.locator('button:has-text("Submit Application")');
    await expect(submitButton).toBeEnabled({ timeout: 10000 }); 
    await submitButton.click();

    // 6. Verify Success
    // Use getByRole to robustly wait for the Framer Motion animation to mount the heading
    const successHeading = page.getByRole('heading', { name: 'Form Submitted' });
    await expect(successHeading).toBeVisible({ timeout: 15000 });
  });
});