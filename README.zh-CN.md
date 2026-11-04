# Tracebrief

**把 HAR 抓包记录变成一份可在分享前审阅的网络报告。**

查看请求顺序、HTTP 错误、慢请求和重复路由，同时避免把原始 URL、请求头、Cookie 或载荷复制到报告中。可在浏览器或终端本地运行，无需账号、API 密钥、后端服务或第三方依赖。

[English](README.md) · [Tiếng Việt](README.vi.md) · [한국어](README.ko.md) · [日本語](README.ja.md) · [Español](README.es.md) · [Português](README.pt-BR.md) · [简体中文](README.zh-CN.md) · [ไทย](README.th.md) · [Français](README.fr.md)

[隐私处理约定](docs/PRIVACY.md) · [替代工具对比](docs/COMPARISON.md) · [贡献指南](CONTRIBUTING.md)

**[体验在线演示](https://hieunguyenak92.github.io/tracebrief/)**

![Tracebrief 展示虚构的网络请求记录](docs/demo.jpg)

## 快速体验

需要 **Node.js 22 或更高版本**。在检出的仓库目录中运行：

```sh
git clone https://github.com/hieunguyenak92/tracebrief.git
cd tracebrief
npm run dev
```

打开 [http://localhost:4173](http://localhost:4173)，选择虚构数据演示，或把 `.har` 文件拖到页面中。查看瀑布图，然后导出报告。无需安装额外依赖。

如需生成一个无需服务器即可打开的 HTML 文件：

```sh
npm run build
```

在浏览器中打开 `dist/index.html`。处理私密抓包记录时，请使用可信的本地副本。原始 HAR 留在你的设备上；应用不会上传文件，也不会将其持久保存到下一次页面加载。

## 能得到什么

- 请求瀑布图，可筛选 HTTP／网络错误、耗时至少一秒的请求，以及重复请求。
- 按类别显示被丢弃数据的数量，帮助你了解导出结果省略了什么。
- 用于 Issue 或 AI 编程助手的 Markdown、可独立打开的 HTML 报告，以及供 HAR 1.2 工具使用的重建 HAR。CLI 还支持导出 JSON 元数据。
- 浏览器与 CLI 共用分析核心。未知测量值保持未知，不作猜测。

“重复”指相同请求方法、源和路径在首次出现后再次出现；分组时忽略查询字符串。重复请求可能是有意为之。慢请求只是一项观察结果，不能据此诊断根本原因。

## 会分享哪些信息

Tracebrief **根据允许保留的元数据构建一份新报告**。它不会在修改原文件的同时，尝试猜测哪些字符串属于秘密信息。

| 保留 | 省略或替换 |
| --- | --- |
| 请求顺序、相对开始时间、耗时、等待及接收时间 | 绝对日期改为相对偏移；重建 HAR 的日期以 1970-01-01 为基准 |
| 有效状态码、字节大小、标准请求方法、固定内容分类 | 原始 URL、主机、路径、查询和片段替换为不暴露真实名称的源／路由别名 |
| 按源和路由分组的关系 | 省略请求头、Cookie、请求／响应正文及自定义字段 |

例如，一个 URL 会被导出为 `https://origin-1.invalid/route-2`。别名只用于关联本次分析中的请求，并不代表真实端点名称。只有明确开启**本地查看**开关后，才会显示原始 URL；原始 URL 从不进入导出结果。

**分享前请审阅每份导出文件。** 时间、大小、状态码和请求模式仍可能属于敏感信息。Tracebrief 不保证输出中没有个人信息，也不保证抓包记录具有匿名性。重建 HAR 无法重放会话，也无法诊断载荷或身份验证问题。详见完整的[隐私处理约定](docs/PRIVACY.md)。

## CLI

无需服务器，也不访问网络：

```sh
node bin/tracebrief.js public/samples/demo.har --format markdown
node bin/tracebrief.js capture.har --format html --output report.html
node bin/tracebrief.js capture.har --format har --output reconstructed.har
node bin/tracebrief.js capture.har --format json --output metadata.json
```

默认格式为 Markdown，写入标准输出。使用 `--help` 查看选项。不会覆盖已有输出文件，请选择新的路径。私密抓包记录应保存在仓库目录之外。

## 如何获取 HAR

1. 打开浏览器开发者工具的 Network 面板。
2. 复现问题，然后使用面板中的 HAR 导出命令。
3. 在可信的本地 Tracebrief 副本中打开已保存的文件。
4. 检查报告和被丢弃的数据，再审阅导出文件，确认后才发送。

Chrome 已经提供会排除部分敏感请求头的 HAR 导出功能。Tracebrief 进一步丢弃原始端点和正文，刻意缩小用于分享的信息范围。完整抓包记录可能包含凭据和个人数据。请参考 [Chrome Network 文档](https://developer.chrome.com/docs/devtools/network/reference)及[替代工具对比](docs/COMPARISON.md)。

## 限制

- 每份记录最多 **50 MiB** HAR JSON、**20,000 个条目**。
- 仅保留有效且在限定范围内的数值元数据。缺失或无效字段会被提示或标记为未知。
- 不支持实时抓包、重放、跨记录别名映射，也不会自动解释请求失败的原因。
- 去掉端点和正文也会损失调试细节。需要这些信息时，请使用 DevTools 或可信的私密调试渠道。
- 0.1 版为初始版本。对于已记录验证范围之外的浏览器与操作系统组合，仍需要使用反馈。

## 开发

```sh
npm test
npm run lint
npm run build
```

`public/core.js` 负责分析和导出，`public/app.js` 负责浏览器交互，`bin/tracebrief.js` 为 CLI。构建和开发脚本使用 Node 标准库。

报告问题时，请提供最小的**虚构数据**复现示例。不要将生产环境 HAR、访问令牌、客户载荷或私密端点附到公开 Issue 中。[贡献指南](CONTRIBUTING.md) · [安全政策](SECURITY.md)。

## 许可证

[MIT](LICENSE)。
