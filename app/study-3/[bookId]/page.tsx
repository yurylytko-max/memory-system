import StudyThreeReader from "@/components/study-3/study-three-reader";

export default async function StudyThreeBookPage({
  params,
}: {
  params: Promise<{ bookId: string }>;
}) {
  const { bookId } = await params;
  return <StudyThreeReader bookId={bookId} />;
}
