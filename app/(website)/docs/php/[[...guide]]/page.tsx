import GuideRoute, { guideMetadata, guideParams } from "@/components/docs/GuideRoute";

type Props = { params: { guide?: string[] } };

export const dynamicParams = false;
export const generateStaticParams = () => guideParams("php");
export const generateMetadata = ({ params }: Props) => guideMetadata("php", params.guide);

export default function PhpDocsPage({ params }: Props) {
  return <GuideRoute base="/docs" platformId="php" segments={params.guide} />;
}
