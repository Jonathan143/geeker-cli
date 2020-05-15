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
const UtilsGeeker = require('../utils/geeker')
const utilsGeeker = new UtilsGeeker()
const { mkdirsSync, saveNetworkFileSync } = require('../utils/file')

const UtilsDb = require('../utils/db')
const utilsDb = new UtilsDb()

class GeekerBing {
  constructor() {
    if (!utilsGeeker.checkInit()) return

    this.isSaveLocal = false
    this.BingDbDirPath = ''
    this.question = [
      {
        name: 'action',
        type: 'list',
        message: '请选择操作:',
        choices: [
          { name: '今日bing', value: 'todayBing' },
          { name: '批量下载到本地', value: 'downloadAll' },
        ],
        default: 0,
      },
    ]

    this.actionMethods = {
      todayBing: 'getTodayBing',
      downloadAll: 'inquirerDownloadAll',
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

  async inquirerDownloadAll() {
    let startIndex = 1
    const { endIndex, isSaveLocal } = await inquirer.prompt([
      {
        name: 'startIndex',
        type: 'input',
        message: '请输入开始页码:',
        validate: (input) => {
          startIndex = parseInt(input)
          return /^\d+$/.test(input) && input > 0
            ? true
            : '必须输入数字并且大于0'
        },
      },
      {
        name: 'endIndex',
        type: 'input',
        message: '请输入结束页码:',
        validate: (input) => {
          return /^\d+$/.test(input) && parseInt(input) >= startIndex
            ? true
            : '必须输入数字并且大于等于开始页码'
        },
      },
      {
        name: 'isSaveLocal',
        type: 'confirm',
        message: '是否保存图片至本地:',
      },
    ])

    this.isSaveLocal = isSaveLocal
    const list = []
    while (endIndex - startIndex >= 0) {
      list.push(startIndex)
      startIndex++
    }
    for (const pageIndex of list) {
      await this.downloadAllBing(pageIndex)
    }
  }

  async downloadAllBing(pageIndex = '') {
    const loading = ora(`正在获取中... -- ${pageIndex}`).start()
    try {
      const data = await $request({
        api: 'https://bing.ioliu.cn/',
        param: { p: pageIndex },
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

      loading.succeed(`获取成功 -- ${pageIndex}`)

      this.saveDataToDb(list)

      return list
    } catch (error) {
      loading.fail(`获取失败 -- ${pageIndex}`)
      console.log(error)
    }
  }

  async saveDataToDb(list) {
    if (!fs.existsSync(this.BingDbDirPath)) {
      await mkdirsSync(this.BingDbDirPath)
    }
    const endDateMap = utilsDb.mapData(list, 'enddate', (i) =>
      moment(i).format('YYYY-MM')
    )

    for (const date of Object.keys(endDateMap)) {
      const dbPath = `${this.BingDbDirPath}${date}.json`
      const historyData = await utilsDb.getDb(dbPath)
      const endDateList = historyData.map((_) => _.enddate)
      for (const item of endDateMap[date]) {
        if (!endDateList.includes(item.enddate)) {
          historyData.push(item)
          if (this.isSaveLocal) {
            await saveNetworkFileSync(
              item.url,
              { path: `bing/${date}`, fileName: item.title + '.jpg' },
              this.isSaveLocal
            )
          }
        }
      }
      await utilsDb.setDb(dbPath, historyData, (i) => i.enddate)
    }
  }

  async main() {
    try {
      await utilsGeeker.init()
      this.BingDbDirPath = utilsGeeker.geekerConfig.dbDirPath.bing
      const { action } = await inquirer.prompt(this.question)
      await this[this.actionMethods[action]]()
    } catch (error) {
      console.log(error)
    }
  }
}

new GeekerBing()
