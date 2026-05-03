import TelegramMonitorClient from "../../telegram-monitor-client";

export default async function TelegramMonitorSourcePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TelegramMonitorClient initialSourceId={Number(id)} initialTab="channels" />;
}
