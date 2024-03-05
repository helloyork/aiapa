# AIAPA - 亚马逊产品分析工具

AIAPA是一个基于Gemini驱动的亚马逊产品分析工具，目前处于开发阶段。它支持通过`get`指令下载商品数据，尽管还有待完善，但我们欢迎通过issue提出任何遇到的问题或建议。

## 安装指南

通过以下命令可以全局安装AIAPA：

```sh
npm install aiapa -g
```

## 使用说明

AIAPA可以通过命令行或代码接口启动，支持传入参数、调用命令、监听事件等功能。

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

## 更新

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