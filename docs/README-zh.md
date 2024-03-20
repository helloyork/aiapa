# AIAPA - 亚马逊产品分析工具

AIAPA是一个基于Gemini驱动的亚马逊产品分析工具，目前处于开发阶段。尽管还有待完善，但我们欢迎通过issue提出任何遇到的问题或建议。

该工具可能导致短时间的软封禁和永久的封禁！请在使用之前谨慎考虑，并且设置合理的任务量！

主要功能：  
使用get命令获取商品数据  
使用analyze命令对产品优缺点进行总结

## 安装指南

通过以下命令可以全局安装AIAPA：

```sh
npm install aiapa -g
```

## 使用说明

### Quick Start

1. 安装 [nodejs](https://nodejs.org/en/download/)  
2. 在终端中输入`npm install aiapa -g`  
3. 前往[Google AI Studio](https://makersuite.google.com/app/apikey) 并获取一个API密匙  
4. 输入 `aiapa start` 然后等待奇迹 :)  

AIAPA可以通过命令行或代码接口启动，支持传入参数、调用命令、监听事件等功能。

快速开始:  
```bash
aiapa start
```

### Get命令使用示例

- **命令行启动**：输入`aiapa get`启动任务，示例代码如下：

```sh
aiapa get -q laptop -t 20 -mc 10 -r 5 -o "./output"
```

使用--low-ram旗帜可以减少部分内存使用  
运行时请确保保留至少2GB的内存使用

- **代码接口启动**：示例代码如下，展示了配置、运行任务以及结果获取等功能：

```javascript
import { app, Commands } from "aiapa";

app.setUserConfig({
    query: "laptop",
    maxTask: 20,
    maxConcurrency: 10,
    maxReviews: 5,
    output: "./output"
}).load().run(Commands.get);

// 结果获取示例
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

### Analyze命令使用示例

- **命令行启动**：输入`aiapa analyze`启动一次分析任务

启动之后将会询问要分析的文件，这个文件应该是由get命令生成的符合规范的产品信息

允许使用--api-key传入多个api key来完成api key pool

- **代码接口启动**：从代码启动，需要传入file参数

```javascript
import { app, Commands } from "aiapa";

app.setUserConfig({
    file: "./laptop-result-2024-03-15_08-51-58.json",
    apiKey: ["AIxxxxxx"]
}).load().run(Commands.analyze);
```

## 更新

##  2024/3/15

本次更新添加了以下内容：

1. analyze command
2. Support the use of apikey pool

### 2024/3/5

本次更新添加了以下内容：  
1. 代理模式  
2. 低内存模式
3. 页面池
4. 有关bin的有用的子命令（whereis, list）

改动了以下内容：  
1. 增加错误处理和封禁检测
2. 增加部分API
3. 处理部分意外崩溃
4. 解决了页面加载问题
5. 优化速度

## 贡献与许可

欢迎对AIAPA项目做出贡献。请确保您的使用符合目标网站的服务条款和相关法律规定。AIAPA遵循MIT许可证发布。
