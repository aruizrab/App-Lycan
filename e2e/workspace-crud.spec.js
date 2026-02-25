import { test, expect } from '@playwright/test'
import { clearAppData, createWorkspace, goHome } from './helpers/app.js'

test.describe('Workspace CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await clearAppData(page)
  })

  test('create a workspace and verify it appears', async ({ page }) => {
    await createWorkspace(page, 'Test Workspace')

    // We should be inside the workspace now — go back to home
    await goHome(page)

    // Verify the workspace card is visible
    await expect(page.getByRole('heading', { name: 'Test Workspace', level: 3 })).toBeVisible()
  })

  test('rename a workspace via action menu', async ({ page }) => {
    await createWorkspace(page, 'Old Name')
    await goHome(page)

    // Set up the prompt dialog handler BEFORE triggering the action
    page.once('dialog', async dialog => {
      expect(dialog.type()).toBe('prompt')
      await dialog.accept('New Name')
    })

    // Open the action menu on the workspace card
    const card = page.locator('.group', { has: page.getByRole('heading', { name: 'Old Name', level: 3 }) })
    await card.hover()
    const actionMenuButton = card.locator('.absolute button, [class*="top-4"] button').first()
    await actionMenuButton.click()

    // Click "Rename" in the dropdown
    await page.getByRole('button', { name: 'Rename' }).click()

    // Verify the renamed workspace appears
    await expect(page.getByRole('heading', { name: 'New Name', level: 3 })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Old Name', level: 3 })).not.toBeVisible()
  })

  test('delete a workspace with confirm dialog', async ({ page }) => {
    await createWorkspace(page, 'To Delete')
    await goHome(page)

    // Verify workspace exists
    await expect(page.getByRole('heading', { name: 'To Delete', level: 3 })).toBeVisible()

    // Set up the confirm dialog handler BEFORE triggering the action
    page.once('dialog', async dialog => {
      expect(dialog.type()).toBe('confirm')
      await dialog.accept()
    })

    // Open action menu and click Delete
    const card = page.locator('.group', { has: page.getByRole('heading', { name: 'To Delete', level: 3 }) })
    await card.hover()
    const actionMenuButton = card.locator('.absolute button, [class*="top-4"] button').first()
    await actionMenuButton.click()
    await page.getByRole('button', { name: 'Delete' }).click()

    // Verify workspace is removed
    await expect(page.getByRole('heading', { name: 'To Delete', level: 3 })).not.toBeVisible()
  })

  test('duplicate name shows error in create modal', async ({ page }) => {
    await createWorkspace(page, 'Unique Workspace')
    await goHome(page)

    // Try to create another workspace with the same name
    await page.getByRole('button', { name: 'New Workspace' }).click()

    const nameInput = page.getByPlaceholder('Enter name...')
    await nameInput.waitFor({ state: 'visible' })
    await nameInput.fill('Unique Workspace')

    // The error message should appear
    await expect(page.getByText('This name already exists')).toBeVisible()

    // The Create button should be disabled
    const createButton = page.getByRole('button', { name: 'Create' })
    await expect(createButton).toBeDisabled()
  })
})
