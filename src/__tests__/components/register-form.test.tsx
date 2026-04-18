import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RegisterForm } from '@/components/register-form'

vi.mock('@/app/actions/registration', () => ({
  publicRegister: vi.fn(),
}))

vi.mock('next/link', () => ({
  default: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('a', props, children),
}))

vi.mock('next/image', () => ({
  default: ({ alt, ...props }: React.PropsWithChildren<Record<string, unknown> & { alt: string }>) =>
    React.createElement('img', { alt, ...props }),
}))

import { publicRegister } from '@/app/actions/registration'

describe('RegisterForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should show password too short requirement as unmet', async () => {
    const user = userEvent.setup()
    render(<RegisterForm />)

    const passwordInput = screen.getByLabelText(/^mot de passe$/i)
    await user.type(passwordInput, 'Sh1')

    expect(screen.getByText('Au moins 8 caractères').closest('div')).toHaveClass('text-muted-foreground')
  })

  it('should show missing uppercase requirement as unmet', async () => {
    const user = userEvent.setup()
    render(<RegisterForm />)

    const passwordInput = screen.getByLabelText(/^mot de passe$/i)
    await user.type(passwordInput, 'password123')

    expect(screen.getByText('Une lettre majuscule').closest('div')).toHaveClass('text-muted-foreground')
  })

  it('should show missing number requirement as unmet', async () => {
    const user = userEvent.setup()
    render(<RegisterForm />)

    const passwordInput = screen.getByLabelText(/^mot de passe$/i)
    await user.type(passwordInput, 'Passwordonly')

    expect(screen.getByText('Un chiffre').closest('div')).toHaveClass('text-muted-foreground')
  })

  it('should show password mismatch error when confirm password differs', async () => {
    const user = userEvent.setup()
    render(<RegisterForm />)

    const passwordInput = screen.getByLabelText(/^mot de passe$/i)
    await user.type(passwordInput, 'Password123')

    const confirmInput = screen.getByLabelText(/confirmer le mot de passe/i)
    await user.type(confirmInput, 'Different123')

    expect(screen.getByText('Les mots de passe ne correspondent pas')).toBeInTheDocument()
  })

  it('should show error when submitting with mismatched passwords', async () => {
    const user = userEvent.setup()
    render(<RegisterForm />)

    await user.type(screen.getByLabelText(/nom complet/i), 'John Doe')
    await user.type(screen.getByLabelText(/email/i), 'john@example.com')
    await user.type(screen.getByLabelText(/^mot de passe$/i), 'Password123')
    await user.type(screen.getByLabelText(/confirmer le mot de passe/i), 'Different123')

    const submitButton = screen.getByRole('button', { name: /créer un compte/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Les mots de passe ne correspondent pas')).toBeInTheDocument()
    })
    expect(vi.mocked(publicRegister)).not.toHaveBeenCalled()
  })

  it('should show success message on successful registration', async () => {
    const user = userEvent.setup()
    vi.mocked(publicRegister).mockResolvedValue({
      success: true,
      message: 'Account created successfully!',
    })

    render(<RegisterForm />)

    await user.type(screen.getByLabelText(/nom complet/i), 'John Doe')
    await user.type(screen.getByLabelText(/email/i), 'john@example.com')
    await user.type(screen.getByLabelText(/^mot de passe$/i), 'Password123')
    await user.type(screen.getByLabelText(/confirmer le mot de passe/i), 'Password123')

    const submitButton = screen.getByRole('button', { name: /créer un compte/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Compte créé !')).toBeInTheDocument()
    })
  })
})
