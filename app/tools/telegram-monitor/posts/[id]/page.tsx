import TelegramMonitorClient from "../../telegram-monitor-client";

export default async function TelegramMonitorPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TelegramMonitorClient initialPostId={Number(id)} initialTab="posts" />;
}
