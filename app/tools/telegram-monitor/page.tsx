const LOCAL_MONITOR_URL = "http://127.0.0.1:8000";

export default function TelegramMonitorPage() {
  const monitorUrl =
    process.env.TELEGRAM_MONITOR_URL ||
    (process.env.NODE_ENV === "production" ? "" : LOCAL_MONITOR_URL);

  return (
    <main
      data-testid="telegram-monitor-page"
      style={{
        minHeight: "calc(100vh - 56px)",
        background: "#f7f8fa",
        padding: 24,
        fontFamily: "system-ui",
      }}
    >
      <section
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          display: "grid",
          gap: 16,
        }}
      >
        <div>
          <p style={{ color: "#687385", margin: "0 0 6px" }}>Tools / research</p>
          <h1 style={{ fontSize: 30, margin: 0 }}>Telegram Monitor</h1>
          <p style={{ color: "#687385", maxWidth: 760 }}>
            Изолированный раздел для ревью локального MVP мониторинга Telegram. Данные
            мониторинга остаются в отдельной базе и не смешиваются с memory system.
          </p>
        </div>

        {monitorUrl ? (
          <iframe
            data-testid="telegram-monitor-frame"
            src={monitorUrl}
            title="Telegram Monitor"
            style={{
              width: "100%",
              minHeight: "calc(100vh - 210px)",
              border: "1px solid #dfe4ea",
              borderRadius: 8,
              background: "white",
            }}
          />
        ) : (
          <div
            data-testid="telegram-monitor-config"
            style={{
              border: "1px solid #dfe4ea",
              borderRadius: 8,
              background: "white",
              padding: 18,
              color: "#17202a",
            }}
          >
            <h2 style={{ marginTop: 0 }}>Monitor URL не настроен</h2>
            <p>
              Для production-ревью задайте переменную окружения{" "}
              <code>TELEGRAM_MONITOR_URL</code> с адресом запущенного мониторинга.
              Локально страница по умолчанию открывает <code>{LOCAL_MONITOR_URL}</code>.
            </p>
            <pre
              style={{
                whiteSpace: "pre-wrap",
                background: "#101820",
                color: "#f4f7f9",
                borderRadius: 8,
                padding: 12,
              }}
            >
              cd /Users/user/Documents/мониторинг
              {"\n"}python3 src/app.py --port 8000
            </pre>
          </div>
        )}
      </section>
    </main>
  );
}
