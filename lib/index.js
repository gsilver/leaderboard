#!/usr/bin/env node

import request from 'request-promise-native';
import throttledRequest from 'throttled-request';
import moment from 'moment';
import generateJsonTree from './generateJsonTree';
import getHistoryDates from './getHistoryDates';
import reorderDataJson from './reorderDataJson';
import makeArrayFromObject from './makeArrayFromObject';
import filterIssues from './filterIssues';
import chalk from 'chalk';

const throttler = throttledRequest(request);

/**
 * This tool extracts historical score data from a Comply instance and
 * optionally generates an HTML table view of the results. It allows for 
 * an "includes" file to specify any organizations and projects you want 
 * data for. Without it, or with an empty file, it will extract data
 * for everything your user has access to.
 * 
 * By default, the final score per month for five months will be pulled 
 * and this number can be changed. Additionally you can get days instead
 * of months.
 * 
 * Three specific things to note: first, we limit the number of fetches
 * to five per five thousand milliseconds allowing each request to
 * complete so as not to get disconnect errors. This is usually an issue
 * with projects that are larger than 500 sites, but less an issue on 
 * average or smaller projects. Second, this tool is equipped to 
 * refresh the oauth token every four minutes (the default timeout being
 * five minutes, giving us a minute of padding) but it is disabled at
 * the moment. Finally, we write a log file to track events. It is
 * currently an array that we push events into before writing it to a file
 * at the end, but this tool can also write to a file on the fly making
 * tailing the log an option. On larger projects however this causes
 * issues with too many open files.
 * 
 * See the readme for more information on command line use.
 */

let ver;
let token = null;
let refresh = null;
let data = [];
let log = [];
let config;
let includes = {};
let argv;
let current;
let history;

// set a timer for our refresh token
let refreshTokenTimer = new Date().getTime() + 240000; // 4 minutes for token expiration

// initial request authenticates with Comply via Keycloak/oAuth
// then gets all the orgs and projects for the specified user
// note, these are generally marked as "favorites" in the Comply interface
async function oauthLogin () {
  return new Promise((resolve, reject) => {
    request({
      form: {
        username: argv.username || config.COMPLY_USERNAME,
        password: argv.password || config.COMPLY_PASSWORD,
        grant_type: 'password',
        client_id: config.KEYCLOAK_CLIENT_ID
      },
      method: 'post',
      url: config.KEYCLOAK_AUTH_URL,
      timeout: 10000
    }).then(res => {
      const json = JSON.parse(res);
      token = json.access_token;
      refresh = json.refresh_token;
      log.push(`Login successful. Accepted access token. ${new Date()}`);
      resolve(chalk.green.bold('Login successful. Accepted access token.'));
    }).catch(err => {
      log.push(`Error: Could not connect to authentication server. Is the configuration correct? ${new Date()}`);
      reject('Error: Could not connect to authentication server. Is the configuration correct?');
    });
  });
}

// function to refresh the oauth token as needed
async function oauthRefresh () {
  return new Promise((resolve, reject) => {
    request({
      form: {
        grant_type: 'refresh_token',
        refresh_token: refresh,
        client_id: config.KEYCLOAK_CLIENT_ID
      },
      method: 'post',
      url: config.KEYCLOAK_AUTH_URL,
      timeout: 10000
    }).then(res => {
      const json = JSON.parse(res);
      token = json.access_token;
      refresh = json.refresh_token;
      refreshTokenTimer = (new Date).getTime() + 240000; // 4 minutes; token expires in 5 minutes
      log.push(`Refreshed access token. ${new Date()}`);
      console.log(chalk.green.bold('Refreshed access token.'));
      resolve();
    }).catch(err => {
      log.push('Error: Could not connect to authentication server. Is the configuration correct?');
      console.log(chalk.redBright('Error: Could not connect to authentication server. Is the configuration correct?'));
      reject();
    });
  });
}

// get all orgs/projects assigned to the user
// I believe this only gets what's marked as a favorite
async function getOrgsProjects () {
  await oauthLogin();
  return new Promise((resolve, reject) => {
    request({
      headers: {
        Authorization: token
      },
      auth: {
        bearer: token
      },
      pool: {
        maxSockets: 'Infinity'
      },
      url: `${config.COMPLY_SERVER_URL}/organizationprojects`,
      method: 'get',
      credentials: 'include',
      mode: 'cors',
      timeout: 60000,
      json: true,
      forever: true,
      agent: false
    }).then(body => {
      if (!body.projects || !body.projects.length) {
        log.push('Error: No projects assigned to the user.');
        console.log(chalk.redBright('Error: No projects assigned to the user.'));
      }
      if (includes && Object.keys(includes).length) {
        log.push(`Includes file present! ${new Date()}`);
        console.log(chalk.green.bold('Includes file present!'));
      } else {
        log.push(`No includes file present, or empty, adding everything! ${new Date()}`);
        console.log(chalk.yellowBright.bold('No includes file present, or empty, adding everything!'));
      }
      resolve(body.projects);
    }).catch(err => {
      log.push(`Error: Could not get projects. ${new Date()}`);
      reject('Error: Could not get projects.', err);
    });
  });
}

// build a data object for each organization and project
async function buildOrgsProjectsObject (organizationProjects) {
  await Promise.all(organizationProjects.map(async (project) => {
    return new Promise((resolve, reject) => {
      if (includes && Object.keys(includes).length) {
        if (includes[project.organizationName] && includes[project.organizationName].indexOf(project.name) !== -1) {
          data.push({
            orgId: project.organizationId,
            orgName: project.organizationName,
            projectId: project.id,
            projectName: project.name
          });
          log.push(`Added: ${project.organizationName}/${project.name} ${new Date()}`);
          console.log(chalk.green.bold(`Added: ${project.organizationName}/${project.name}`));
          resolve();
        } else {
          log.push(`Skipped: ${project.organizationName}/${project.name} ${new Date()}`);
          console.log(chalk.gray(`Skipped: ${project.organizationName}/${project.name}`));
          resolve();
        }
      } else {
        data.push({
          orgId: project.organizationId,
          orgName: project.organizationName,
          projectId: project.id,
          projectName: project.name
        });
        log.push(`Added: ${project.organizationName}/${project.name} ${new Date()}`);
        console.log(chalk.green.bold(`Added: ${project.organizationName}/${project.name}`));
        resolve();
      }
    });
  }));
}

async function getProjectsData () {
  // set up our throttled requester
  throttler.configure({
    requests: argv.r || 5,
    milliseconds: argv.m || 5000
  });

  await Promise.all(data.map(async (piece, i) => {
    // refresh our oauth token if needed
    if ((new Date).getTime() > refreshTokenTimer) {
      await oauthRefresh();
    }
    return Promise.all(history.map(async (time, t) => {
      return new Promise((resolve, reject) => {
        throttler({
          headers: {
            Authorization: token
          },
          auth: {
            bearer: token
          },
          pool: {
            maxSockets: 'Infinity'
          },
          url: `${config.COMPLY_SERVER_URL}/project/summaryReport/${piece.projectId}?begin=${time.begin}&end=${time.end}`,
          method: 'get',
          credentials: 'include',
          mode: 'cors',
          timeout: 60000,
          resolveWithFullResponse: true,
          json: true,
          time: true,
          forever: true,
          agent: false 
        }, async (err, res) => {
          if (err || !res) {
            log.push(`Could not get project summary for: ${piece.projectName} ${new Date()}`);
            reject(`Could not get project summary for: ${piece.projectName}`);
          }
          if (!piece.dates) {
            data[i].dates = [];
          }
          if (!piece.scores) {
            data[i].scores = [];
          }
          if (!piece.issues) {
            data[i].issues = [];
          }
          // format date for html display as table column headers
          let date;
          if (config.HISTORY_MONTHS) {
            date = moment(moment(time.begin, 'MM-DD-YYYY')).format('MMM YYYY');
          } else if (config.HISTORY_DAYS) {
            date = moment(moment(time.begin, 'MM-DD-YYYY')).format('MMM DD');
          } else {
            reject('Invalid history settings in config.json');
          }
          data[i].dates.push({
            id: t,
            z: date
          });
          if (!res.body.report) {
            log.push(`--- No report score found for ${piece.projectName} on ${time.begin}`);
          }
          data[i].scores.push({
            id: t,
            z: res.body.report
              ? res.body.report.score === 0 || res.body.report.score === "0"
                ? 0
                : res.body.report.score
              : 'N/A',
          });
          data[i].issues.push(
            await filterIssues(res.body.report && res.body.report.issuelist ? res.body.report.issuelist : [])
          );
          log.push(`Finished: ${piece.orgName}/${piece.projectName} ${config.COMPLY_SERVER_URL}/project/summaryReport/${piece.projectId}?begin=${time.begin}&end=${time.end} (${(res.timingPhases.total / 1000).toFixed(3)} seconds) ${new Date()}`);
          console.log(chalk.green.bold(`Finished: ${piece.orgName}/${piece.projectName} (${(res.timingPhases.total / 1000).toFixed(3)} seconds)`));
          resolve();
        });
      });
    }));
  }));
}

// reorder the timelines and scores so they're in order
async function reorderDataObjects () {
  return new Promise((resolve, reject) => {
    data.forEach((piece, i) => {
      let orderedTimes = reorderDataJson(piece.dates, 'id', true);
      let orderedScore = reorderDataJson(piece.scores, 'id', true);
      let newOrderedTimes = makeArrayFromObject(orderedTimes);
      let newOrderedScore = makeArrayFromObject(orderedScore);
      data[i].dates = newOrderedTimes;
      data[i].scores = newOrderedScore;
    });
    resolve();
  });
}

// when we're all done with scoring, let's build the tree and write data
async function carryOn () {
  return new Promise((resolve, reject) => {
    let completedStamp = new Date();
    log.push(`\nDone! Generating report file...\nCompleted: ${completedStamp} ${new Date()}\n`);
    console.log(chalk.green.bold(`Done! Generating report file...\nCompleted: ${completedStamp}`));
    resolve();
  });
}

async function buildLeaderBoardScores () {
  const allOrgsAndProjects = await getOrgsProjects();
  await buildOrgsProjectsObject(allOrgsAndProjects);
  await getProjectsData();
  await reorderDataObjects();
  await reorderDataJson(data, 'orgName');
  await carryOn();
  await generateJsonTree(config, data, history.length, log);
}

function handleWithCare (fn) {
  return function (...args) {
    return fn(...args).catch((err) => {
      console.log(chalk.redBright(err));
      return false;
    });
  };
}

const init = function (v, c, a, i, cu) {
  ver = v;
  config = c;
  argv = a;
  includes = i || [];
  current = cu;
  history = getHistoryDates(config, current);

  console.log(chalk.bold('WORLDSPACE COMPLY CUSTOM REPORTER'));
  console.log(chalk.gray(`v${ver}`));
  console.log(chalk.bold('----------------------'));

  const started = new Date();
  console.log(chalk.green.bold(`Started: ${started}\n`));
  log.push(`Started: ${started} ${new Date()}\n`);

  const run = handleWithCare(buildLeaderBoardScores);
  run();
};

module.exports = {
  init
};