import { expect, test } from '@playwright/test'

test('public authentication and legal routes survive direct navigation', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
  await expect(page.getByText('PUBLIC BETA')).toBeVisible()

  await expect(page.getByRole('link', { name: 'Create account' })).toHaveCount(0)
  await page.goto('/signup')
  await expect(page.getByRole('heading', { name: 'Signup is not open yet' })).toBeVisible()

  await page.goto('/forgot-password')
  await expect(page.getByRole('heading', { name: 'Reset your password' })).toBeVisible()

  await page.goto('/privacy')
  await expect(page.getByRole('heading', { name: /Privacy/i })).toBeVisible()

  await page.goto('/terms')
  await expect(page.getByRole('heading', { name: /Terms/i })).toBeVisible()
})

test('authenticated deep links redirect safely when signed out', async ({ page }) => {
  await page.goto('/app/settings')
  await expect(page).toHaveURL(/\/login$/)
})
