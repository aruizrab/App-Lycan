import { test, expect } from '@playwright/test'
import { clearAppData, createWorkspace, createCv, goHome, navigateToWorkspace } from './helpers/app.js'

test.describe('CV CRUD', () => {
  const WORKSPACE = 'CV Test Workspace'

  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await clearAppData(page)
    await createWorkspace(page, WORKSPACE)
  })

  test('create a CV and verify it appears in the list', async ({ page }) => {
    // We are inside the workspace after creation, create a CV
    await createCv(page, 'My CV')

    // We should be in the CV editor now — go back to workspace
    await page.goBack()
    await page.waitForURL(new RegExp(`/workspace/${encodeURIComponent(WORKSPACE)}`))

    // Make sure CVs tab is active
    await page.getByRole('button', { name: 'CVs' }).click()

    // Verify the CV card appears
    await expect(page.getByRole('heading', { name: 'My CV', level: 3 })).toBeVisible()
  })

  test('navigate to CV editor and verify correct URL', async ({ page }) => {
    await createCv(page, 'Editor Test CV')

    // Verify URL contains the CV name
    await expect(page).toHaveURL(new RegExp(`/workspace/${encodeURIComponent(WORKSPACE)}/edit/Editor%20Test%20CV`))

    // Verify the document name input shows the CV name
    const nameInput = page.locator('input[class*="text-xl"]')
    await expect(nameInput).toHaveValue('Editor Test CV')
  })

  test('delete a CV and verify it is removed', async ({ page }) => {
    await createCv(page, 'CV To Delete')

    // Go back to workspace dashboard
    await page.goBack()
    await page.waitForURL(new RegExp(`/workspace/${encodeURIComponent(WORKSPACE)}`))

    // Make sure CVs tab is active
    await page.getByRole('button', { name: 'CVs' }).click()

    // Verify CV exists
    await expect(page.getByRole('heading', { name: 'CV To Delete', level: 3 })).toBeVisible()

    // Set up confirm dialog handler BEFORE triggering the action
    page.once('dialog', async dialog => {
      await dialog.accept()
    })

    // Open action menu on the CV card and click Delete
    const card = page.locator('.group', { has: page.getByRole('heading', { name: 'CV To Delete', level: 3 }) })
    await card.hover()
    const actionMenuButton = card.locator('.absolute button, [class*="top-4"] button').first()
    await actionMenuButton.click()
    await page.getByRole('button', { name: 'Delete' }).click()

    // Verify CV is removed
    await expect(page.getByRole('heading', { name: 'CV To Delete', level: 3 })).not.toBeVisible()
  })
})
