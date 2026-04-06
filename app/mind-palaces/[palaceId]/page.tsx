import MindPalaceDetailClient from "@/components/mind-palaces/mind-palace-detail-client";

export default async function MindPalaceDetailPage({
  params,
}: {
  params: Promise<{ palaceId: string }>;
}) {
  const { palaceId } = await params;

  return <MindPalaceDetailClient palaceId={palaceId} />;
}
