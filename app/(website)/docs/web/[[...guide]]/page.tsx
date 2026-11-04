import GuideRoute, { guideMetadata, guideParams } from "@/components/docs/GuideRoute";

type Props = { params: { guide?: string[] } };

export const dynamicParams = false;
export const generateStaticParams = () => guideParams("web");
export const generateMetadata = ({ params }: Props) => guideMetadata("web", params.guide);

export default function WebDocsPage({ params }: Props) {
  return <GuideRoute base="/docs" platformId="web" segments={params.guide} />;
}
