import { Box, Container, Typography } from '@mui/material';
import { SiteShell, PageHero, SectionIntro } from '@/components/website/SiteShell';
import { CTA } from '@/components/website/PageBlocks';
import { ResourceCards } from '@/components/website/ResourceCards';

export default function ResourcesPage() { return <SiteShell><PageHero eyebrow="RESOURCES" title="Practical ideas for better retention." description="Playbooks, product thinking and lifecycle inspiration for teams building digital products." /><Container maxWidth="lg" sx={{ py:{ xs:9, md:14 } }}><SectionIntro eyebrow="THE RESOURCE ROOM" title="A smarter way to think about engagement." /><ResourceCards /></Container><Box sx={{ bgcolor:'#241536', color:'#fff', py:10 }}><Container maxWidth="md"><Typography variant="h3" textAlign="center">Want retention ideas specific to your product?</Typography></Container></Box><CTA /></SiteShell>; }
