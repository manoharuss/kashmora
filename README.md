![kashmora](https://user-images.githubusercontent.com/8921295/68394877-a39d3d00-0194-11ea-8ef3-2a95b7e91a6f.jpg)

Kashmora (English: A Powerful Black Magic) is a Telugu horror film released in 1986 https://en.wikipedia.org/wiki/Kashmora_(1986_film)

-----------

### Purpose

This repo contains a local use CLI that serves 2 purposes -

- To keep a tab on discussions happening on changesets of OpenStreetMap profiles between a specified period of dates
- To use a naive 'last user to comment' logic, to list unresolved discussions on OSM changesets


### Requests to OSMCHA API

This repo uses OSMCHA API for fetching information on users and changesets. Below are the 2 types of API requests performed on OSMCHA

- [Fetch Changeset list](https://osmcha.mapbox.com/api-docs/#operation/changesets_list) `https://osmcha.mapbox.com/api/v1/changesets/`
  - Query options
    - users - `&users=` argument to provide a comma separated list of OpenStreetMap usernames
    - from date - `&date__gte=` argument can be used to provided a YYYY-MM-DD `from` date to specify a period
    - to date - `&date__lte=` argument can be used to provided a YYYY-MM-DD `to` date to specify a period

- [Fetch Changeset comment](https://osmcha.mapbox.com/api-docs/#operation/changesets_comment_read) `https://osmcha.mapbox.com/api/v1/changesets/{id}/comment/`
  - Query options
    - id - `id` a OpenStreetMap changeset ID to query for existing discussion comments

## Developement && Usage

### Step 1 - Create a local setup of this repo

```sh
git clone git@github.com:manoharuss/kashmora.git
cd kashmora
nvm use 10 lts
npm install
```

### Step 2 - Setup a OSMCHA API token in local environment in terminal

Once you login into OSMCHA, a new production token is automatically generated for your account. You can usually snoop on any API request in networks panel in your browser, to see your token under the request headers.

- Open [osmcha.mapbox.com](https://osmcha.mapbox.com/)
- Open `Developer tools` in the browser and open `Network` tab. This opens the Network panel
- Continue using OSMCHA and click on any OSMCHA backend API requests in the Network panel

<img width="350" align="center" alt="OSM_Changeset_Analyzer_TOKEN" src="https://user-images.githubusercontent.com/8921295/68392620-266fc900-0190-11ea-8fd1-7ee9213c7482.png">

_Copy the Secret token highlighted in red box from a OSMCHA network request in your browser_

- Copy this token from your browser and export in your local environment in your terminal
- Run `export OsmchaAuthKey=847287xxxxxxx-your-token-here` and replace placeholder token with your personal token



### Step 3 - Customize usernames to run CLI

- Edit usernames.json and add to the list of usernames
- For each user this usernames.json a log is generated upon CLI run

```sh
node create-logs.js --from-date 2018-01-01 --to-date 2019-10-31
```

```sh

$ node create-logs.js --from-date 2018-01-01 --to-date 2019-10-31
LOG FOR USERNAME :  manoharuss
-- Changeset count : 63
-- Count of Changesets with comments : 2
-- Count of Changesets without comments : 61
-- Count of Resolved changesets :  1
-- Count of Unresolved changesets :  1
-- Count of Unresolved changesets :  1
-- List of Unresolved changesets below
[ 'https://www.openstreetmap.org/changeset/58035916' ]
```


#### Contributions

For any feature requests and suggestions, please open Github issues at https://github.com/manoharuss/kashmora/issues.
Pull requests from other developers looking to develop on this repo are welcome. Please create an issue on this repo to request access and will be responded to immediately.
