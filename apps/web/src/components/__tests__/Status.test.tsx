import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import Status from '../Status'

// Mock Header and Footer components
vi.mock('../Header', () => ({
  default: ({ showBackButton }: { showBackButton?: boolean }) => (
    <header data-testid="header">
      Header {showBackButton && '(with back button)'}
    </header>
  )
}))

vi.mock('../Footer', () => ({
  default: () => <footer data-testid="footer">Footer</footer>
}))

// Mock navigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
)

describe('Status Component', () => {
  beforeEach(() => {
    mockFetch.mockClear()
    mockNavigate.mockClear()
    vi.clearAllTimers()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the status page with loading state', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})) // Never resolves

    render(
      <TestWrapper>
        <Status />
      </TestWrapper>
    )

    expect(screen.getByText(/checking status/i)).toBeInTheDocument()
    expect(screen.getByText(/please wait while we check/i)).toBeInTheDocument()
  })

  it('displays live status when API is healthy', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
    })

    render(
      <TestWrapper>
        <Status />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText(/system live/i)).toBeInTheDocument()
      expect(screen.getByText(/all systems are operational/i)).toBeInTheDocument()
    })

    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('displays offline status and redirects when API is down', async () => {
    mockFetch
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'))

    render(
      <TestWrapper>
        <Status />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText(/system offline/i)).toBeInTheDocument()
      expect(screen.getByText(/system is currently unavailable/i)).toBeInTheDocument()
    })

    // Fast-forward time to trigger redirect
    vi.advanceTimersByTime(3000)

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/500', { replace: true })
    }, { timeout: 100 })
  })

  it('allows manual refresh of status', async () => {
    const user = userEvent.setup({ delay: null })
    mockFetch
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: true })

    render(
      <TestWrapper>
        <Status />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText(/system live/i)).toBeInTheDocument()
    })

    const refreshButton = screen.getByRole('button', { name: /refresh status/i })
    await user.click(refreshButton)

    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('shows status details when available', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
    })

    render(
      <TestWrapper>
        <Status />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText(/status details/i)).toBeInTheDocument()
      expect(screen.getByText(/operational/i)).toBeInTheDocument()
    })
  })

  it('displays error message when health check fails', async () => {
    mockFetch
      .mockRejectedValueOnce(new Error('Connection timeout'))
      .mockRejectedValueOnce(new Error('Connection timeout'))
      .mockRejectedValueOnce(new Error('Connection timeout'))

    render(
      <TestWrapper>
        <Status />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument()
    })
  })

  it('tries multiple health endpoints', async () => {
    mockFetch
      .mockRejectedValueOnce(new Error('Endpoint 1 failed'))
      .mockRejectedValueOnce(new Error('Endpoint 2 failed'))
      .mockResolvedValueOnce({ ok: true })

    render(
      <TestWrapper>
        <Status />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText(/system live/i)).toBeInTheDocument()
    })

    // Should have tried at least 2 endpoints before succeeding
    expect(mockFetch).toHaveBeenCalledTimes(3)
  })

  it('auto-refreshes status periodically', async () => {
    mockFetch.mockResolvedValue({ ok: true })

    render(
      <TestWrapper>
        <Status />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText(/system live/i)).toBeInTheDocument()
    })

    const initialCallCount = mockFetch.mock.calls.length

    // Fast-forward 30 seconds to trigger auto-refresh
    vi.advanceTimersByTime(30000)

    await waitFor(() => {
      expect(mockFetch.mock.calls.length).toBeGreaterThan(initialCallCount)
    })
  })

  it('stops auto-refresh after 10 attempts', async () => {
    const user = userEvent.setup({ delay: null })
    mockFetch.mockResolvedValue({ ok: true })

    render(
      <TestWrapper>
        <Status />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText(/system live/i)).toBeInTheDocument()
    })

    // Should show remaining auto-refreshes initially
    expect(screen.getByText(/auto-refreshing every 30 seconds/i)).toBeInTheDocument()
    expect(screen.getByText(/remaining/i)).toBeInTheDocument()

    // Fast-forward 10 auto-refreshes (10 * 30 seconds = 300 seconds)
    for (let i = 0; i < 10; i++) {
      vi.advanceTimersByTime(30000)
      await waitFor(() => {
        // Wait for the fetch to complete
      }, { timeout: 100 })
    }

    // Should show quota limit reached message
    await waitFor(() => {
      expect(screen.getByText(/auto-refresh limit reached/i)).toBeInTheDocument()
      expect(screen.getByText(/automatic refreshes have been disabled/i)).toBeInTheDocument()
    })

    // Manual refresh button should still work
    const refreshButton = screen.getByRole('button', { name: /refresh status/i })
    expect(refreshButton).toBeInTheDocument()
    expect(refreshButton).not.toBeDisabled()

    // Fast-forward more time - should not auto-refresh
    const callCountBefore = mockFetch.mock.calls.length
    vi.advanceTimersByTime(30000)
    
    // Give it a moment, then verify no new calls were made
    await new Promise(resolve => setTimeout(resolve, 100))
    expect(mockFetch.mock.calls.length).toBe(callCountBefore)

    // Manual refresh should still work
    await user.click(refreshButton)
    await waitFor(() => {
      expect(mockFetch.mock.calls.length).toBeGreaterThan(callCountBefore)
    })
  })

  it('shows remaining auto-refresh count', async () => {
    mockFetch.mockResolvedValue({ ok: true })

    render(
      <TestWrapper>
        <Status />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText(/system live/i)).toBeInTheDocument()
    })

    // Initially should show 10 remaining (or close to it)
    expect(screen.getByText(/remaining/i)).toBeInTheDocument()

    // Trigger a few auto-refreshes
    for (let i = 0; i < 3; i++) {
      vi.advanceTimersByTime(30000)
      await waitFor(() => {
        // Wait for updates
      }, { timeout: 100 })
    }

    // Should still show remaining count (should be less than 10)
    await waitFor(() => {
      expect(screen.getByText(/remaining/i)).toBeInTheDocument()
    })
  })

  it('manual refresh does not count towards quota', async () => {
    const user = userEvent.setup({ delay: null })
    mockFetch.mockResolvedValue({ ok: true })

    render(
      <TestWrapper>
        <Status />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText(/system live/i)).toBeInTheDocument()
    })

    // Get initial remaining count
    const initialRemainingText = screen.getByText(/remaining/i).textContent

    // Manually refresh multiple times
    const refreshButton = screen.getByRole('button', { name: /refresh status/i })
    for (let i = 0; i < 5; i++) {
      await user.click(refreshButton)
      await waitFor(() => {
        // Wait for refresh to complete
      }, { timeout: 500 })
    }

    // Remaining count should not have changed (manual refreshes don't count)
    await waitFor(() => {
      const newRemainingText = screen.getByText(/remaining/i).textContent
      expect(newRemainingText).toBe(initialRemainingText)
    })
  })
})

