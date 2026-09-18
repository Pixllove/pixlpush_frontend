'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, Grid, Skeleton, Typography } from '@mui/material';

const resources = [['GUIDE','The retention operating system','A practical framework for turning product behavior into repeatable growth.'],['PLAYBOOK','Seven journeys every subscription product needs','The moments that make activation, renewal and win-back measurable.'],['INSIGHT','Why generic campaigns stop working','How context creates relevance — and relevance earns attention.']];

export function ResourceCards() {
  const [loading, setLoading] = useState(true);
  useEffect(() => { const timer = setTimeout(() => setLoading(false), 500); return () => clearTimeout(timer); }, []);
  return <Grid container spacing={2}>{loading ? [1,2,3].map((item) => <Grid item xs={12} md={4} key={item}><Card sx={{ height: 245 }}><CardContent sx={{ p: 3.5 }}><Skeleton width="30%" /><Skeleton width="90%" height={45} sx={{ mt: 2 }} /><Skeleton /><Skeleton width="80%" /><Skeleton width="35%" sx={{ mt: 4 }} /></CardContent></Card></Grid>) : resources.map(([tag,title,desc]) => <Grid item xs={12} md={4} key={title}><Card sx={{ height:'100%', border:'1px solid #eee7f1' }}><CardContent sx={{ p:3.5 }}><Typography color="secondary" fontWeight={900} fontSize={11} letterSpacing=".12em">{tag}</Typography><Typography variant="h5" sx={{ mt:3, fontWeight:900 }}>{title}</Typography><Typography color="text.secondary" sx={{ mt:1.5, lineHeight:1.6 }}>{desc}</Typography><Typography color="primary" fontWeight={900} sx={{ mt:4 }}>Read resource →</Typography></CardContent></Card></Grid>)}</Grid>;
}
