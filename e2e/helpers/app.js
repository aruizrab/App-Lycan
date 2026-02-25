/**
 * Page Object helpers for e2e tests.
 */

/**
 * Clear all app data from localStorage and reload.
 */
export async function clearAppData(page) {
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await page.waitForLoadState('networkidle')
}

/**
 * Create a new workspace from the WorkspaceDashboard (home page).
 * Assumes the page is already at '/'.
 */
export async function createWorkspace(page, name) {
  // Click the "New Workspace" button
  await page.getByRole('button', { name: 'New Workspace' }).click()

  // Wait for the modal to appear and fill in the name
  const nameInput = page.getByPlaceholder('Enter name...')
  await nameInput.waitFor({ state: 'visible' })
  await nameInput.fill(name)

  // Submit the form
  await page.getByRole('button', { name: 'Create' }).click()

  // After creating, the app navigates into the workspace
  await page.waitForURL(new RegExp(`/workspace/${encodeURIComponent(name)}`))
}

/**
 * Navigate to a workspace by clicking its card on the home page.
 * Assumes the page is at '/'.
 */
export async function navigateToWorkspace(page, name) {
  await page.getByRole('heading', { name, level: 3 }).click()
  await page.waitForURL(new RegExp(`/workspace/${encodeURIComponent(name)}`))
}

/**
 * Go back to the workspace list (home page) from within a workspace.
 */
export async function goHome(page) {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
}

/**
 * Create a CV inside the current workspace.
 * Assumes the page is already on a workspace Dashboard and the CVs tab is active.
 */
export async function createCv(page, name) {
  // Make sure CVs tab is active
  await page.getByRole('button', { name: 'CVs' }).click()

  // Click the "New CV" button
  await page.getByRole('button', { name: 'New CV' }).click()

  // Fill name in modal
  const nameInput = page.getByPlaceholder('Enter name...')
  await nameInput.waitFor({ state: 'visible' })
  await nameInput.fill(name)

  // Submit
  await page.getByRole('button', { name: 'Create' }).click()

  // Should navigate to the CV editor
  await page.waitForURL(/\/edit\//)
}

/**
 * Create a cover letter inside the current workspace.
 * Assumes the page is already on a workspace Dashboard.
 */
export async function createCoverLetter(page, name) {
  // Switch to Cover Letters tab
  await page.getByRole('button', { name: 'Cover Letters' }).click()

  // Click the "New Cover Letter" button
  await page.getByRole('button', { name: 'New Cover Letter' }).click()

  // Fill name in modal
  const nameInput = page.getByPlaceholder('Enter name...')
  await nameInput.waitFor({ state: 'visible' })
  await nameInput.fill(name)

  // Submit
  await page.getByRole('button', { name: 'Create' }).click()

  // Should navigate to the cover letter editor
  await page.waitForURL(/\/cover-letter\//)
}
