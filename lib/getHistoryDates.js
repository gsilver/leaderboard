import moment from 'moment';

export default function (config, current) {
  let timeline = 6; // 6 (default)
  let month = true; // (default) for days, set to false
  let history = [];

  if (!config.HISTORY_MONTHS && !config.HISTORY_DAYS) {
    // if neither is set, get 6 months as default
    config.HISTORY_MONTHS = 6;
  }

  if (config.HISTORY_MONTHS) {
    timeline = config.HISTORY_MONTHS;
  } else if (config.HISTORY_DAYS) {
    timeline = config.HISTORY_DAYS;
    month = false;
  }

  // iterate over timeline and add to history; i is month or day variable
  // default is to start with the previous month, but if 'current' is set and true
  // we start with the current month
  let _i = 1;
  let _timeline = timeline;
  if (current && current !== 'false') {
    _i = 0;
    _timeline = timeline - 1;
  }
  for (let i = _i; i <= _timeline; i++) {
    let begin;
    let end;

    if (month) {
      // by month
      let som = moment().subtract(i, 'months');
      begin = moment(som).startOf('month').format('MM-DD-YYYY');
      let eom = moment(som).endOf('month');
      end = moment(eom).format('MM-DD-YYYY');
    } else {
      // by day
      begin = moment().subtract(i, 'days').format('MM-DD-YYYY');
      end = begin;
    }
    history.push({
      begin,
      end
    });
  }

  return history;
}
