#! /usr/bin/env node
const program = require('commander')

// 定义当前版本
// 定义使用方法
// 定义四个指令
// action – 注册一个callback函数,这里需注意目前回调不支持let声明变量
program
  .version(require('../package.json').version)
  .usage('<command> [options]')
  .command('init', '初始化项目')
  .command('bing', '爬取每日bing壁纸')
  .command('mzitu', '爬取妹子图')
  .parse(process.argv)

// 当 command 没有描述参数，且 parse 方法使用链式调用会报错!!! （猜想：command 有 desc 参数时，返回的是 this，当没有 desc 参数时，返回的是新对象，根据 API Document 得出）
// 错误 !!!
// program
//   .version(require('../package.json').version)
//   .command('add')
//   .action(function (dir, cmd) {
//     console.log(dir, cmd)
//   })
//   .parse(process.argv)
