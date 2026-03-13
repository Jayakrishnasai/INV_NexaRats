import { test, expect } from '@playwright/test';

test.describe('Core Sale Flow', () => {
  test('should complete a cash sale successfully', async ({ page }) => {
    // 1. Login
    await page.goto('http://localhost:3000/');
    await page.fill('input[placeholder="admin@nexarats.com"]', 'admin@nexarats.com');
    await page.fill('input[placeholder="••••••••"]', 'NexaRats@2026!');
    await page.click('button:has-text("Login")');

    // 2. Wait for navigation to Billing (default dashboard usually redirects or has a link)
    // Based on the code, it might go to /dashboard. Let's assume it has a side nav.
    // However, billing is often the core page.
    await page.waitForURL('**/dashboard');
    
    // Check if we are on Dashboard or redirected to Billing
    // If there is a "Billing" link in sidebar, click it.
    // For this test, let's assume direct navigation if needed or find the link.
    // Based on Page types: 'login' | 'dashboard' | 'billing' ...
    
    // Simulate clicking "Billing" in sidebar
    await page.click('text=Billing');
    await page.waitForURL('**/billing');

    // 3. Search and Add Product to Cart
    // Wait for products to load
    await page.waitForSelector('input[placeholder="Search by name, SKU or barcode"]');
    
    // Click the first product's add button (Plus icon)
    // The button has class 'bg-primary' and is inside a product card
    const firstProductAddBtn = page.locator('button.bg-primary').first();
    await firstProductAddBtn.click();

    // 4. Proceed to Payment
    await page.click('button:has-text("Proceed to Payment")');

    // 5. Customer Info Modal - Skip
    await page.click('button:has-text("Skip — Continue as Walk-in")');

    // 6. Payment Modal - Confirm Cash
    await page.click('button:has-text("Confirm Cash Payment")');

    // 7. Success Verification
    await expect(page.locator('text=Payment Successful')).toBeVisible();
    await expect(page.locator('text=Amount Paid')).toBeVisible();

    // 8. Back to Billing
    await page.click('button:has-text("Back to Billing Dashboard")');
    await expect(page).toHaveURL(/.*billing/);
  });
});
