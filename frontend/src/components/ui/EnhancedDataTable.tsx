import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Paper,
  Checkbox,
  IconButton,
  Menu,
  MenuItem,
  TextField,
  InputAdornment,
  Toolbar,
  Typography,
  Button,
  Chip,
  Box,
  Tooltip,
  FormControl,
  Select,
  InputLabel,
  OutlinedInput,
  Avatar,
  LinearProgress,
  Alert,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  MoreVert as MoreVertIcon,
  FileDownload as ExportIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';

export interface Column {
  id: string;
  label: string;
  minWidth?: number;
  align?: 'right' | 'left' | 'center';
  sortable?: boolean;
  filterable?: boolean;
  type?: 'string' | 'number' | 'date' | 'boolean' | 'chip' | 'avatar' | 'actions';
  format?: (value: any) => string | React.ReactNode;
  renderCell?: (value: any, row: any) => React.ReactNode;
}

export interface DataTableProps {
  title?: string;
  columns: Column[];
  data: any[];
  loading?: boolean;
  error?: string;
  totalCount?: number;
  page?: number;
  rowsPerPage?: number;
  onPageChange?: (page: number) => void;
  onRowsPerPageChange?: (rowsPerPage: number) => void;
  onSort?: (column: string, direction: 'asc' | 'desc') => void;
  onFilter?: (filters: Record<string, any>) => void;
  onRefresh?: () => void;
  onExport?: () => void;
  onAdd?: () => void;
  onEdit?: (row: any) => void;
  onDelete?: (row: any) => void;
  onView?: (row: any) => void;
  selectable?: boolean;
  selectedRows?: any[];
  onSelectionChange?: (selectedRows: any[]) => void;
  bulkActions?: Array<{
    label: string;
    icon?: React.ReactNode;
    onClick: (selectedRows: any[]) => void;
  }>;
  searchable?: boolean;
  filterable?: boolean;
  exportable?: boolean;
  refreshable?: boolean;
  addable?: boolean;
  dense?: boolean;
  emptyMessage?: string;
}

const EnhancedDataTable: React.FC<DataTableProps> = ({
  title,
  columns,
  data,
  loading = false,
  error,
  totalCount = data.length,
  page = 0,
  rowsPerPage = 10,
  onPageChange,
  onRowsPerPageChange,
  onSort,
  onFilter,
  onRefresh,
  onExport,
  onAdd,
  onEdit,
  onDelete,
  onView,
  selectable = false,
  selectedRows = [],
  onSelectionChange,
  bulkActions = [],
  searchable = true,
  filterable = true,
  exportable = true,
  refreshable = true,
  addable = false,
  dense = false,
  emptyMessage = 'No data available',
}) => {
  const [orderBy, setOrderBy] = useState<string>('');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [filterMenuAnchor, setFilterMenuAnchor] = useState<null | HTMLElement>(null);
  const [actionMenuAnchor, setActionMenuAnchor] = useState<null | HTMLElement>(null);
  const [currentRow, setCurrentRow] = useState<any>(null);

  // Filter and search data
  const filteredData = useMemo(() => {
    let filtered = [...data];

    // Apply search
    if (searchText) {
      filtered = filtered.filter(row =>
        columns.some(column => {
          const value = row[column.id];
          if (value == null) return false;
          return String(value).toLowerCase().includes(searchText.toLowerCase());
        })
      );
    }

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== 'all') {
        filtered = filtered.filter(row => {
          const rowValue = row[key];
          if (Array.isArray(value)) {
            return value.includes(rowValue);
          }
          return rowValue === value;
        });
      }
    });

    return filtered;
  }, [data, searchText, filters, columns]);

  const handleSort = (columnId: string) => {
    const isAsc = orderBy === columnId && order === 'asc';
    const newOrder = isAsc ? 'desc' : 'asc';
    setOrder(newOrder);
    setOrderBy(columnId);
    onSort?.(columnId, newOrder);
  };

  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      onSelectionChange?.(filteredData);
    } else {
      onSelectionChange?.([]);
    }
  };

  const handleRowSelect = (row: any) => {
    const selectedIndex = selectedRows.findIndex(selected => selected.id === row.id);
    let newSelected: any[] = [];

    if (selectedIndex === -1) {
      newSelected = [...selectedRows, row];
    } else {
      newSelected = selectedRows.filter(selected => selected.id !== row.id);
    }

    onSelectionChange?.(newSelected);
  };

  const isSelected = (row: any) => selectedRows.some(selected => selected.id === row.id);

  const handleFilterChange = (columnId: string, value: any) => {
    const newFilters = { ...filters, [columnId]: value };
    setFilters(newFilters);
    onFilter?.(newFilters);
  };

  const renderCellContent = (column: Column, value: any, row: any) => {
    if (column.renderCell) {
      return column.renderCell(value, row);
    }

    switch (column.type) {
      case 'chip':
        return (
          <Chip
            label={value}
            size="small"
            color={getChipColor(value)}
            variant="outlined"
          />
        );
      case 'avatar':
        return (
          <Avatar
            src={value}
            alt={row.firstName + ' ' + row.lastName}
            sx={{ width: 32, height: 32 }}
          >
            {(row.firstName?.[0] || '') + (row.lastName?.[0] || '')}
          </Avatar>
        );
      case 'date':
        return new Date(value).toLocaleDateString();
      case 'boolean':
        return value ? 'Yes' : 'No';
      case 'actions':
        return (
          <Box>
            {onView && (
              <Tooltip title="View">
                <IconButton size="small" onClick={() => onView(row)}>
                  <ViewIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {onEdit && (
              <Tooltip title="Edit">
                <IconButton size="small" onClick={() => onEdit(row)}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {onDelete && (
              <Tooltip title="Delete">
                <IconButton 
                  size="small" 
                  onClick={() => onDelete(row)}
                  color="error"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <IconButton
              size="small"
              onClick={(event) => {
                setActionMenuAnchor(event.currentTarget);
                setCurrentRow(row);
              }}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
          </Box>
        );
      default:
        return column.format ? column.format(value) : value;
    }
  };

  const getChipColor = (value: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (value?.toLowerCase()) {
      case 'active':
      case 'success':
      case 'completed':
        return 'success';
      case 'inactive':
      case 'suspended':
      case 'error':
        return 'error';
      case 'pending':
      case 'warning':
        return 'warning';
      case 'draft':
      case 'info':
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      {/* Toolbar */}
      <Toolbar
        sx={{
          pl: { sm: 2 },
          pr: { xs: 1, sm: 1 },
          ...(selectedRows.length > 0 && {
            bgcolor: (theme) =>
              alpha(theme.palette.primary.main, theme.palette.action.activatedOpacity),
          }),
        }}
      >
        {selectedRows.length > 0 ? (
          <Typography
            sx={{ flex: '1 1 100%' }}
            color="inherit"
            variant="subtitle1"
            component="div"
          >
            {selectedRows.length} selected
          </Typography>
        ) : (
          <Typography
            sx={{ flex: '1 1 100%' }}
            variant="h6"
            component="div"
          >
            {title}
          </Typography>
        )}

        {selectedRows.length > 0 ? (
          <Box sx={{ display: 'flex', gap: 1 }}>
            {bulkActions.map((action, index) => (
              <Button
                key={index}
                variant="outlined"
                size="small"
                startIcon={action.icon}
                onClick={() => action.onClick(selectedRows)}
              >
                {action.label}
              </Button>
            ))}
          </Box>
        ) : (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {searchable && (
              <TextField
                size="small"
                placeholder="Search..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
                sx={{ minWidth: 200 }}
              />
            )}
            
            {filterable && (
              <IconButton onClick={(e) => setFilterMenuAnchor(e.currentTarget)}>
                <FilterIcon />
              </IconButton>
            )}
            
            {refreshable && (
              <IconButton onClick={onRefresh}>
                <RefreshIcon />
              </IconButton>
            )}
            
            {exportable && (
              <IconButton onClick={onExport}>
                <ExportIcon />
              </IconButton>
            )}
            
            {addable && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={onAdd}
                size="small"
              >
                Add
              </Button>
            )}
          </Box>
        )}
      </Toolbar>

      {loading && <LinearProgress />}

      {error && (
        <Alert severity="error" sx={{ m: 2 }}>
          {error}
        </Alert>
      )}

      {/* Table */}
      <TableContainer sx={{ maxHeight: 'calc(100vh - 200px)' }}>
        <Table stickyHeader aria-labelledby="tableTitle" size={dense ? 'small' : 'medium'}>
          <TableHead>
            <TableRow>
              {selectable && (
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selectedRows.length > 0 && selectedRows.length < filteredData.length}
                    checked={filteredData.length > 0 && selectedRows.length === filteredData.length}
                    onChange={handleSelectAllClick}
                  />
                </TableCell>
              )}
              {columns.map((column) => (
                <TableCell
                  key={column.id}
                  align={column.align}
                  style={{ minWidth: column.minWidth }}
                  sortDirection={orderBy === column.id ? order : false}
                >
                  {column.sortable ? (
                    <TableSortLabel
                      active={orderBy === column.id}
                      direction={orderBy === column.id ? order : 'asc'}
                      onClick={() => handleSort(column.id)}
                    >
                      {column.label}
                    </TableSortLabel>
                  ) : (
                    column.label
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + (selectable ? 1 : 0)} align="center">
                  <Typography variant="body2" color="textSecondary" sx={{ py: 4 }}>
                    {emptyMessage}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredData
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((row, index) => {
                  const isItemSelected = isSelected(row);
                  const labelId = `enhanced-table-checkbox-${index}`;

                  return (
                    <TableRow
                      hover
                      onClick={selectable ? () => handleRowSelect(row) : undefined}
                      role={selectable ? "checkbox" : undefined}
                      aria-checked={isItemSelected}
                      tabIndex={-1}
                      key={row.id || index}
                      selected={isItemSelected}
                      sx={{ cursor: selectable ? 'pointer' : 'default' }}
                    >
                      {selectable && (
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={isItemSelected}
                            inputProps={{
                              'aria-labelledby': labelId,
                            }}
                          />
                        </TableCell>
                      )}
                      {columns.map((column) => {
                        const value = row[column.id];
                        return (
                          <TableCell key={column.id} align={column.align}>
                            {renderCellContent(column, value, row)}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <TablePagination
        rowsPerPageOptions={[5, 10, 25, 50, 100]}
        component="div"
        count={totalCount}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={(_, newPage) => onPageChange?.(newPage)}
        onRowsPerPageChange={(event) => onRowsPerPageChange?.(parseInt(event.target.value, 10))}
      />

      {/* Filter Menu */}
      <Menu
        anchorEl={filterMenuAnchor}
        open={Boolean(filterMenuAnchor)}
        onClose={() => setFilterMenuAnchor(null)}
      >
        {columns
          .filter(column => column.filterable)
          .map((column) => (
            <MenuItem key={column.id} sx={{ minWidth: 200 }}>
              <FormControl fullWidth size="small">
                <InputLabel>{column.label}</InputLabel>
                <Select
                  value={filters[column.id] || ''}
                  onChange={(e) => handleFilterChange(column.id, e.target.value)}
                  input={<OutlinedInput label={column.label} />}
                >
                  <MenuItem value="">All</MenuItem>
                  {/* Add dynamic filter options based on column data */}
                </Select>
              </FormControl>
            </MenuItem>
          ))}
      </Menu>

      {/* Action Menu */}
      <Menu
        anchorEl={actionMenuAnchor}
        open={Boolean(actionMenuAnchor)}
        onClose={() => setActionMenuAnchor(null)}
      >
        <MenuItem onClick={() => { onView?.(currentRow); setActionMenuAnchor(null); }}>
          <ViewIcon fontSize="small" sx={{ mr: 1 }} />
          View Details
        </MenuItem>
        <MenuItem onClick={() => { onEdit?.(currentRow); setActionMenuAnchor(null); }}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={() => { onDelete?.(currentRow); setActionMenuAnchor(null); }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>
    </Paper>
  );
};

export default EnhancedDataTable;
