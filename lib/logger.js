import path from 'path';
import fs from 'graceful-fs';

export default function (data) {
  var folder = 'reports';
  var logfile = path.join(folder, 'log.txt');

  let stream = fs.createWriteStream(logfile, { flags: 'a' });
  stream.write(`${data} ${new Date().toISOString()}\n`);
  return true;
}