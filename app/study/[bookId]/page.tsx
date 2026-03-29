import StudyReader from "@/components/study/study-reader";

export default async function StudyBookPage({
  params,
}: {
  params: Promise<{ bookId: string }>;
}) {
  const { bookId } = await params;

  return <StudyReader bookId={bookId} />;
}
