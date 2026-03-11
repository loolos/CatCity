# AutoSprite MCP 使用说明

AutoSprite 通过 MCP 提供 AI 精灵表生成，配置已在 `.cursor/mcp.json` 中。重载 MCP 后，Agent 可调用以下工具。

## 确保已连接

- 在 Cursor 中执行 **Reload MCP** 或重启 Cursor，使 `autosprite` 出现在 MCP 列表。
- 若仍无 autosprite，检查 API Key 是否有效、网络是否可访问 `https://www.autosprite.io/api/mcp`。

## 可用工具（19 个）

### 账户

| 工具 | 说明 |
|------|------|
| `get_account` | 查看积分余额（生成前建议先查） |

### 角色（Characters）

| 工具 | 说明 |
|------|------|
| `create_character` | 用文字描述创建新角色 |
| `get_character` | 获取指定角色详情（含精灵表） |
| `list_characters` | 分页/搜索列出你的角色 |

### 精灵表（Spritesheets）

| 工具 | 说明 |
|------|------|
| `generate_spritesheet` | 生成动画并导出精灵表（会返回用量信息） |
| `regenerate_spritesheet` | 从已有视频按不同尺寸重新生成精灵表（免费） |
| `get_spritesheet` | 获取某张精灵表及下载 URL |
| `list_spritesheets` | 列出某角色的精灵表 |

### 任务（Jobs）

| 工具 | 说明 |
|------|------|
| `get_job_status` | 查询精灵表导出任务状态 |
| `list_jobs` | 列出导出任务（用 jobId 查状态） |

### 资产（Assets，静态物体/道具）

| 工具 | 说明 |
|------|------|
| `create_asset` | 用描述创建新资产 |
| `get_asset` | 获取资产详情 |
| `list_assets` | 列出资产 |
| `generate_asset_preview` | 生成资产预览图 |
| `generate_asset_3d_model` | 从资产图生成 3D 模型 |
| `animate_asset` | 生成资产动画视频 |
| `generate_asset_spritesheet` | 从资产生成精灵表 |
| `get_asset_spritesheet` | 获取资产的精灵表 |
| `get_asset_job_status` | 查询资产生成任务状态 |

## 推荐流程（本项目中生成精灵表）

1. **查余额**：调用 `get_account` 确认积分。
2. **创建角色或资产**：
   - 角色动画：`create_character`（文字描述）→ 再 `generate_spritesheet` 选动画类型（idle, walk, run, jump, attack 等）。
   - 静态道具/设施（如鱼碗）：`create_asset`（描述）→ `generate_asset_spritesheet` 或 `generate_asset_preview`。
3. **查任务**：导出是异步的，用 `get_job_status` 或 `get_asset_job_status` 轮询直到完成。
4. **取文件**：用 `get_spritesheet` 或 `get_asset_spritesheet` 拿到下载 URL，再保存到 `public/assets/sprites/` 等目录。

## 示例（让 Agent 执行）

- “用 autosprite 查一下我账户余额。”
- “用 autosprite 创建一个 2D 小猫角色，并生成 idle 和 walk 的精灵表。”
- “用 autosprite 根据‘蓝色圆鱼缸、橙色小鱼’生成一个资产精灵表，导出后放到项目的 facilities 里。”

导出格式支持 Unity、Godot、GameMaker、Phaser、RPG Maker 等，可在生成或导出时指定。
