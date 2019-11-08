import path from 'path';
import fs from 'fs';
import stringify from 'json-stringify-safe';

const chalk = require('chalk');

export default function (config, data, log) {
  var folder = 'reports';
  var filename = config.REPORT_FILENAME;
  var location = path.join(folder, filename);
  var logfile = path.join(folder, 'log.txt');

  // we need to append the Comply URL before writing
  data.push({ _url: config.COMPLY_SERVER_URL });

  fs.writeFile(location, stringify(data, (k, v) => {
    if ('parent' === k) {
      return undefined;
    }
    return v;
  }, '\t'), (err) => {
    if (err) {
      console.log(chalk.redBright('Error: could not write file. Do you have permissions?'));
      return false;
    }
    console.log(chalk.bold('----------------------'));
    console.log(`Find your report in: ${location}`);
    console.log(`Log generated in: ${logfile}`);

    log.push(`Report generated in ${location}`);
    log.push(`Log generated in ${logfile}\n\n`);

    if (log) {
      let text = log.join('\n');
      fs.writeFileSync(logfile, text);
    }

    return true;
  });
}
