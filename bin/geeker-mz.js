#! /usr/bin/env node

// 交互式命令行
const inquirer = require('inquirer')
// 修改控制台字符串样式
const chalk = require('chalk')
const ora = require('ora')
const fs = require('fs')
const fsp = fs.promises
