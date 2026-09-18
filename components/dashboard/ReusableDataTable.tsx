'use client';

import { MoreHorizRounded } from '@mui/icons-material';
import { Box, Button, MenuItem, Select, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { ReactNode, useState } from 'react';

export type DataTableColumn<T> = { key: keyof T | string; label: string; render?: (row: T) => ReactNode; align?: 'left' | 'right' | 'center' };

type ReusableDataTableProps<T extends { id: string }> = {
  columns: DataTableColumn<T>[];
  rows: T[];
  totalCount: number | string;
  noun?: string;
  emptyMessage?: string;
};

export default function ReusableDataTable<T extends { id: string }>({ columns, rows, totalCount, noun = 'items', emptyMessage = 'No records found.' }: ReusableDataTableProps<T>) {
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const visibleRows = rows.slice(0, rowsPerPage);
  return <Box className="reusable-table-wrap"><Table size="small" className="users-table"><TableHead><TableRow>{columns.map(column => <TableCell key={String(column.key)} align={column.align}>{column.label}</TableCell>)}<TableCell /></TableRow></TableHead><TableBody>{visibleRows.length ? visibleRows.map(row => <TableRow hover key={row.id}>{columns.map(column => <TableCell key={String(column.key)} align={column.align}>{column.render ? column.render(row) : <Typography fontSize={12}>{String(row[column.key as keyof T] ?? '')}</Typography>}</TableCell>)}<TableCell align="right"><MoreHorizRounded fontSize="small" /></TableCell></TableRow>) : <TableRow><TableCell colSpan={columns.length + 1}><Typography className="table-empty">{emptyMessage}</Typography></TableCell></TableRow>}</TableBody></Table><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={1.5} className="table-footer"><Typography color="text.secondary" fontSize={11}>Showing {visibleRows.length ? 1 : 0}–{visibleRows.length} of {totalCount} {noun}</Typography><Stack direction="row" alignItems="center" gap={1}><Typography color="text.secondary" fontSize={11}>Rows</Typography><Select size="small" value={rowsPerPage} onChange={event => setRowsPerPage(Number(event.target.value))} className="rows-select"><MenuItem value={10}>10</MenuItem><MenuItem value={25}>25</MenuItem><MenuItem value={50}>50</MenuItem></Select><Button size="small" variant="outlined" disabled>Previous</Button><Button size="small" variant="contained">Next</Button></Stack></Stack></Box>;
}
