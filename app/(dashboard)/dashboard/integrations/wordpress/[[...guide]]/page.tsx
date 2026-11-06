import GuideRoute, { guideMetadata, guideParams } from "@/components/docs/GuideRoute";

type Props = { params: { guide?: string[] } };

export const dynamicParams = false;
export const generateStaticParams = () => guideParams("wordpress");
export const generateMetadata = ({ params }: Props) => guideMetadata("wordpress", params.guide);

export default function WordPressIntegrationPage({ params }: Props) {
  return <GuideRoute base="/dashboard/integrations" platformId="wordpress" segments={params.guide} tocFrom="xl" />;
}
