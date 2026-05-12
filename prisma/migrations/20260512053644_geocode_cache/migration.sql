-- CreateTable
CREATE TABLE "geocode_cache" (
    "key" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "response" JSONB NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "geocode_cache_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "geocode_usage" (
    "date" DATE NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "geocode_usage_pkey" PRIMARY KEY ("date")
);

-- CreateIndex
CREATE INDEX "geocode_cache_expires_at_idx" ON "geocode_cache"("expires_at");
