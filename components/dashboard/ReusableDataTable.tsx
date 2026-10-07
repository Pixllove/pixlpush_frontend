'use client';

import { MoreHorizRounded } from '@mui/icons-material';
import { Box, Button, MenuItem, Select, Skeleton, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { ReactNode, useState } from 'react';

export type DataTableColumn<T> = { key: keyof T | string; label: string; render?: (row: T) => ReactNode; align?: 'left' | 'right' | 'center' };

type ReusableDataTableProps<T extends { id: string }> = {
  columns: DataTableColumn<T>[];
  rows: T[];
  totalCount: number | string;
  noun?: string;
  emptyMessage?: string;
  showMenu?: boolean;
  loading?: boolean;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
  onNextPage?: () => void;
  onPreviousPage?: () => void;
  page?: number;
  serverPageSize?: number;
};

export default function ReusableDataTable<T extends { id: string }>({ columns, rows, totalCount, noun = 'items', emptyMessage = 'No records found.', showMenu = true, loading = false, hasNextPage = false, hasPreviousPage = false, onNextPage, onPreviousPage, page = 1, serverPageSize }: ReusableDataTableProps<T>) {
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const visibleRows = rows.slice(0, rowsPerPage);
  const rangeStart = visibleRows.length ? (serverPageSize ? (page - 1) * serverPageSize + 1 : 1) : 0;
  const rangeEnd = visibleRows.length ? rangeStart + visibleRows.length - 1 : 0;
  return <Box className="reusable-table-wrap"><Table size="small" className="users-table"><TableHead><TableRow>{columns.map(column => <TableCell key={String(column.key)} align={column.align}>{column.label}</TableCell>)}{showMenu && <TableCell />}</TableRow></TableHead><TableBody>{loading ? Array.from({ length: 5 }, (_, index) => <TableRow key={`skeleton-${index}`}>{columns.map(column => <TableCell key={String(column.key)} align={column.align}><Skeleton variant="text" width={index % 2 ? '78%' : '92%'} /></TableCell>)}{showMenu && <TableCell><Skeleton variant="circular" width={20} height={20} /></TableCell>}</TableRow>) : visibleRows.length ? visibleRows.map(row => <TableRow hover key={row.id}>{columns.map(column => <TableCell key={String(column.key)} align={column.align}>{column.render ? column.render(row) : <Typography fontSize={12}>{String(row[column.key as keyof T] ?? '')}</Typography>}</TableCell>)}{showMenu && <TableCell align="right"><MoreHorizRounded fontSize="small" /></TableCell>}</TableRow>) : <TableRow><TableCell colSpan={columns.length + (showMenu ? 1 : 0)}><Typography className="table-empty">{emptyMessage}</Typography></TableCell></TableRow>}</TableBody></Table><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={1.5} className="table-footer"><Typography color="text.secondary" fontSize={11}>{loading ? <Skeleton width={180} /> : <>Showing {rangeStart}–{rangeEnd} of {totalCount} {noun}</>}</Typography><Stack direction="row" alignItems="center" gap={1}><Typography color="text.secondary" fontSize={11}>Rows</Typography><Select size="small" value={rowsPerPage} onChange={event => setRowsPerPage(Number(event.target.value))} className="rows-select compact"><MenuItem value={10}>10</MenuItem><MenuItem value={25}>25</MenuItem><MenuItem value={50}>50</MenuItem></Select><Button size="small" variant="outlined" disabled={!hasPreviousPage} onClick={onPreviousPage}>Previous</Button><Button size="small" variant="contained" disabled={!hasNextPage} onClick={onNextPage}>Next</Button></Stack></Stack></Box>;
}
