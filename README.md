# 码序 - JSON/XML/YAML 转换工具

一个基于 uTools 插件的多格式数据转换工具，支持 JSON、XML、YAML 三种数据格式之间的相互转换，以及格式化、压缩、转义等实用功能。

## ✨ 功能特性

### 🔄 格式转换
- **智能格式检测**：自动识别输入文本的格式（JSON/XML/YAML）
- **多格式互转**：支持 JSON ↔ XML ↔ YAML 之间的任意转换
- **智能格式化**：根据检测到的格式自动应用最佳格式化策略

### 🛠️ 文本处理
- **格式化**：美化代码结构，提高可读性
- **最小化**：压缩文本，去除多余空格和换行
- **转义/去转义**：处理特殊字符的转义
- **去注释**：移除代码中的注释内容

### 📝 编辑器功能
- **行号显示**：实时显示行号，支持滚动同步
- **错误定位**：精确定位语法错误的行列位置
- **语法高亮**：错误位置高亮显示
- **智能修复**：自动修复常见的语法问题

### 🔧 实用工具
- **文件读取**：支持直接读取本地文件
- **结果保存**：将处理结果保存为文件
- **一键复制**：快速复制处理结果到剪贴板
- **多种触发方式**：支持关键词、文件拖拽、剪贴板内容等多种启动方式

## 🚀 技术栈

- **前端框架**：React 19.0.0
- **构建工具**：Vite 6.0.11
- **XML 处理**：fast-xml-parser 5.2.5
- **YAML 处理**：js-yaml 4.1.0
- **插件平台**：uTools

## 📦 安装使用

### 开发环境

1. 克隆项目
```bash
git clone <repository-url>
cd 码序
```

2. 安装依赖
```bash
npm install
```

3. 启动开发服务器
```bash
npm run dev
```

4. 构建生产版本
```bash
npm run build
```

### uTools 插件安装

1. 构建项目后，将 `dist` 目录打包
2. 在 uTools 中安装本地插件
3. 或者从 uTools 插件市场搜索"码序"进行安装

## 🎯 使用方法

### 启动方式

1. **关键词启动**：
   - `JSON转换`、`json`
   - `YAML转换`、`yaml` 
   - `XML转换`、`xml`

2. **文件拖拽**：直接将文件拖拽到 uTools 中

3. **剪贴板内容**：复制内容后通过"格式转换"启动

### 操作流程

1. **输入数据**：粘贴或输入需要处理的文本
2. **选择操作**：点击相应的功能按钮
3. **查看结果**：处理结果会实时显示在编辑器中
4. **保存/复制**：使用底部按钮保存或复制结果

## 🔍 智能特性

### 格式检测算法
- 基于启发式评分系统
- 支持转义文本的格式识别
- 智能处理混合格式内容

### 错误处理
- 精确的错误位置定位
- 智能语法修复建议
- 多步骤容错处理机制

### 性能优化
- 大文件处理优化
- 实时行号计算
- 内存使用优化

## 📁 项目结构

```
码序/
├── src/
│   ├── JsonConvert/          # 主要转换组件
│   │   ├── index.jsx        # 核心逻辑
│   │   └── index.css        # 样式文件
│   ├── Read/                # 文件读取组件
│   ├── Write/               # 文件写入组件
│   └── App.jsx              # 应用入口
├── public/
│   ├── preload/
│   │   └── services.js      # Node.js 服务层
│   └── plugin.json          # uTools 插件配置
└── package.json
```

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request 来帮助改进这个项目！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🙏 致谢

- [uTools](https://u.tools/) - 优秀的桌面工具平台
- [fast-xml-parser](https://github.com/NaturalIntelligence/fast-xml-parser) - 高性能 XML 解析器
- [js-yaml](https://github.com/nodeca/js-yaml) - JavaScript YAML 解析器

---

如果这个工具对你有帮助，请给个 ⭐ Star 支持一下！
        
