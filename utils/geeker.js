const fs = require('fs')
const fsp = fs.promises
const chalk = require('chalk')

const configPath = './geeker-config.json'

class UtilsGeeker {
  constructor() {
    this.geekerConfig = {}
  }

  checkInit() {
    if (!fs.existsSync(configPath)) {
      console.log(chalk.red('请先初始化项目'))
      console.log(chalk.green('请执行 geeker init'))
      return false
    }
    return true
  }

  async init() {
    this.geekerConfig = JSON.parse(await fsp.readFile('./geeker-config.json'))
  }
}

module.exports = UtilsGeeker
