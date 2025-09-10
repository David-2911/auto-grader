import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Checkbox,
  TableSortLabel,
  Typography,
  Box,
} from '@mui/material';
import { TableColumn } from '@/types';

interface DataTableProps<T = any> {
  columns: TableColumn<T>[];
  data: T[];
  loading?: boolean;
  selectable?: boolean;
  selectedRows?: string[];
  onSelectionChange?: (selected: string[]) => void;
  sortable?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (field: string, order: 'asc' | 'desc') => void;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    onPageChange: (page: number) => void;
    onLimitChange: (limit: number) => void;
  };
  emptyMessage?: string;
}

export const DataTable = <T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  selectable = false,
  selectedRows = [],
  onSelectionChange,
  sortable = true,
  sortBy,
  sortOrder = 'asc',
  onSort,
  pagination,
  emptyMessage = 'No data available',
}: DataTableProps<T>) => {
  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const allIds = data.map((row) => row.id?.toString() || '');
      onSelectionChange?.(allIds);
    } else {
      onSelectionChange?.([]);
    }
  };

  const handleSelectRow = (id: string) => {
    const currentIndex = selectedRows.indexOf(id);
    const newSelected = [...selectedRows];

    if (currentIndex === -1) {
      newSelected.push(id);
    } else {
      newSelected.splice(currentIndex, 1);
    }

    onSelectionChange?.(newSelected);
  };

  const handleSort = (field: string) => {
    if (!sortable || !onSort) return;
    
    const isAsc = sortBy === field && sortOrder === 'asc';
    onSort(field, isAsc ? 'desc' : 'asc');
  };

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            {selectable && (
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={
                    selectedRows.length > 0 && selectedRows.length < data.length
                  }
                  checked={data.length > 0 && selectedRows.length === data.length}
                  onChange={handleSelectAll}
                />
              </TableCell>
            )}
            {columns.map((column) => (
              <TableCell
                key={column.field as string}
                sortDirection={sortBy === column.field ? sortOrder : false}
                style={{ width: column.width }}
              >
                {sortable && column.sortable !== false ? (
                  <TableSortLabel
                    active={sortBy === column.field}
                    direction={sortBy === column.field ? sortOrder : 'asc'}
                    onClick={() => handleSort(column.field as string)}
                  >
                    {column.headerName}
                  </TableSortLabel>
                ) : (
                  column.headerName
                )}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={columns.length + (selectable ? 1 : 0)}>
                <Box display="flex" justifyContent="center" p={3}>
                  <Typography>Loading...</Typography>
                </Box>
              </TableCell>
            </TableRow>
          ) : data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length + (selectable ? 1 : 0)}>
                <Box display="flex" justifyContent="center" p={3}>
                  <Typography color="textSecondary">{emptyMessage}</Typography>
                </Box>
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, index) => {
              const isSelected = selectedRows.indexOf(row.id?.toString() || '') !== -1;
              
              return (
                <TableRow
                  key={row.id || index}
                  selected={isSelected}
                  hover
                >
                  {selectable && (
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={isSelected}
                        onChange={() => handleSelectRow(row.id?.toString() || '')}
                      />
                    </TableCell>
                  )}
                  {columns.map((column) => (
                    <TableCell key={column.field as string}>
                      {column.renderCell
                        ? column.renderCell({ row, value: row[column.field] })
                        : row[column.field]}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
      {pagination && (
        <TablePagination
          component="div"
          count={pagination.total}
          page={pagination.page - 1}
          onPageChange={(_, page) => pagination.onPageChange(page + 1)}
          rowsPerPage={pagination.limit}
          onRowsPerPageChange={(event) =>
            pagination.onLimitChange(parseInt(event.target.value, 10))
          }
          rowsPerPageOptions={[5, 10, 25, 50]}
        />
      )}
    </TableContainer>
  );
};

export default DataTable;
