require('babel-polyfill');
const fs = require('fs');
const chalk = require('chalk');
const ver = require('./package.json').version;
const config = require('./config.json');
let includes;
if (fs.existsSync('./includes.json')) {
  includes = require('./includes.json');
}
const argv = require('yargs')
  .option('u', {
    alias: 'username',
    describe: '(string) Comply or LDAP user',
    default: false,
    global: false
  })
  .option('p', {
    alias: 'password',
    describe: '(string) password for username',
    default: false,
    global: false
  })
  .option('d', {
    alias: 'duration',
    describe: '(integer) number of days or months\'',
    default: false,
    global: false
  })
  .option('t', {
    alias: 'timeline',
    describe: '(string) days or months',
    default: false,
    global: false
  })
  .option('c', {
    alias: 'current',
    describe: '(boolean) include current month in output',
    default: false,
    global: false
  })
  .option('r', {
    alias: 'requests',
    describe: '(integer) number of requests to make per ms',
    default: '5',
    global: false
  })
  .option('m', {
    alias: 'milli',
    describe: '(integer) ms to wait between requests',
    default: '5000',
    global: false
  })
  .help('help')
  .argv;

const filename = argv.filename || argv.f;
const timeline = argv.timeline || argv.t;
const duration = argv.duration || argv.d;
const current = argv.current || argv.c;

if (filename) {
  config.REPORT_FILENAME = filename;
}

if ((duration && !timeline) || (!duration && timeline)) {
  console.log(chalk.redBright('Error: both -t, --timeline and -d, --duration are required if using either.'));
  return false;
}

if (duration && timeline) {
  if (timeline !== 'months' && timeline !== 'days') {
    console.log(chalk.redBright('Error: -t, --timeline must be \'days\' or \'months\'.'));
    return false;
  } else if (timeline === 'months') {
    config.HISTORY_MONTHS = argv.duration || argv.d;
    config.HISTORY_DAYS = null;
  } else if (timeline === 'days') {
    config.HISTORY_MONTHS = null;
    config.HISTORY_DAYS = argv.duration || argv.d;
  }
}

const reporter = require('./dist');
reporter.init(ver, config, argv, includes, current);
