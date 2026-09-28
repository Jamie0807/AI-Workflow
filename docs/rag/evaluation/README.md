# RAG 检索评测 CLI

这个目录包含评测工具的命令契约和一个故意使用虚构 ID 的 JSONL 示例。`example.jsonl` 只用于检查解析器、命令参数和报告工具链，不是人工确认的质量基线；除非数据库和 Qdrant 中恰好创建了这些 `demo-*` ID，否则用它执行真实评测会明确失败。

## 命令契约

从仓库根目录运行：

```bash
pnpm --filter @ai-workflow/workflow evaluate:rag -- \
  --dataset docs/rag/evaluation/example.jsonl \
  --mode vector \
  --top-k 5 \
  --output-dir .tmp/rag-evaluation
```

`--dataset` 和至少一个 `--mode` 是必填参数。`--mode` 可重复，支持 `vector`、`fulltext` 和 `hybrid`；重复模式只执行一次。默认 `--top-k 5`，默认输出目录为 `.tmp/rag-evaluation`。`--threshold`、`--vector-weight` 的取值必须在 `0..1`，`--top-k` 必须是正整数。

可选参数：

- `--baseline <path>`：读取一个 JSON 报告，并按每个选中模式比较；报告可以是本 CLI 生成的 `reports` 数组，也可以是单模式 `EvaluationReport`。
- `--threshold <0..1>`：覆盖 Knowledge Base 中的默认阈值。
- `--vector-weight <0..1>`：覆盖 Knowledge Base 中的默认向量权重。
- `--top-k <positive integer>`：覆盖默认返回数量。
- `--output-dir <path>`：报告输出目录；相对路径按仓库根目录解释。

参数和数据集在初始化 Prisma、Qdrant 或 Ollama 之前校验。缺少参数、非法模式、无法读取/解析 JSONL、Knowledge Base 不存在或配置不一致会报告明确原因并返回退出码 `2`。数据库、Qdrant、Ollama 或单条检索失败返回退出码 `1`；基线不兼容或质量指标回归也返回 `1`；无基线的报告生成成功返回 `0`。

## 数据格式

文件必须是 UTF-8 JSONL，每行一个对象：

```json
{
    "id": "sample-001",
    "query": "用户问题",
    "knowledgeBaseId": "kb-real-id",
    "relevantChunks": [{ "chunkId": "document-id_0", "relevance": 3 }]
}
```

字段要求：

- `id`、`query`、`knowledgeBaseId` 都是非空字符串，样例 ID 必须唯一。
- `relevantChunks` 是非空数组；`chunkId` 必须唯一，`relevance` 为 `1`、`2` 或 `3`。
- `chunkId` 应对应真实索引中的 chunk ID。当前文档处理器通常使用 `${documentId}_${chunkIndex}`，重新切分文档后需要复核标注。

## 环境和配置

CLI 按 JSONL 中出现的 `knowledgeBaseId` 查询 Knowledge Base，并读取其 embedding 模型、维度、阈值和向量权重。命令行显式参数只覆盖对应检索参数，不会改变数据库配置。当前实现支持 `ollama` embedding provider。

运行时环境变量：

- `DATABASE_URL`：PostgreSQL 连接串；未设置时使用应用默认连接串。
- `QDRANT_URL`：Qdrant 地址，默认 `http://localhost:6333`。
- `OLLAMA_BASE_URL`：Ollama 地址，默认 `http://localhost:11434`。

Qdrant collection 固定为 `knowledge_chunks`。CLI 只执行查询，不写入向量或修改 Knowledge Base。

## 报告

成功后生成：

- `report.json`：机器可读的顶层对象，`reports` 数组按模式保存完整评测结果；每个报告记录 Precision@K、Recall@K、MRR@K、nDCG@K、p50/p95 延迟、逐查询命中、数据集 SHA-256、Git revision、Knowledge Base、embedding 配置和 Qdrant collection。
- `report.md`：相同信息的可读摘要，包含每个模式的配置、质量指标、延迟、逐查询结果和基线失败详情。

没有提供基线时，工具只生成报告，不声称质量通过。提供基线时，数据集哈希、K、模式、Knowledge Base IDs 和检索配置必须一致；四项质量指标任一低于基线容忍范围即触发失败。延迟只报告，不参与默认质量门禁。
