#! /usr/bin/env node

// 交互式命令行
const inquirer = require('inquirer')
// 修改控制台字符串样式
const chalk = require('chalk')
const ora = require('ora')
const fs = require('fs')
const fsp = fs.promises
const cheerio = require('cheerio')
const moment = require('moment')
const $request = require('../utils/api')
const { checkInit } = require('../utils/geeker')

const dbBingPath = './geeker_db/bing.json'

class GeekerBing {
  constructor() {
    if (!checkInit()) return

    this.question = [
      {
        name: 'action',
        type: 'list',
        message: '请选择操作',
        choices: [
          { name: '今日bing', value: 'todayBing' },
          { name: '批量下载到本地', value: 'downloadAll' },
        ],
        default: 0,
      },
    ]

    this.actionMethods = {
      todayBing: 'getTodayBing',
      downloadAll: 'downloadAllBing',
    }

    this.main()
  }

  async getTodayBing() {
    const loading = ora('正在获取中...').start()
    try {
      const data = await $request({
        api: 'http://cn.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1',
      })
      const { url, enddate, startdate, copyright } = data.images[0]
      const bingUrl = `https://cn.bing.com/${url}`
      loading.succeed('获取成功')
      const result = {
        url: bingUrl,
        enddate,
        startdate,
        title: copyright,
      }
      console.log(result)
      return result
    } catch (error) {
      loading.fail('获取失败')
    }
  }

  async downloadAllBing() {
    const loading = ora('正在获取中...').start()
    try {
      const data = await $request({
        api: 'https://bing.ioliu.cn/',
        param: { p: 1 || '' },
      })

      let list = []
      const $ = cheerio.load(data) //将html转换为可操作的节点
      $('.container .item .card').each(async (i, e) => {
        const enddate = e.children[2].children[1].children[1].children[0].data
        const urls = e.children[0].attribs.src
          .replace(/\?.+/, '')
          .replace('640x480', '1920x1080')

        list.push({
          url: urls.replace(/.+bing\//, 'https://cn.bing.com/th?id=OHR.'),
          ioliuUrl: urls,
          // ioliuUrl拼接上?imagesilm 为压缩图片
          title: e.children[2].children[0].children[0].data,
          enddate,
          startdate: moment(enddate).subtract(1, 'days').format('YYYY-MM-DD'),
        }) //输出目录页查询出来的所有链接地址
      })

      loading.succeed('获取成功')
      let historyData = []

      if (fs.existsSync(dbBingPath)) {
        historyData = JSON.parse(await fsp.readFile(dbBingPath)) || []
      }
      await fsp.writeFile(
        dbBingPath,
        JSON.stringify([...historyData, ...list], null, 2)
      )
      return list
    } catch (error) {
      loading.fail('获取失败')
      console.log(error)
    }
  }

  async main() {
    try {
      const { action } = await inquirer.prompt(this.question)
      await this[this.actionMethods[action]]()
    } catch (error) {
      console.log(error)
    }
  }
}

new GeekerBing()
