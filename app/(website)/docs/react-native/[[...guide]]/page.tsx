import GuideRoute, { guideMetadata, guideParams } from "@/components/docs/GuideRoute";

type Props = { params: { guide?: string[] } };

export const dynamicParams = false;
export const generateStaticParams = () => guideParams("react-native");
export const generateMetadata = ({ params }: Props) => guideMetadata("react-native", params.guide);

export default function ReactNativeDocsPage({ params }: Props) {
  return <GuideRoute base="/docs" platformId="react-native" segments={params.guide} />;
}
