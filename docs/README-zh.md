
# AIAPA

这是一个亚马逊产品分析工具，使用Gemini驱动，目前还没有完成！

已经可以通过get指令下载商品数据

## Installation

可以通过以下代码安装AIAPA

```sh
npm install aiapa
```

## 使用

该包可以通过命令行或代码启动

### 通过命令行

在命令行中输入```aiapa get```启动一次任务

在命令之后加入-h获取命令帮助

一条示例任务，搜索laptop并且下载20个产品信息（以Best Seller排序），至多同时并行10个任务，下载前50条Reviews，最后输出到"./output"

```sh
aiapa get -q laptop -t 20 -mc 10 -r 5 -o "./output"
```

等待程序运行，最后查找当前目录下的output文件夹

### 通过代码

由于该包是基于ESM的，所以包无法在CJS上运行！也许我以后会想办法吧（以后:P

从aiapa获取导入，并且运行任务！

```javascript
import { app, Commands } from "aiapa";

app.setUserConfig({ // 进行配置，这些配置与上面的命令行等价
    query: "laptop",
    maxTask: 20,
    maxConcurrency: 10,
    maxReviews: 5,
    output: "./output"
})
    .load() // 载入配置
    .run(Commands.get); // 启动！

// 如果你想要在运行完成之后获取结果，可以对命令进行扩展
app.run({
    ...Commands.get
    action: async function(result){
        console.log(result);
    }
});
```

目前支持的命令：get, bin, bin clear

## 贡献

欢迎对储存库进行贡献！

## 许可

**不要用来做任何违法的事情！网络抓取实践应始终符合目标网站的服务条款和法律考虑**

> 使用MIT许可证
