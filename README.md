# Comply Custom Reporter

This command line tool extracts data from WorldSpace Comply via its API and stores the data and scores into a JSON file locally.

## System requirements

* Node 8+
* NPM 5+

## Configuration (before running the tool)

Rename `config.json.template` to `config.json` and update it with your email address and your password for WorldSpace Comply.

Optionally change the name of the output report filename.

### Including organizations and projects

If you want to run reports for specific organizations and projects, rename `includes.json.template` to `includes.json` and modify it accordingly. This file should use valid JSON and have each key the exact name of an organization, with an array of exact-named projects from your Comply instance. For example:

```json
{
  "ACME": [
    "project.com",
    "some-project-name",
    "acme-members-page"
  ],
  "INC": [
    "inc-homepage",
    "members-area"
  ]
}
```

Remember, the organization and project names should match Comply exactly.

### Install dependencies

You'll need to install the Node packages and dependencies in order to use this tool. Do that with:

`npm install` from a command line. Make sure Node and NPM are both installed at or above the versions listed previously.

## Run

### Simple (based on config.json)

Update the **config.json** file for quick and simple use.

* `grunt json` fetches project data via the Comply API
* `grunt html` compiles data into the roll-up HTML view

You'll find the HTML file in the `web` folder.

### Advanced (using parameters and config.json)

If you aren't using the **config.json** file or if you want to override values in it, you can pass command line parameters instead.

* `node index.js --help` to get help and see available options.

The following parameters and overrides are available:

* `-u` or `--username` to provide a username
* `-p` or `--password` to provide a password for a supplied username
* `-d` or `--duration` for the number of months or days to retrieve
* `-t` or `--timeline` to specify months OR days
* `-c` or `--current` to start with the current month (true); default false
* `-r` or `--requests` number of requests to make per milliseconds; default 5
* `-m` or `--milli` milliseconds to wait between requests; default 5000 (5 seconds)

Example: to login with a user:

* `node index.js -u johndoe -p pass123` or `node index.js --username=johndoe --password=pass123`

Example: to retrieve three months' worth of data:

* `node index.js -d 3 -t months` or `node index.js --duration=3 --timeline=months`

Example: to make 3 requests every 3 seconds:

* `node index.js -r 3 -m 3000` or `node index.js --requests=3 --milli=3000`

Score history starts with the most recent completed month by default. If you are mid-month and want to include scores from the current month, add the `-c` or `--current=true` parameter.

Resulting JSON will be in the `reports` folder as `report.json`.

## Production or one-offs

Three individual steps are needed to generate the JSON and leaderboards HTML:

* `grunt json` generates the JSON using default configurations via the config.json file
  * `node index.js [options]` generates the JSON file allowing you to specify configuration parameters
* `grunt html` creates the HTML leaderboard

You can place the resulting `web` folder and its contents in a publicly viewable space to launch the leaderboard.

If generating the HTML leaderboard, you need to generate or have available the JSON first.
