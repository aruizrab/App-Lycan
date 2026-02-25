import { test, expect } from '@playwright/test'
import { clearAppData, createWorkspace, createCoverLetter } from './helpers/app.js'

test.describe('Cover Letter CRUD', () => {
  const WORKSPACE = 'CL Test Workspace'

  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await clearAppData(page)
    await createWorkspace(page, WORKSPACE)
  })

  test('create a cover letter and verify it appears in the list', async ({ page }) => {
    await createCoverLetter(page, 'My Cover Letter')

    // Go back to workspace dashboard
    await page.goBack()
    await page.waitForURL(new RegExp(`/workspace/${encodeURIComponent(WORKSPACE)}`))

    // Switch to Cover Letters tab
    await page.getByRole('button', { name: 'Cover Letters' }).click()

    // Verify the cover letter card appears
    await expect(page.getByRole('heading', { name: 'My Cover Letter', level: 3 })).toBeVisible()
  })

  test('navigate to cover letter editor and verify it loads', async ({ page }) => {
    await createCoverLetter(page, 'Test Letter')

    // Verify URL contains the cover letter name
    await expect(page).toHaveURL(new RegExp(`/cover-letter/Test%20Letter`))

    // Verify the document name input shows the cover letter name
    const nameInput = page.locator('input[class*="text-xl"]')
    await expect(nameInput).toHaveValue('Test Letter')
  })

  test('delete a cover letter and verify it is removed', async ({ page }) => {
    await createCoverLetter(page, 'Letter To Delete')

    // Go back to workspace dashboard
    await page.goBack()
    await page.waitForURL(new RegExp(`/workspace/${encodeURIComponent(WORKSPACE)}`))

    // Switch to Cover Letters tab
    await page.getByRole('button', { name: 'Cover Letters' }).click()

    // Verify cover letter exists
    await expect(page.getByRole('heading', { name: 'Letter To Delete', level: 3 })).toBeVisible()

    // Set up confirm dialog handler BEFORE triggering the action
    page.once('dialog', async dialog => {
      await dialog.accept()
    })

    // Open action menu on the card and click Delete
    const card = page.locator('.group', { has: page.getByRole('heading', { name: 'Letter To Delete', level: 3 }) })
    await card.hover()
    const actionMenuButton = card.locator('.absolute button, [class*="top-4"] button').first()
    await actionMenuButton.click()
    await page.getByRole('button', { name: 'Delete' }).click()

    // Verify cover letter is removed
    await expect(page.getByRole('heading', { name: 'Letter To Delete', level: 3 })).not.toBeVisible()
  })
})
