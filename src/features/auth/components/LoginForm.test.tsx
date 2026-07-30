import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi, beforeEach } from 'vitest'

const signInWithPasswordMock = vi.fn()
const navigateMock = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args: unknown[]) => signInWithPasswordMock(...args),
    },
  },
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigateMock }
})

import { LoginForm } from './LoginForm'

describe('LoginForm', () => {
  beforeEach(() => {
    signInWithPasswordMock.mockReset()
    navigateMock.mockReset()
  })

  it('signs in with the entered credentials and redirects to /app/home', async () => {
    signInWithPasswordMock.mockResolvedValue({ data: { user: { id: 'u1' }, session: {} }, error: null })
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <LoginForm />
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText(/електронна пошта/i), 'test@example.com')
    await user.type(screen.getByLabelText(/пароль/i), 'password123')
    await user.click(screen.getByRole('button', { name: /увійти/i }))

    await waitFor(() => {
      expect(signInWithPasswordMock).toHaveBeenCalledWith({ email: 'test@example.com', password: 'password123' })
    })
    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/app/home', { replace: true })
    })
  })

  it('shows an error message and does not navigate on invalid credentials', async () => {
    signInWithPasswordMock.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials', code: 'invalid_credentials' },
    })
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <LoginForm />
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText(/електронна пошта/i), 'test@example.com')
    await user.type(screen.getByLabelText(/пароль/i), 'wrong-password')
    await user.click(screen.getByRole('button', { name: /увійти/i }))

    expect(await screen.findByText('Invalid login credentials')).toBeInTheDocument()
    expect(navigateMock).not.toHaveBeenCalled()
  })

  it('shows validation errors instead of calling Supabase when the form is empty', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <LoginForm />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: /увійти/i }))

    expect(await screen.findAllByText(/обов.язкове поле/i)).not.toHaveLength(0)
    expect(signInWithPasswordMock).not.toHaveBeenCalled()
  })
})
