# AIAPA - 亚马逊产品的人工智能分析

AIAPA 是一款由 Gemini 驱动的亚马逊产品分析工具，目前正处于开发阶段。尽管它仍需改进，但我们欢迎通过问题遇到的任何问题或建议。

**此工具可导致短期软禁言和永久禁言！使用前请慎重考虑，并设置合理的任务量！**

主要功能：  
使用 get 命令获取产品数据
使用 analyze 命令总结产品的优缺点  
生成产品报告

## Instruction

### Quick Start

1. 安装 [nodejs](https://nodejs.org/en/download/)  
2. 前往 [Google AI Studio](https://makersuite.google.com/app/apikey) 并且获取一个API密匙  
3. 键入 `npm install aiapa -g` 在终端中  
4. 键入 `aiapa start` 然后享受 :)  



AIAPA 可通过命令行或代码界面启动，并支持传递参数、调用命令、监听事件等。

使用开始:  
```bash
aiapa start
```

或与Gemini对话(Beta)

```bash
aiapa chat
```

在会话中使用 .import 来导入产品数据

### 使用Get命令的示例

- **命令行启动**: 输入 `aiapa get` 启动任务，示例代码如下：

```sh
aiapa get -q laptop -t 20 -mc 10 -r 5 -o "./output"
```

使用 --low-ram 标记可减少部分内存使用量  
在运行中确保保留至少2GB的内存

- **代码接口启动**: 示例代码如下，演示了配置、运行任务和获取结果的功能：

```javascript
import { app, Commands } from "aiapa";

app.setUserConfig({
    query: "laptop",
    maxTask: 20,
    maxConcurrency: 10,
    maxReviews: 5,
    output: "./output"
}).load().run(Commands.get);

// 取得成果的实例
app.run({
    ...Commands.get,
    action: async function(result) {
        console.log(result);
    }
});

// 自定义选择器注册示例
app.on("beforeCommandRun", (cmd, mod) => {
    mod.registerDetailSelector("links", {
        querySelector: "a",
        evaluate: (el) => el.href
    });
}).run(Commands.get);
```

### Analyze命令用法示例

- **命令行启动**: 输入 `aiapa analyze` 开始分析任务

启动后，系统会要求您提供要分析的文件。该文件应是由 get 命令生成的符合规范的产品信息。

允许使用 --api-key 传递多个 api 密钥以完成 api 密钥池

例如 

```bash
aiapa analyze --api-key AIxxxxxxx AIxxxxxxx2
```

- **代码接口启动**: 从代码开始，您需要输入文件参数

```javascript
import { app, Commands } from "aiapa";

app.setUserConfig({
     file: "./laptop-result-2024-03-15_08-51-58.json"
}).load().run(Commands.analyze);
```

---

## Update

### 2024/3/25

This update added the following features:

1. chat command  
2. chat with Gemini  

Changed the following features:

1. fix null attr problem  
2. fix permission problems on unix-like systems  
3. idk, remove herobrine ▬_▬

### 2024/3/21

This update added the following features:

1. start command  
2. auto generate html as result  
3. add command bin open, this will open the bin dir in your ui (only macos and windows)

Changed the following features:

1. fix many problems  
2. support linux and macos  
3. better csv  
4. open file by selecting from ui or typing  
5. better bin command and bin dir permission check

### 2024/3/15

This update added the following features:

1. analyze command
2. Support the use of apikey pool

### 2024/3/5

This update added the following features:

1. Proxy mode
2. Low memory mode
3. Page pool
4. Useful subcommands for bin (whereis, list)

Changed the following features:

1. Added error handling and ban detection
2. Added some APIs
3. Handled some unexpected crashes
4. Fixed the page loading issue
5. Optimized speed

---

## 贡献与许可证

欢迎向 AIAPA 计划投稿。**请确保您的使用符合目标网站的服务条款和相关法律规定**。

> AIAPA 根据 MIT 许可发布。
