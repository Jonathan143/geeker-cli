#! /usr/bin/env node

const ora = require('ora')
const fs = require('fs')
const fsp = fs.promises
const { name, version } = require('../package.json')
const { mkdirsSync } = require('../utils/file')

class GeekerInit {
  constructor() {
    this.config = { name, version, dbDirPath: { bing: './geeker_db/bing/' } }
    this.init()
  }

  async init() {
    const loading = ora('初始化中...').start()
    try {
      await fsp.writeFile(
        './geeker-config.json',
        JSON.stringify(this.config, null, 2)
      )
      await mkdirsSync('./geeker_db')
      loading.succeed('初始化完成')
    } catch (error) {
      loading.fail('初始化失败')
      console.log(error)
    }
  }
}

new GeekerInit()
