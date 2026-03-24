import { test, expect } from '@playwright/test'
import { clearAppData } from './helpers/app.js'

/**
 * Helper: navigate to the System Prompts manager on the Settings page.
 */
async function openSystemPrompts(page) {
  await page.goto('/settings')
  await page.getByRole('button', { name: 'System Prompts' }).click()
}

/**
 * Helper: click the "+ Category" button (uses title attribute for precision).
 */
function addCategoryButton(page) {
  return page.locator('button[title="Add Category"]')
}

test.describe('System Prompts — Custom Categories', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await clearAppData(page)
  })

  // ── Viewing predefined categories ─────────────────────

  test('shows predefined category tabs', async ({ page }) => {
    await openSystemPrompts(page)

    // All five predefined categories should be visible as tab buttons
    for (const name of [
      'Job Analysis',
      'Match Report',
      'Company Research',
      'CV Generation',
      'Cover Letter'
    ]) {
      await expect(page.getByRole('button', { name, exact: true })).toBeVisible()
    }
  })

  test('shows "+ Category" button', async ({ page }) => {
    await openSystemPrompts(page)

    await expect(addCategoryButton(page)).toBeVisible()
  })

  // ── Creating a custom category ────────────────────────

  test('opens new category form and cancels', async ({ page }) => {
    await openSystemPrompts(page)

    // Open the form
    await addCategoryButton(page).click()
    await expect(page.getByText('New Category')).toBeVisible()
    await expect(page.getByPlaceholder('e.g. Technical Review')).toBeVisible()
    await expect(page.getByPlaceholder('e.g. technical-review')).toBeVisible()

    // Cancel
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByText('New Category')).not.toBeVisible()
  })

  test('auto-generates key from name input', async ({ page }) => {
    await openSystemPrompts(page)

    await addCategoryButton(page).click()

    const nameInput = page.getByPlaceholder('e.g. Technical Review')
    const keyInput = page.getByPlaceholder('e.g. technical-review')

    await nameInput.fill('My Custom Category')

    // Key should auto-generate as lowercase slug
    await expect(keyInput).toHaveValue('my-custom-category')
  })

  test('creates a custom category and switches to it', async ({ page }) => {
    await openSystemPrompts(page)

    // Open form
    await addCategoryButton(page).click()

    // Fill in category details
    await page.getByPlaceholder('e.g. Technical Review').fill('Technical Review')
    await expect(page.getByPlaceholder('e.g. technical-review')).toHaveValue('technical-review')
    await page
      .getByPlaceholder('Enter the default system prompt for this category...')
      .fill('You are a technical reviewer.')

    // Submit
    await page.getByRole('button', { name: 'Create', exact: true }).click()

    // Form should close
    await expect(page.getByText('New Category')).not.toBeVisible()

    // New category tab should appear and be selected (highlighted)
    const newTab = page.getByRole('button', { name: 'Technical Review', exact: true })
    await expect(newTab).toBeVisible()
    // Active tab has blue background
    await expect(newTab).toHaveClass(/bg-blue-600/)
  })

  test('custom category persists after page reload', async ({ page }) => {
    await openSystemPrompts(page)

    // Create a custom category
    await addCategoryButton(page).click()
    await page.getByPlaceholder('e.g. Technical Review').fill('Persistent Cat')
    await page
      .getByPlaceholder('Enter the default system prompt for this category...')
      .fill('This is a persistent prompt.')
    await page.getByRole('button', { name: 'Create', exact: true }).click()

    // Verify it exists
    await expect(page.getByRole('button', { name: 'Persistent Cat', exact: true })).toBeVisible()

    // Reload and navigate back
    await page.reload()
    await openSystemPrompts(page)

    // Custom category should still be there
    await expect(page.getByRole('button', { name: 'Persistent Cat', exact: true })).toBeVisible()
  })

  test('shows validation error for empty name or key', async ({ page }) => {
    await openSystemPrompts(page)

    await addCategoryButton(page).click()

    // The Create button should be disabled when fields are empty
    const createBtn = page.getByRole('button', { name: 'Create', exact: true })
    await expect(createBtn).toBeDisabled()

    // Fill only name (key auto-generates)
    await page.getByPlaceholder('e.g. Technical Review').fill('Test')
    await expect(createBtn).toBeEnabled()

    // Clear the key manually — button should be disabled again
    await page.getByPlaceholder('e.g. technical-review').fill('')
    await expect(createBtn).toBeDisabled()
  })

  test('shows error when trying to create category with empty default prompt', async ({ page }) => {
    await openSystemPrompts(page)

    await addCategoryButton(page).click()

    await page.getByPlaceholder('e.g. Technical Review').fill('Test Category')
    await expect(page.getByPlaceholder('e.g. technical-review')).toHaveValue('test-category')

    // Leave default prompt empty and try to submit
    await page.getByRole('button', { name: 'Create', exact: true }).click()

    // Should show error about default prompt
    await expect(page.getByText(/Default prompt content is required/i)).toBeVisible()

    // Form should still be open
    await expect(page.getByText('New Category')).toBeVisible()
  })

  test('default prompt field shows red border on empty submit attempt', async ({ page }) => {
    await openSystemPrompts(page)

    await addCategoryButton(page).click()

    await page.getByPlaceholder('e.g. Technical Review').fill('Test Category')

    // Try to submit with empty default prompt
    await page.getByRole('button', { name: 'Create', exact: true }).click()

    // The textarea should have a red border class
    const promptTextarea = page.getByPlaceholder(
      'Enter the default system prompt for this category...'
    )
    await expect(promptTextarea).toHaveClass(/border-red-400/)
  })

  test('shows error for duplicate category key', async ({ page }) => {
    await openSystemPrompts(page)

    // Create first category
    await addCategoryButton(page).click()
    await page.getByPlaceholder('e.g. Technical Review').fill('First Category')
    await page
      .getByPlaceholder('Enter the default system prompt for this category...')
      .fill('First category prompt.')
    await page.getByRole('button', { name: 'Create', exact: true }).click()

    // Try to create another with the same key
    await addCategoryButton(page).click()
    await page.getByPlaceholder('e.g. Technical Review').fill('First Category')
    // Key auto-generates to 'first-category' which already exists
    await page
      .getByPlaceholder('Enter the default system prompt for this category...')
      .fill('Another prompt.')
    await page.getByRole('button', { name: 'Create', exact: true }).click()

    // Should show an error message about the key already existing
    await expect(page.getByText(/already exists/i)).toBeVisible()
  })

  // ── Deleting a custom category ────────────────────────

  test('shows Delete Category button only for custom categories', async ({ page }) => {
    await openSystemPrompts(page)

    // Click a predefined tab — "Delete Category" should NOT appear
    await page.getByRole('button', { name: 'Job Analysis', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Delete Category' })).not.toBeVisible()

    // Create and select a custom category
    await addCategoryButton(page).click()
    await page.getByPlaceholder('e.g. Technical Review').fill('Deletable')
    await page
      .getByPlaceholder('Enter the default system prompt for this category...')
      .fill('Deletable category prompt.')
    await page.getByRole('button', { name: 'Create', exact: true }).click()

    // "Delete Category" should appear for the custom category
    await expect(page.getByText('Delete Category')).toBeVisible()
  })

  test('deletes a custom category after confirmation', async ({ page }) => {
    await openSystemPrompts(page)

    // Create a custom category
    await addCategoryButton(page).click()
    await page.getByPlaceholder('e.g. Technical Review').fill('To Delete')
    await page
      .getByPlaceholder('Enter the default system prompt for this category...')
      .fill('To delete prompt.')
    await page.getByRole('button', { name: 'Create', exact: true }).click()

    // Verify it exists
    await expect(page.getByRole('button', { name: 'To Delete', exact: true })).toBeVisible()

    // Set up the confirm dialog to accept
    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('confirm')
      await dialog.accept()
    })

    // Click Delete Category
    await page.getByText('Delete Category').click()

    // Tab should be removed
    await expect(page.getByRole('button', { name: 'To Delete', exact: true })).not.toBeVisible()

    // Should fall back to a predefined tab
    const jobAnalysisTab = page.getByRole('button', { name: 'Job Analysis', exact: true })
    await expect(jobAnalysisTab).toHaveClass(/bg-blue-600/)
  })

  test('does not delete custom category when confirmation is dismissed', async ({ page }) => {
    await openSystemPrompts(page)

    // Create a custom category
    await addCategoryButton(page).click()
    await page.getByPlaceholder('e.g. Technical Review').fill('Keep Me')
    await page
      .getByPlaceholder('Enter the default system prompt for this category...')
      .fill('Keep me prompt.')
    await page.getByRole('button', { name: 'Create', exact: true }).click()

    // Dismiss the confirm dialog
    page.once('dialog', async (dialog) => {
      await dialog.dismiss()
    })

    // Click Delete Category
    await page.getByText('Delete Category').click()

    // Category should still exist
    await expect(page.getByRole('button', { name: 'Keep Me', exact: true })).toBeVisible()
  })

  // ── Prompts within custom categories ──────────────────

  test('custom category starts with a default prompt', async ({ page }) => {
    await openSystemPrompts(page)

    // Create a custom category
    await addCategoryButton(page).click()
    await page.getByPlaceholder('e.g. Technical Review').fill('My Category')
    await page
      .getByPlaceholder('Enter the default system prompt for this category...')
      .fill('My category default prompt.')
    await page.getByRole('button', { name: 'Create', exact: true }).click()

    // Should show "Active: Default" for the new category
    await expect(page.getByText(/Active:.*Default/)).toBeVisible()
  })

  test('custom category default prompt is shown in the prompt list', async ({ page }) => {
    await openSystemPrompts(page)

    // Create a custom category with a specific default prompt
    await addCategoryButton(page).click()
    await page.getByPlaceholder('e.g. Technical Review').fill('My Category')
    await page
      .getByPlaceholder('Enter the default system prompt for this category...')
      .fill('You are a specialized assistant.')
    await page.getByRole('button', { name: 'Create', exact: true }).click()

    // Expand the Default prompt to see its content
    await page.getByText('Default').click()
    await expect(page.getByText('You are a specialized assistant.')).toBeVisible()
  })

  test('can create a custom prompt inside a custom category', async ({ page }) => {
    await openSystemPrompts(page)

    // Create a custom category
    await addCategoryButton(page).click()
    await page.getByPlaceholder('e.g. Technical Review').fill('My Category')
    await page
      .getByPlaceholder('Enter the default system prompt for this category...')
      .fill('My category default prompt.')
    await page.getByRole('button', { name: 'Create', exact: true }).click()

    // Click "Create New Prompt"
    await page.getByRole('button', { name: 'Create New Prompt' }).click()
    await expect(page.getByPlaceholder('My Custom Prompt')).toBeVisible()

    // Fill in prompt details
    await page.getByPlaceholder('My Custom Prompt').fill('Review Prompt')
    await page
      .locator('textarea[placeholder="Enter your system prompt..."]')
      .fill('You are a code reviewer.')

    // Submit
    await page.getByRole('button', { name: 'Create Prompt' }).click()

    // The new prompt should appear in the list
    await expect(page.getByText('Review Prompt')).toBeVisible()
  })
})
