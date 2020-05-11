#!/usr/bin/env node

// 交互式命令行
const inquirer = require('inquirer')
// 修改控制台字符串样式
const chalk = require('chalk')

// 读取根目录下的 template.json
const tplObj = require(`${__dirname}/../template`)

const question = [
  {
    name: 'name',
    type: 'input',
    message: '请输入模板名称',
    validate(val) {
      const keys = { ...tplObj, '': 'Name is required!' }
      const result = keys[val]
      return result || true
    },
  },
  {
    name: 'url',
    type: 'input',
    message: '请输入模板地址',
    validate(val) {
      return val ? true : 'The url is required!'
    },
  },
]

inquirer.prompt(question).then(({ name, url }) => {
  console.log(chalk.green(name + `: ` + url))
})
