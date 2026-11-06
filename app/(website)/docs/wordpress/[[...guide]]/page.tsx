import GuideRoute, { guideMetadata, guideParams } from "@/components/docs/GuideRoute";

type Props = { params: { guide?: string[] } };

export const dynamicParams = false;
export const generateStaticParams = () => guideParams("wordpress");
export const generateMetadata = ({ params }: Props) => guideMetadata("wordpress", params.guide);

export default function WordPressDocsPage({ params }: Props) {
  return <GuideRoute base="/docs" platformId="wordpress" segments={params.guide} />;
}
