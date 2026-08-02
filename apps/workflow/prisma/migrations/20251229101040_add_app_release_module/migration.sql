/*
  Warnings:

  - A unique constraint covering the columns `[apiKey]` on the table `apps` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "apps" ADD COLUMN     "apiKey" TEXT,
ADD COLUMN     "publishedWorkflowId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "apps_apiKey_key" ON "apps"("apiKey");

-- AddForeignKey
ALTER TABLE "apps" ADD CONSTRAINT "apps_publishedWorkflowId_fkey" FOREIGN KEY ("publishedWorkflowId") REFERENCES "workflows"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
