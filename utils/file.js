const fs = require('fs')
const fsp = fs.promises
const pth = require('path')
const moment = require('moment')
const $request = require('./api')
const ora = require('ora')

const mkdirsSync = async (dirname) => {
  if (fs.existsSync(dirname)) {
    return true
  }
  if (await mkdirsSync(pth.dirname(dirname))) {
    await fsp.mkdir(dirname)
    return true
  }
}

/**
 *
 * @param {String} basePath 基本路径 默认为/public
 * @param {String} path 文件保存路径
 * @param {stream} stream 文件流
 * @param {String} fileName 文件名
 */
const saveFileSync = async ({
  basePath = `./public/`,
  path = moment().format('YYYY-MM'),
  stream,
  fileName,
}) => {
  if (stream && fileName) {
    // 若无目录，创建目录
    const dirPath = basePath + path
    console.log(`saveFileSync 保存地址 -- ${dirPath}`)
    await mkdirsSync(dirPath)
    const writeStream = fs.createWriteStream(
      `${dirPath}/${fileName.replace(/\//g, '-')}`
    )
    await stream.pipe(writeStream)
  } else {
    console.error('stream||fileName undefinded')
  }
}

/**
 *
 * @param {String} url
 * @param {Object} config basePath,path,fileName
 */
const saveNetworkFileSync = async (url, config, isSaveLocal = true) => {
  try {
    const loading = ora(`downloading ${url}`).start()

    const stream = await $request({
      api: url,
      config: {
        responseType: 'stream',
      },
    })
    if (isSaveLocal) {
      await saveFileSync({
        stream,
        ...config,
      })
    }
    loading.succeed()
    return { code: 200, _id: config._id || '' }
  } catch (error) {
    loading.fail()
    return Promise.reject(error)
  }
}

module.exports = {
  mkdirsSync,
  saveFileSync,
  saveNetworkFileSync,
}
