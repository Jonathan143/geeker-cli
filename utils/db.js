const fs = require('fs')
const fsp = fs.promises
const _cloneDeep = require('lodash/cloneDeep')

class UtilsDb {
  constructor() {}

  mapData(list, key, formatKey = (i) => i) {
    const result = {}
    _cloneDeep(list).forEach((item) => {
      const resultKey = formatKey(item[key])
      const resultItem = result[resultKey]
      result[resultKey] = [...(resultItem || []), item]
    })
    return result
  }

  async getDb(dbPath) {
    let historyData = []
    try {
      if (fs.existsSync(dbPath)) {
        historyData = JSON.parse(await fsp.readFile(dbPath)) || []
      }
    } catch (error) {
      console.log(error)
    }
    return historyData
  }

  async setDb(dbPath, db) {
    try {
      await fsp.writeFile(dbPath, JSON.stringify(db, null, 2))
    } catch (error) {
      console.log(error)
    }
  }
}

module.exports = UtilsDb
