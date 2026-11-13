import GuideRoute, { guideMetadata, guideParams } from "@/components/docs/GuideRoute";

type Props = { params: { guide?: string[] } };

export const dynamicParams = false;
export const generateStaticParams = () => guideParams("react-native");
export const generateMetadata = ({ params }: Props) => guideMetadata("react-native", params.guide);

export default function ReactNativeIntegrationPage({ params }: Props) {
  // The dashboard sidebar takes width, so the "On this page" column starts at xl.
  return <GuideRoute base="/dashboard/integrations" platformId="react-native" segments={params.guide} tocFrom="xl" />;
}
