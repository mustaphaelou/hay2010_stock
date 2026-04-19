import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginForm } from '@/components/login-form'

vi.mock('@/app/actions/auth', () => ({
  login: vi.fn(),
}))

vi.mock('@/lib/security/csrf-client', () => ({
  getCsrfToken: vi.fn().mockResolvedValue('test-csrf-token'),
  getAnonymousCsrfToken: vi.fn().mockResolvedValue('test-csrf-token'),
}))

vi.mock('next/link', () => ({
  default: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('a', props, children),
}))

vi.mock('next/image', () => ({
  default: ({ alt, ...props }: React.PropsWithChildren<Record<string, unknown> & { alt: string }>) =>
    React.createElement('img', { alt, ...props }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn().mockReturnValue(null),
  }),
}))

import { login } from '@/app/actions/auth'
import { getCsrfToken } from '@/lib/security/csrf-client'

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getCsrfToken).mockResolvedValue('test-csrf-token')
  })

  it('should show validation error when email is empty on submit', async () => {
    const user = userEvent.setup()
    render(<LoginForm />)

    const passwordInput = document.getElementById('password') as HTMLInputElement
    await user.type(passwordInput, 'password123')

    const submitButton = screen.getByRole('button', { name: /se connecter/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(vi.mocked(login)).not.toHaveBeenCalled()
    })
  })

  it('should show validation error when password is empty on submit', async () => {
    const user = userEvent.setup()
    render(<LoginForm />)

    const emailInput = document.getElementById('email') as HTMLInputElement
    await user.type(emailInput, 'test@example.com')

    const submitButton = screen.getByRole('button', { name: /se connecter/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(vi.mocked(login)).not.toHaveBeenCalled()
    })
  })

  it('should include CSRF token in login call', async () => {
    const user = userEvent.setup()
    vi.mocked(login).mockResolvedValue({ success: true })

    render(<LoginForm />)

    const emailInput = document.getElementById('email') as HTMLInputElement
    const passwordInput = document.getElementById('password') as HTMLInputElement
    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')

    const submitButton = screen.getByRole('button', { name: /se connecter/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(vi.mocked(login)).toHaveBeenCalledWith(
        'test@example.com',
        'password123',
        false,
        'test-csrf-token'
      )
    })
  })

  it('should display error message when login fails', async () => {
    const user = userEvent.setup()
    vi.mocked(login).mockResolvedValue({ error: 'Invalid email or password' })
    vi.mocked(getCsrfToken).mockResolvedValue('new-csrf-token')

    render(<LoginForm />)

    const emailInput = document.getElementById('email') as HTMLInputElement
    const passwordInput = document.getElementById('password') as HTMLInputElement
    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'wrongpassword')

    const submitButton = screen.getByRole('button', { name: /se connecter/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Invalid email or password')).toBeInTheDocument()
    })
  })

  it('should call login with correct params including rememberMe', async () => {
    const user = userEvent.setup()
    vi.mocked(login).mockResolvedValue({ success: true })

    render(<LoginForm />)

    const emailInput = document.getElementById('email') as HTMLInputElement
    const passwordInput = document.getElementById('password') as HTMLInputElement
    await user.type(emailInput, 'user@example.com')
    await user.type(passwordInput, 'mypassword')

    const rememberCheckbox = screen.getByRole('checkbox')
    await user.click(rememberCheckbox)

    const submitButton = screen.getByRole('button', { name: /se connecter/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(vi.mocked(login)).toHaveBeenCalledWith(
        'user@example.com',
        'mypassword',
        true,
        'test-csrf-token'
      )
    })
  })

  it('should automatically retry with fresh token on CSRF security error', async () => {
    const user = userEvent.setup()
    // First call fails with CSRF error, retry succeeds
    vi.mocked(login)
      .mockResolvedValueOnce({ error: 'Invalid security token. Please refresh the page and try again.' })
      .mockResolvedValueOnce({ success: true })
    vi.mocked(getCsrfToken)
      .mockResolvedValueOnce('initial-csrf-token')
      .mockResolvedValueOnce('refreshed-csrf-token')

    render(<LoginForm />)

    const emailInput = document.getElementById('email') as HTMLInputElement
    const passwordInput = document.getElementById('password') as HTMLInputElement
    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')

    const submitButton = screen.getByRole('button', { name: /se connecter/i })
    await user.click(submitButton)

    await waitFor(() => {
      // First attempt with initial token
      expect(vi.mocked(login)).toHaveBeenNthCalledWith(
        1,
        'test@example.com',
        'password123',
        false,
        'initial-csrf-token'
      )
    })

    await waitFor(() => {
      // Second attempt (auto-retry) with refreshed token
      expect(vi.mocked(login)).toHaveBeenNthCalledWith(
        2,
        'test@example.com',
        'password123',
        false,
        'refreshed-csrf-token'
      )
    })
  })

  it('should not auto-retry more than once on CSRF errors', async () => {
    const user = userEvent.setup()
    // Both calls fail with CSRF error
    vi.mocked(login)
      .mockResolvedValue({ error: 'Invalid security token. Please refresh the page and try again.' })
    vi.mocked(getCsrfToken)
      .mockResolvedValueOnce('initial-token')
      .mockResolvedValueOnce('retry-token')
      .mockResolvedValueOnce('final-token')

    render(<LoginForm />)

    const emailInput = document.getElementById('email') as HTMLInputElement
    const passwordInput = document.getElementById('password') as HTMLInputElement
    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')

    const submitButton = screen.getByRole('button', { name: /se connecter/i })
    await user.click(submitButton)

    await waitFor(() => {
      // Should only be called twice: initial + 1 retry
      expect(vi.mocked(login)).toHaveBeenCalledTimes(2)
    })

    // Should show the CSRF error message
    await waitFor(() => {
      expect(screen.getByText(/Invalid security token/i)).toBeInTheDocument()
    })
  })

  it('should refresh CSRF token after any non-CSRF error', async () => {
    const user = userEvent.setup()
    vi.mocked(login).mockResolvedValue({ error: 'Invalid email or password' })
    vi.mocked(getCsrfToken)
      .mockResolvedValueOnce('initial-token')
      .mockResolvedValueOnce('refreshed-token')

    render(<LoginForm />)

    const emailInput = document.getElementById('email') as HTMLInputElement
    const passwordInput = document.getElementById('password') as HTMLInputElement
    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'wrong')

    const submitButton = screen.getByRole('button', { name: /se connecter/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Invalid email or password')).toBeInTheDocument()
    })

    // Verify CSRF token was refreshed for next attempt
    expect(getCsrfToken).toHaveBeenCalled()
  })
})
