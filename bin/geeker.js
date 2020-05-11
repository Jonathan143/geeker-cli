#!/usr/bin/env node
const program = require('commander')

// 定义当前版本
// 定义使用方法
// 定义四个指令
program
  .version(require('../package.json').version)
  .usage('<command> [options]')
  .command('add', 'add a new template')
  .command('delete', 'delete a template')
  .command('list', 'list all templates')
  .command('init', 'gengrate a new project from a template')
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
