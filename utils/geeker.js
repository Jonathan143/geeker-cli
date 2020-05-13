const fs = require('fs')
const chalk = require('chalk')

const checkInit = () => {
  if (!fs.existsSync('./geeker-config.json')) {
    console.log(chalk.red('请先初始化项目'))
    console.log(chalk.green('请执行 geeker init'))
    return false
  }
  return true
}

module.exports = {
  checkInit,
}
