'use client';

import { MoreHorizRounded } from '@mui/icons-material';
import { Box, Button, MenuItem, Select, Skeleton, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';

// Runs before the browser paints, so a remembered height is in place on the very first frame.
const useBeforePaint = typeof window === 'undefined' ? useEffect : useLayoutEffect;
const ROW = 45;

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
  // While loading, the body is exactly as tall as it was the last time this list was shown (three rows, the
  // height of the empty state, the first time ever). The height is remembered across reloads, so the page
  // never grows a scrollbar for loading rows and loses it again when fewer real rows arrive.
  const body = useRef<HTMLTableSectionElement>(null);
  const memory = useRef('');
  const [bodyHeight, setBodyHeight] = useState(ROW * 3);
  useBeforePaint(() => {
    memory.current = `pixlpush:table-height:${window.location.pathname}:${noun}`;
    try { const saved = Number(window.localStorage.getItem(memory.current)); if (saved > 0) setBodyHeight(saved); } catch { /* storage blocked: the default stands */ }
  }, [noun]);
  useEffect(() => {
    if (loading || !body.current || !memory.current) return;
    const height = Math.min(body.current.offsetHeight, ROW * 25);
    if (height <= 0) return;
    setBodyHeight(height);
    try { window.localStorage.setItem(memory.current, String(height)); } catch { /* storage blocked */ }
  }, [loading, visibleRows.length, rowsPerPage]);
  const placeholderRows = Math.max(1, Math.round(bodyHeight / ROW));
  return <Box className="reusable-table-wrap"><Table size="small" className="users-table"><TableHead><TableRow>{columns.map(column => <TableCell key={String(column.key)} align={column.align}>{column.label}</TableCell>)}{showMenu && <TableCell />}</TableRow></TableHead><TableBody ref={body}>{loading ? Array.from({ length: placeholderRows }, (_, index) => <TableRow key={`skeleton-${index}`} className="table-skeleton-row" style={{ height: bodyHeight / placeholderRows }}>{columns.map(column => <TableCell key={String(column.key)} align={column.align}><Skeleton variant="text" width={index % 2 ? '78%' : '92%'} /></TableCell>)}{showMenu && <TableCell><Skeleton variant="circular" width={20} height={20} /></TableCell>}</TableRow>) : visibleRows.length ? visibleRows.map(row => <TableRow hover key={row.id}>{columns.map(column => <TableCell key={String(column.key)} align={column.align}>{column.render ? column.render(row) : <Typography fontSize={12}>{String(row[column.key as keyof T] ?? '')}</Typography>}</TableCell>)}{showMenu && <TableCell align="right"><MoreHorizRounded fontSize="small" /></TableCell>}</TableRow>) : <TableRow><TableCell colSpan={columns.length + (showMenu ? 1 : 0)}><Typography className="table-empty">{emptyMessage}</Typography></TableCell></TableRow>}</TableBody></Table><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={1.5} className="table-footer"><Typography color="text.secondary" fontSize={11}>{loading ? <Skeleton width={180} /> : <>Showing {rangeStart}–{rangeEnd} of {totalCount} {noun}</>}</Typography><Stack direction="row" alignItems="center" gap={1}><Typography color="text.secondary" fontSize={11}>Rows</Typography><Select size="small" value={rowsPerPage} onChange={event => setRowsPerPage(Number(event.target.value))} className="rows-select compact"><MenuItem value={10}>10</MenuItem><MenuItem value={25}>25</MenuItem><MenuItem value={50}>50</MenuItem></Select><Button size="small" variant="outlined" disabled={!hasPreviousPage} onClick={onPreviousPage}>Previous</Button><Button size="small" variant="contained" disabled={!hasNextPage} onClick={onNextPage}>Next</Button></Stack></Stack></Box>;
}
