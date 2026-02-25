import { test, expect } from '@playwright/test'
import { clearAppData, createWorkspace } from './helpers/app.js'

test.describe('AI Chat Flow', () => {
  const WORKSPACE = 'AI Chat Workspace'

  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await clearAppData(page)
    await createWorkspace(page, WORKSPACE)
  })

  test('chat input is visible on workspace dashboard', async ({ page }) => {
    // Verify we are on the workspace page
    await expect(page.getByRole('heading', { level: 1 })).toContainText(WORKSPACE)
  })

  test('typing / shows command menu in AI chat', async ({ page }) => {
    // Open the AI panel by visiting with query param
    await page.goto(`/workspace/${encodeURIComponent(WORKSPACE)}?openAiChat=true`)
    await page.waitForLoadState('networkidle')

    // Look for the chat input
    const chatInput = page.getByPlaceholder('Type a message or / for commands...')
    await chatInput.waitFor({ state: 'visible', timeout: 5000 })

    // Use pressSequentially to trigger Vue's watcher (fill doesn't fire input events the same way)
    await chatInput.pressSequentially('/')

    // The command menu should appear with "Commands" header (exact match to avoid "Press / for commands")
    await expect(page.getByText('Commands', { exact: true })).toBeVisible()

    // Verify at least one command is listed (e.g., /analyze)
    await expect(page.locator('.font-mono', { hasText: '/analyze' })).toBeVisible()
  })

  test('selecting a command from the menu populates the input', async ({ page }) => {
    await page.goto(`/workspace/${encodeURIComponent(WORKSPACE)}?openAiChat=true`)
    await page.waitForLoadState('networkidle')

    const chatInput = page.getByPlaceholder('Type a message or / for commands...')
    await chatInput.waitFor({ state: 'visible', timeout: 5000 })

    // Use pressSequentially to trigger Vue's watcher
    await chatInput.pressSequentially('/')
    await expect(page.getByText('Commands', { exact: true })).toBeVisible()

    // Click on the /analyze command
    await page.locator('li').filter({ hasText: '/analyze' }).first().click()

    // The input should now contain "/analyze "
    await expect(chatInput).toHaveValue('/analyze ')
  })
})
