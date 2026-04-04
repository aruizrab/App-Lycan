import { test, expect } from '@playwright/test'
import { clearAppData } from './helpers/app.js'

test.describe('User Profile Modal', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/')
        await clearAppData(page)
    })

    test('opens and closes from WorkspaceDashboard', async ({ page }) => {
        // Modal should not be visible initially
        await expect(page.getByRole('dialog', { name: 'User Profile' })).not.toBeVisible()

        // Open the modal
        await page.getByRole('button', { name: 'User Profile' }).click()
        await expect(page.getByRole('dialog', { name: 'User Profile' })).toBeVisible()

        // Close via X button (no unsaved changes)
        await page.getByRole('button', { name: 'Close' }).click()
        await expect(page.getByRole('dialog', { name: 'User Profile' })).not.toBeVisible()
    })

    test('closes on backdrop click when no unsaved changes', async ({ page }) => {
        await page.getByRole('button', { name: 'User Profile' }).click()
        await expect(page.getByRole('dialog', { name: 'User Profile' })).toBeVisible()

        // Click outside the modal (the backdrop)
        await page.mouse.click(10, 10)
        await expect(page.getByRole('dialog', { name: 'User Profile' })).not.toBeVisible()
    })

    test('closes on Escape key when no unsaved changes', async ({ page }) => {
        await page.getByRole('button', { name: 'User Profile' }).click()
        await expect(page.getByRole('dialog', { name: 'User Profile' })).toBeVisible()

        await page.keyboard.press('Escape')
        await expect(page.getByRole('dialog', { name: 'User Profile' })).not.toBeVisible()
    })

    test('backdrop click does not close when there are unsaved changes', async ({ page }) => {
        await page.getByRole('button', { name: 'User Profile' }).click()
        await expect(page.getByRole('dialog', { name: 'User Profile' })).toBeVisible()

        // Type into the editor to create unsaved changes
        await page.locator('.ProseMirror').click()
        await page.keyboard.type('Some profile text')

        // Click the backdrop — should not close
        await page.mouse.click(10, 10)
        await expect(page.getByRole('dialog', { name: 'User Profile' })).toBeVisible()
    })

    test('X button prompts confirmation when unsaved changes exist and stays open on cancel', async ({
        page
    }) => {
        await page.getByRole('button', { name: 'User Profile' }).click()

        // Create unsaved changes
        await page.locator('.ProseMirror').click()
        await page.keyboard.type('Unsaved text')

        // Dismiss the confirmation dialog (click Cancel)
        page.once('dialog', (dialog) => dialog.dismiss())
        await page.getByRole('button', { name: 'Close' }).click()

        // Modal should remain open
        await expect(page.getByRole('dialog', { name: 'User Profile' })).toBeVisible()
    })

    test('X button closes when user confirms discard of unsaved changes', async ({ page }) => {
        await page.getByRole('button', { name: 'User Profile' }).click()

        // Create unsaved changes
        await page.locator('.ProseMirror').click()
        await page.keyboard.type('Unsaved text')

        // Accept the confirmation dialog
        page.once('dialog', (dialog) => dialog.accept())
        await page.getByRole('button', { name: 'Close' }).click()

        await expect(page.getByRole('dialog', { name: 'User Profile' })).not.toBeVisible()
    })
})
