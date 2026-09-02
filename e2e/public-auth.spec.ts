import { expect, test } from '@playwright/test'

test('public authentication and legal routes survive direct navigation', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: /Good to see you again/i })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Log in' })).toBeVisible()

  await expect(page.getByRole('link', { name: 'Create account' })).toHaveCount(0)
  await page.goto('/signup')
  await expect(page.getByRole('heading', { name: 'Signup is not open yet' })).toBeVisible()

  await page.goto('/forgot-password')
  await expect(page.getByRole('heading', { name: /Let us get you back in/i })).toBeVisible()

  await page.goto('/privacy')
  await expect(page.getByRole('heading', { name: /Privacy/i })).toBeVisible()

  await page.goto('/terms')
  await expect(page.getByRole('heading', { name: /Terms/i })).toBeVisible()
})

test('authenticated deep links redirect safely when signed out', async ({ page }) => {
  await page.goto('/app/settings')
  await expect(page).toHaveURL(/\/login$/)
})
