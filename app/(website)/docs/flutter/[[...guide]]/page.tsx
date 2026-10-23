import GuideRoute, { guideMetadata, guideParams } from "@/components/docs/GuideRoute";

type Props = { params: { guide?: string[] } };

export const dynamicParams = false;
export const generateStaticParams = () => guideParams("flutter");
export const generateMetadata = ({ params }: Props) => guideMetadata("flutter", params.guide);

export default function FlutterDocsPage({ params }: Props) {
  return <GuideRoute base="/docs" platformId="flutter" segments={params.guide} />;
}
