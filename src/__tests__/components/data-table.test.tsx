import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/erp/data-table'

interface TestRow {
  id: number
  name: string
  email: string
}

const columns: ColumnDef<TestRow, unknown>[] = [
  { accessorKey: 'id', header: 'ID', id: 'id' },
  { accessorKey: 'name', header: 'Name', id: 'name' },
  { accessorKey: 'email', header: 'Email', id: 'email' },
]

const sampleData: TestRow[] = [
  { id: 1, name: 'Alice', email: 'alice@test.com' },
  { id: 2, name: 'Bob', email: 'bob@test.com' },
  { id: 3, name: 'Charlie', email: 'charlie@test.com' },
]

vi.mock('@/lib/hooks/use-breakpoint', () => ({
  useIsMobile: vi.fn().mockReturnValue(false),
}))

describe('DataTable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render table with data rows', () => {
    render(<DataTable columns={columns} data={sampleData} />)

    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.getByText('Charlie')).toBeInTheDocument()
    expect(screen.getByText('alice@test.com')).toBeInTheDocument()
  })

  it('should show empty state when no data', () => {
    render(<DataTable columns={columns} data={[]} />)

    expect(screen.getByText('Aucune donnée ne correspond à vos critères de recherche.')).toBeInTheDocument()
  })

  it('should toggle column visibility via dropdown', async () => {
    const user = userEvent.setup()
    render(<DataTable columns={columns} data={sampleData} />)

    const columnToggle = screen.getByRole('button', { name: /afficher ou masquer les colonnes/i })
    await user.click(columnToggle)

    await waitFor(() => {
      expect(screen.getByRole('menuitemcheckbox', { name: 'email' })).toBeInTheDocument()
    })

    const emailCheckbox = screen.getByRole('menuitemcheckbox', { name: 'email' })
    expect(emailCheckbox).toBeChecked()

    await user.click(emailCheckbox)

    await waitFor(() => {
      expect(screen.queryByText('alice@test.com')).not.toBeInTheDocument()
    })
  })
})
