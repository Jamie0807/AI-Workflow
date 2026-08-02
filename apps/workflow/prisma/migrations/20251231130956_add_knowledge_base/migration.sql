/*
  Warnings:

  - You are about to drop the column `publishedWorkflowId` on the `apps` table. All the data in the column will be lost.
  - You are about to drop the column `isPublished` on the `workflows` table. All the data in the column will be lost.
  - You are about to drop the column `publishedAt` on the `workflows` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "RetrievalMode" AS ENUM ('VECTOR', 'FULLTEXT', 'HYBRID');

-- CreateEnum
CREATE TYPE "KnowledgeBaseStatus" AS ENUM ('READY', 'INDEXING', 'ERROR');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'ERROR');

-- DropForeignKey
ALTER TABLE "apps" DROP CONSTRAINT "apps_publishedWorkflowId_fkey";

-- AlterTable
ALTER TABLE "apps" DROP COLUMN "publishedWorkflowId",
ADD COLUMN     "activePublishedId" TEXT;

-- AlterTable
ALTER TABLE "workflows" DROP COLUMN "isPublished",
DROP COLUMN "publishedAt";

-- CreateTable
CREATE TABLE "published_apps" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "nodes" JSONB NOT NULL,
    "edges" JSONB NOT NULL,
    "appId" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedBy" TEXT,

    CONSTRAINT "published_apps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_executions" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "status" "ExecutionStatus" NOT NULL DEFAULT 'RUNNING',
    "inputs" JSONB,
    "outputs" JSONB,
    "error" TEXT,
    "duration" INTEGER,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "nodeTraces" JSONB,
    "publishedAppId" TEXT NOT NULL,
    "apiKeyId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "app_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_bases" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT NOT NULL DEFAULT '📚',
    "embeddingModel" TEXT NOT NULL DEFAULT 'mxbai-embed-large:latest',
    "embeddingProvider" TEXT NOT NULL DEFAULT 'ollama',
    "dimensions" INTEGER NOT NULL DEFAULT 1024,
    "chunkSize" INTEGER NOT NULL DEFAULT 500,
    "chunkOverlap" INTEGER NOT NULL DEFAULT 50,
    "retrievalMode" "RetrievalMode" NOT NULL DEFAULT 'VECTOR',
    "vectorWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "topK" INTEGER NOT NULL DEFAULT 5,
    "threshold" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "documentCount" INTEGER NOT NULL DEFAULT 0,
    "chunkCount" INTEGER NOT NULL DEFAULT 0,
    "status" "KnowledgeBaseStatus" NOT NULL DEFAULT 'READY',
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_bases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "content" TEXT,
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "chunkCount" INTEGER NOT NULL DEFAULT 0,
    "processedAt" TIMESTAMP(3),
    "knowledgeBaseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "published_apps_appId_idx" ON "published_apps"("appId");

-- CreateIndex
CREATE INDEX "published_apps_version_idx" ON "published_apps"("version");

-- CreateIndex
CREATE UNIQUE INDEX "published_apps_appId_version_key" ON "published_apps"("appId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "app_executions_executionId_key" ON "app_executions"("executionId");

-- CreateIndex
CREATE INDEX "app_executions_publishedAppId_idx" ON "app_executions"("publishedAppId");

-- CreateIndex
CREATE INDEX "app_executions_apiKeyId_idx" ON "app_executions"("apiKeyId");

-- CreateIndex
CREATE INDEX "app_executions_status_idx" ON "app_executions"("status");

-- CreateIndex
CREATE INDEX "app_executions_startedAt_idx" ON "app_executions"("startedAt");

-- CreateIndex
CREATE INDEX "knowledge_bases_userId_idx" ON "knowledge_bases"("userId");

-- CreateIndex
CREATE INDEX "knowledge_bases_status_idx" ON "knowledge_bases"("status");

-- CreateIndex
CREATE INDEX "documents_knowledgeBaseId_idx" ON "documents"("knowledgeBaseId");

-- CreateIndex
CREATE INDEX "documents_status_idx" ON "documents"("status");

-- AddForeignKey
ALTER TABLE "apps" ADD CONSTRAINT "apps_activePublishedId_fkey" FOREIGN KEY ("activePublishedId") REFERENCES "published_apps"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "published_apps" ADD CONSTRAINT "published_apps_appId_fkey" FOREIGN KEY ("appId") REFERENCES "apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_executions" ADD CONSTRAINT "app_executions_publishedAppId_fkey" FOREIGN KEY ("publishedAppId") REFERENCES "published_apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_executions" ADD CONSTRAINT "app_executions_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "api_keys"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_bases" ADD CONSTRAINT "knowledge_bases_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_knowledgeBaseId_fkey" FOREIGN KEY ("knowledgeBaseId") REFERENCES "knowledge_bases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
