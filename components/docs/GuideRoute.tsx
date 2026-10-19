import type { ComponentType } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DocsPage from "./DocsPage";
import { reactNativeGuides } from "./react-native/guides-operate";
import type { GuideProps } from "./react-native/guides-setup";
import { getGuide, getPlatform } from "./registry";

// A new platform registers its renderers here, keyed by the slugs in registry.ts.
const renderers: Record<string, Record<string, ComponentType<GuideProps>>> = { "react-native": reactNativeGuides };

export function guideParams(platformId: string) {
  return (getPlatform(platformId)?.guides ?? []).map((guide) => ({ guide: guide.slug ? [guide.slug] : [] }));
}

export function guideMetadata(platformId: string, segments: string[] | undefined): Metadata {
  const guide = getGuide(platformId, segments?.[0] ?? "");
  const platform = getPlatform(platformId);
  if (!guide || !platform) return {};
  return { title: `${guide.title} · ${platform.label} | PixlPush Docs`, description: guide.description };
}

export default function GuideRoute({ base, platformId, segments, tocFrom }: { base: string; platformId: string; segments?: string[]; tocFrom?: "lg" | "xl" }) {
  const slug = segments?.[0] ?? "";
  const Guide = renderers[platformId]?.[slug];
  if (!Guide || segments?.length && segments.length > 1 || !getGuide(platformId, slug)) notFound();
  return <DocsPage base={base} platformId={platformId} slug={slug} tocFrom={tocFrom}><Guide base={base} /></DocsPage>;
}
