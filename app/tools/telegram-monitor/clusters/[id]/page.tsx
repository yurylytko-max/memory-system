import TelegramMonitorClient from "../../telegram-monitor-client";

export default async function TelegramMonitorClusterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TelegramMonitorClient initialClusterId={Number(id)} initialTab="clusters" />;
}
