import GuideRoute, { guideMetadata, guideParams } from "@/components/docs/GuideRoute";

type Props = { params: { guide?: string[] } };

export const dynamicParams = false;
export const generateStaticParams = () => guideParams("flutter");
export const generateMetadata = ({ params }: Props) => guideMetadata("flutter", params.guide);

export default function FlutterIntegrationPage({ params }: Props) {
  return <GuideRoute base="/dashboard/integrations" platformId="flutter" segments={params.guide} tocFrom="xl" />;
}
