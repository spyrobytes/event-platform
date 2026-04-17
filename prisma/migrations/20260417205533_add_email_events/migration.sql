-- CreateTable
CREATE TABLE "email_events" (
    "id" TEXT NOT NULL,
    "provider_message_id" TEXT,
    "event_type" TEXT NOT NULL,
    "recipient_email" TEXT,
    "payload" JSONB NOT NULL,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "email_events_provider_message_id_idx" ON "email_events"("provider_message_id");

-- CreateIndex
CREATE INDEX "email_events_event_type_idx" ON "email_events"("event_type");
