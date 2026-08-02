# Flow 组件设置表单重构 - 策略模式实现

## 概述

本次重构使用**策略模式**实现了基于节点类型的动态表单系统，允许不同类型的节点使用不同的设置表单组件。所有表单均使用 `react-hook-form` 进行管理。

## 架构设计

### 核心组件

```
components/flow/settings/
├── types.ts                          # 类型定义
├── registry.ts                       # 策略注册器
├── dynamic-form-renderer.tsx         # 动态表单渲染器
├── index.tsx                         # Settings 主组件
└── forms/                            # 表单组件目录
    ├── index.ts                      # 表单导出
    ├── llm-settings-form.tsx         # LLM 节点表单
    ├── tool-settings-form.tsx        # Tool 节点表单
    └── condition-settings-form.tsx   # Condition 节点表单
```

### 1. 类型系统 (`types.ts`)

定义了核心接口：

- `NodeKind`: 节点类型联合类型
- `NodeSettingsFormProps<T>`: 表单组件属性接口
- `NodeSettingsFormComponent<T>`: 表单组件类型
- `NodeSettingsStrategy`: 策略接口

### 2. 策略注册器 (`registry.ts`)

实现了策略模式的注册器：

```typescript
class NodeSettingsRegistry implements NodeSettingsStrategy {
    register(nodeType, component) // 注册表单
    getFormComponent(nodeType) // 获取表单
    supports(nodeType) // 检查支持
}
```

自动注册了以下节点类型的表单：

- `llm` → LLMSettingsForm
- `tool` → ToolSettingsForm
- `condition` → ConditionSettingsForm

### 3. 动态表单渲染器 (`dynamic-form-renderer.tsx`)

负责根据节点类型动态渲染对应的表单组件，使用 `useMemo` 优化性能，避免在渲染时重复创建组件。

### 4. 表单组件

#### LLM 节点表单 (`llm-settings-form.tsx`)

配置字段：

- 模型选择（必填）
- 提示词（必填）
- 温度 (Temperature)
- 最大 Token 数

#### Tool 节点表单 (`tool-settings-form.tsx`)

配置字段：

- 工具名称（必填）
- 工具描述
- 参数配置（JSON 格式，带验证）

#### Condition 节点表单 (`condition-settings-form.tsx`)

配置字段：

- 条件表达式（必填）
- 描述

## 使用方式

### 添加新的节点类型表单

1. 在 `forms/` 目录创建新的表单组件：

```typescript
// forms/new-node-settings-form.tsx
export function NewNodeSettingsForm({ node, onSave }: NodeSettingsFormProps<NewNodeConfig>) {
    const { register, handleSubmit, formState: { errors } } = useForm<NewNodeConfig>({
        defaultValues: { /* ... */ }
    })

    return (
        <form onSubmit={handleSubmit(onSave)}>
            {/* 表单字段 */}
        </form>
    )
}
```

2. 在 `registry.ts` 中注册：

```typescript
import { NewNodeSettingsForm } from './forms'
nodeSettingsRegistry.register('newNode', NewNodeSettingsForm)
```

### 在 Settings 组件中使用

Settings 组件会自动根据选中节点的类型渲染对应的表单：

```typescript
<Settings node={selectedNode} />
```

## 优势

1. **可扩展性**：新增节点类型只需创建表单组件并注册即可
2. **类型安全**：完整的 TypeScript 类型支持
3. **解耦合**：各节点类型的表单相互独立
4. **统一管理**：所有表单使用 react-hook-form，API 一致
5. **性能优化**：使用 useMemo 避免不必要的组件重建

## 后续优化建议

1. 实现 `handleSave` 逻辑，将表单数据保存到节点配置中
2. 添加表单验证规则（已部分实现）
3. 考虑添加表单重置功能
4. 可以添加实时预览功能
5. 支持自定义验证规则注册

## 技术栈

- React 18+
- TypeScript
- react-hook-form v7
- Next.js 16
- Tailwind CSS
