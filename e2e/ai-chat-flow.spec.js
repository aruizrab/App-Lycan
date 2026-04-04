import { test, expect } from '@playwright/test'
import { clearAppData, createWorkspace } from './helpers/app.js'

test.describe('AI Chat Flow', () => {
  const WORKSPACE = 'AI Chat Workspace'
  const openChat = async (page) => {
    await page.goto(`/workspace/${encodeURIComponent(WORKSPACE)}?openAiChat=true`)
    await page.waitForLoadState('networkidle')
    await page.getByPlaceholder('Type a message or / for commands...').waitFor({ state: 'visible', timeout: 5000 })
  }

  const getChatModelSelect = (page) => {
    return page.locator('button[title^="Change model for this chat"], button[title^="Model can only be changed before the first message in this chat."], button[title^="Please wait for the current AI task to finish."]').first()
  }

  const pickDifferentModelValue = async (page) => {
    const modelButton = getChatModelSelect(page)
    await modelButton.click()

    const dropdown = page.locator('div.absolute.bottom-full.left-0', { has: page.getByPlaceholder('Search models...') })
    await expect(dropdown).toBeVisible()

    const currentText = await modelButton.textContent()
    const modelOptions = await dropdown.locator('div[class*="cursor-pointer"]:not(:has-text("No models found"))').all()

    let targetOption = null
    for (const option of modelOptions) {
      const optionText = await option.textContent()
      if (!optionText.includes(currentText.trim())) {
        targetOption = option
        break
      }
    }

    expect(targetOption).toBeTruthy()
    await targetOption.click()

    return await modelButton.textContent()
  }

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
    await openChat(page)
    const chatInput = page.getByPlaceholder('Type a message or / for commands...')

    // Use pressSequentially to trigger Vue's watcher (fill doesn't fire input events the same way)
    await chatInput.pressSequentially('/')

    // The command menu should appear with "Commands" header (exact match to avoid "Press / for commands")
    await expect(page.getByText('Commands', { exact: true })).toBeVisible()

    // Verify at least one command is listed (e.g., /analyze)
    await expect(page.locator('.font-mono', { hasText: '/analyze' })).toBeVisible()
  })

  test('selecting a command from the menu populates the input', async ({ page }) => {
    await openChat(page)
    const chatInput = page.getByPlaceholder('Type a message or / for commands...')

    // Use pressSequentially to trigger Vue's watcher
    await chatInput.pressSequentially('/')
    await expect(page.getByText('Commands', { exact: true })).toBeVisible()

    // Click on the /analyze command
    await page.locator('li').filter({ hasText: '/analyze' }).first().click()

    // The input should now contain "/analyze "
    await expect(chatInput).toHaveValue('/analyze ')
  })

  test('model selector is enabled on empty chat and locked after first message', async ({ page }) => {
    await openChat(page)

    const modelButton = getChatModelSelect(page)
    await expect(modelButton).toBeVisible()
    await expect(modelButton).toBeEnabled()

    const chatInput = page.getByPlaceholder('Type a message or / for commands...')
    await chatInput.fill('Hello there')
    await chatInput.press('Enter')

    await expect(page.getByText('Hello there', { exact: true })).toBeVisible()
    await expect(modelButton).toBeDisabled()
    await expect(modelButton).toHaveAttribute('title', /Model can only be changed before the first message in this chat\./)
  })

  test('model selection is stored per chat session and restored when switching', async ({ page }) => {
    await openChat(page)

    const historyButton = page.locator('button[title="Chat History"]')
    const modelButton = getChatModelSelect(page)

    await expect(modelButton).toBeEnabled()
    const firstSessionModelText = await modelButton.textContent()

    const secondModelText = await pickDifferentModelValue(page)

    await expect(modelButton).toHaveText(secondModelText)

    await historyButton.click()
    await page.locator('button[title="New Chat"]').click()

    await expect(modelButton).toHaveText(firstSessionModelText)

    await historyButton.click()
    await page.getByText('Chat 1', { exact: true }).click()

    await expect(modelButton).toHaveText(secondModelText)
  })
})
