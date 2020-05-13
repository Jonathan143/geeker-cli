#! /usr/bin/env node

// 交互式命令行
const inquirer = require('inquirer')
// 修改控制台字符串样式
const chalk = require('chalk')
const ora = require('ora')
const fs = require('fs')
const fsp = fs.promises

// 读取根目录下的 template.json
const tplObj = require(`${__dirname}/../template`)

const question = [
  {
    name: 'name',
    type: 'input',
    message: '请输入模板名称',
    validate(val) {
      if (val.includes('/')) return '不能包含 /'
      const keys = { ...tplObj, '': 'Name is required!' }
      const result = keys[val]
      return result || true
    },
  },
]

inquirer.prompt(question).then(
  async ({ name, url }) => {
    const loading = ora('downloading template ...')
    loading.start()
    const path = `./${name}`
    try {
      if (!(await fs.existsSync(path))) {
        await fsp.mkdir(path)
      } else {
        loading.fail('fail')
        console.log(chalk.red('创建文件失败'))
        return
      }
      loading.succeed()
    } catch (error) {}
  },
  (error) => {
    loading.fail('fail')
    console.log(chalk.red(error))
  }
)
