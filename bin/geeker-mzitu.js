#! /usr/bin/env node

// 交互式命令行
const inquirer = require('inquirer')
// 修改控制台字符串样式
const chalk = require('chalk')
const ora = require('ora')
const fs = require('fs')
const fsp = fs.promises
const cheerio = require('cheerio')
const $request = require('../utils/api')
const { mkdirsSync, saveFileSync } = require('../utils/file')
const moment = require('moment')

const UtilsGeeker = require('../utils/geeker')
const utilsGeeker = new UtilsGeeker()
const UtilsDb = require('../utils/db')
const utilsDb = new UtilsDb()

class GeekerMZ {
  constructor() {
    this.question = [
      {
        type: 'list',
        message: '选择分类:',
        name: 'category',
        choices: [
          { value: '', name: '最新' },
          { value: 'hot', name: '最热' },
          { value: 'best', name: '推荐' },
          { value: 'xinggan', name: '性感妹子' },
          { value: 'japan', name: '日本妹子' },
          { value: 'taiwan', name: '台湾妹子' },
          { value: 'mm', name: '清纯妹子' },
          { value: 'zipai', name: '妹子自拍' },
          { value: 'jiepai', name: '妹子街拍' },
        ],
      },
      {
        name: 'pageIndex',
        type: 'input',
        message: '请输入开始页码:',
        validate: (input) => {
          return /^\d+$/.test(input) && input > 0
            ? true
            : '必须输入数字并且大于0'
        },
      },
    ]
    this.MzituDbDirPath = ''
    this.mzBaseUrl = 'https://www.mzitu.com'

    this.main()
  }

  // 查询mz数据
  async requestMzitu({ pageIndex, category }) {
    const apiUrl = `${this.mzBaseUrl}/${
      category ? category + '/' : ''
    }${this.computedPage(pageIndex)}`

    try {
      let loading = ora('开始获取数据').start()
      const data = await $request({
        api: apiUrl,
      })
      const list = this.getCoverList(data, apiUrl)
      loading.succeed('数据获取成功')
      loading = loading.render()
      loading.start('开始保存数据')
      await this.saveDataToDb(list)
      loading.succeed('保存数据成功')

      await this.inquirerSetOfPictures(list)
    } catch (error) {
      console.log(error)
    }
  }

  // 保存数据
  async saveDataToDb(list) {
    if (!fs.existsSync(this.MzituDbDirPath)) {
      await mkdirsSync(this.MzituDbDirPath)
    }
    const dateMap = utilsDb.mapData(list, 'date', (i) =>
      moment(i).format('YYYY-MM')
    )

    for (const date of Object.keys(dateMap)) {
      const dbPath = `${this.MzituDbDirPath}${date}.json`
      const historyData = await utilsDb.getDb(dbPath)
      const sourceUrlList = historyData.map((_) => _.sourceUrl)
      for (const item of dateMap[date]) {
        if (!sourceUrlList.includes(item.sourceUrl)) {
          historyData.push(item)
        }
      }
      await utilsDb.setDb(dbPath, historyData, (i) => i.date)
    }
  }

  async inquirerSetOfPictures(list) {
    try {
      const titleList = list.map((item, index) => ({
        name: `${index + 1}.${item.title}`,
        value: item,
      }))
      const { checkSetOfPictures } = await inquirer.prompt([
        {
          type: 'checkbox',
          message: '请选择下载到本地的MZ套图:',
          name: 'checkSetOfPictures',
          choices: titleList,
        },
      ])
      for (const { sourceUrl, title, date } of checkSetOfPictures) {
        let loading = ora(`开始获取套图 -- ${title}`).start()
        const oneSet = await this.getAllPicUrl(sourceUrl)
        loading.succeed(`套图获取成功 -- ${title}`)
        loading = loading
          .render()
          .start(`开始下载套图共${oneSet.total}张 -- ${title}`)
        for (const urls of oneSet.srcList) {
          const fileName = urls.imageUrl.match('[^/]+(?!.*/)')[0]
          try {
            const stream = await this.requestDownload(urls)

            await saveFileSync({
              stream,
              path: `/mzitu/${moment(date).format('YYYY-MM')}/${title}`,
              fileName,
            })
          } catch (error) {
            console.log(chalk.red(`\n ${fileName} 保存失败`))
          }
        }
        loading.succeed(`套图下载成功共${oneSet.total}张 -- ${title}`)

        await this.justSleep(2000)
      }
    } catch (error) {
      console.log(error)
    }
  }

  // 获取封面列表
  getCoverList(data, apiUrl) {
    const $ = cheerio.load(data)
    let list = []

    $('#pins li>a').each((i, e) => {
      const cAttribs = e.children[0].attribs
      let obj = {
        title: cAttribs.alt, //标题
        coverUrl: cAttribs['data-original'], //封面图
        sourceUrl: e.attribs.href, //图片网页的url
        date: $(e).siblings('.time').text(),
      }
      list.push(obj) //输出目录页查询出来的所有链接地址
    })
    if (!list.length) {
      $('#content>.placeholder>.place-padding figure').each((i, e) => {
        const cAttribs = $(e).find($('img'))['0'].attribs
        let obj = {
          title: cAttribs.alt, //标题
          coverUrl: cAttribs['data-original'], //封面图
          sourceUrl: $(e).find($('a'))['0'].attribs.href, //图片网页的url
          date: $(e).siblings('.post-meta').find($('.time')).text(),
        }
        list.push(obj) //输出目录页查询出来的所有链接地址
      })
    }

    return list
  }

  // 获取套图urlList
  async getAllPicUrl(url) {
    try {
      const htmlData = await $request({
        api: url,
        param: {},
      })
      const $ = cheerio.load(htmlData)
      let srcList = [],
        total = 0,
        baseSrcList = []

      try {
        const page = $('div.pagenavi > a > span')
        baseSrcList = $('.main-image > p > a > img')[0].attribs.src.split('01.')

        total = $(page[page.length - 2]).text()
      } catch (error) {
        total = $('.prev-next-page')
          .text()
          .replace(/[1\/,页]/g, '')
        baseSrcList = $('.place-padding>figure a img')['0'].attribs.src.split(
          '01.'
        )
      }

      for (let i = 1; i <= total; i++) {
        srcList.push({
          pageUrl: i === 1 ? url : `${url}/${i}`,
          imageUrl: `${baseSrcList[0]}${i < 10 ? '0' + i : i}.${
            baseSrcList[1]
          }`,
        })
      }

      return {
        total,
        srcList,
      }
    } catch (error) {
      console.log(error)
      return []
    }
  }

  // 反防盗链 下载图片
  requestDownload({ imageUrl, pageUrl, responseType = 'stream' }) {
    return $request({
      api: imageUrl,
      config: {
        responseType,
        headers: {
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'Accept-Encoding': 'gzip, deflate',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'Cache-Control': 'no-cache',
          // Host: imageUrl.replace(/\.com\/.+/, '.com').replace(/^http.+\/\//, ''),
          Pragma: 'no-cache',
          'Proxy-Connection': 'keep-alive',
          Referer: pageUrl,
          'Upgrade-Insecure-Requests': 1,
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.19 Safari/537.36',
        },
      }, //反防盗链
    })
  }

  computedPage(pageIndex) {
    return pageIndex === undefined || pageIndex === '1'
      ? ''
      : `/page/${pageIndex}/`
  }

  justSleep(timeout) {
    return new Promise((resolve, reject) => {
      const sleep = ora(`开始休眠 ${timeout / 1000}s`).start()
      setTimeout(() => {
        sleep.info('停止休眠')
        resolve()
      }, timeout)
    })
  }

  async main() {
    try {
      await utilsGeeker.init()
      this.MzituDbDirPath = utilsGeeker.geekerConfig.dbDirPath.mzitu
      const result = await inquirer.prompt(this.question)
      await this.requestMzitu(result)
    } catch (error) {
      console.log(error)
    }
  }
}

new GeekerMZ()
