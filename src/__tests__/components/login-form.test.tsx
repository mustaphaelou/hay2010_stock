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
}))

vi.mock('next/link', () => ({
  default: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('a', props, children),
}))

vi.mock('next/image', () => ({
  default: ({ alt, ...props }: React.PropsWithChildren<Record<string, unknown> & { alt: string }>) =>
    React.createElement('img', { alt, ...props }),
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
})
