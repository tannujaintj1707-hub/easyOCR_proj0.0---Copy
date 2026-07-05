import { test, expect } from '@playwright/test';

// 🚨 Prerequisite: Your backend MUST be running on http://127.0.0.1:5000 
// and your frontend on http://localhost:5173 for this test to pass.

test.describe('Acceptance Test: Real Visitor Pass Submission', () => {

  test('User can submit a pass to the real backend database', async ({ page }) => {
    // 120s timeout to allow generous time for real DB/Network/Clerk calls
    test.setTimeout(120000); 

    // ==========================================
    // 🛡️ PURE UI LOGIN
    // ==========================================
    await page.goto('/apply'); 

    // Wait for Clerk to load
    const emailInput = page.locator('input[name="identifier"]');
    await emailInput.waitFor({ state: 'visible', timeout: 30000 });
    await emailInput.fill('test+clerk_test@example.com');
    await page.getByRole('button', { name: 'Continue', exact: true }).click();

    // Enter Password
    const passwordInput = page.locator('input[name="password"]');
    await passwordInput.waitFor({ state: 'visible', timeout: 30000 });
    
    // 🚨 REPLACE THIS WITH YOUR REAL CLERK TEST ACCOUNT PASSWORD 🚨
    await passwordInput.fill(process.env.CLERK_TEST_PASSWORD || 'YOUR_ACTUAL_PASSWORD_HERE'); 
    await page.getByRole('button', { name: 'Continue', exact: true }).click();

    // ✅ FIX: Robust OTP Hydration Handling
    try {
      // Target the exact textbox role seen in the DOM snapshot
      const otpInput = page.getByRole('textbox', { name: /verification code/i }).first();
      await otpInput.waitFor({ state: 'visible', timeout: 8000 });
      
      console.log("🔐 Clerk requested 2FA/MFA. Waiting for component hydration...");
      
      // 1. Wait 2 seconds for Clerk's Javascript event listeners to attach
      await page.waitForTimeout(2000); 
      
      // 2. Force focus on the input
      await otpInput.focus();
      
      // 3. Type very deliberately so Clerk's script catches every number
      await page.keyboard.type('424242', { delay: 150 });
    } catch (e) {
      // No OTP challenge presented. Proceed normally.
    }

    // Wait for successful login redirect
    await page.waitForURL('**/apply', { timeout: 30000 });

    // ==========================================
    // 📝 FILL APPLICATION
    // ==========================================
    await expect(page.locator('text=Gate Pass Application')).toBeVisible({ timeout: 15000 });

    await page.getByText('Visitor / Parent').click();

    // Make the name unique so we can easily spot this test in your real database
    const uniqueName = `UAT Tester ${Date.now()}`;
    await page.fill('input[name="name"]', uniqueName);
    
    await page.fill('input[name="arrivalDate"]', '2026-12-01T10:00');
    await page.fill('input[name="departureDate"]', '2026-12-01T12:00');
    await page.fill('input[name="hostName"]', 'Jane Doe');
    await page.fill('input[name="hostId"]', 'ABCDE12345');

    // Create a real mathematical transparent PNG buffer so the backend doesn't crash
    const validPngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64'
    );

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByText('Upload Photo').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'uat-test-image.png',
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

    // ==========================================
    // 🚀 SUBMIT TO REAL BACKEND
    // ==========================================
    const submitButton = page.locator('button:has-text("Submit Application")');
    await expect(submitButton).toBeEnabled({ timeout: 10000 }); 
    
    // Set up a listener to catch the real API response
    const responsePromise = page.waitForResponse(response => 
      response.url().includes('/api/visits') && response.request().method() === 'POST'
    );

    await submitButton.click();

    // Wait for the real backend to respond
    const response = await responsePromise;
    
    // ACCEPTANCE CRITERIA: The real Python backend must return a 201 Created
    expect(response.status()).toBe(201);

    // Verify the UI transitions to Success
    const successHeading = page.getByRole('heading', { name: 'Form Submitted' });
    await expect(successHeading).toBeVisible({ timeout: 15000 });
  });
});