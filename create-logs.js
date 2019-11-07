"use strict";

const baseUrl = "https://osmcha.mapbox.com/api/v1/changesets/";
const OsmchaAuthKey = process.env.OsmchaAuthKey;
const usernameInput = require("./usernames.json");

const request = require("request");
const Joi = require("@hapi/joi");
const program = require("commander");

program
  .option(
    "--from-date <s>",
    "Provide from date for querying changesets. Input format YYYY-MM-DD"
  )
  .option(
    "--to-date <s>",
    "Provide end date for querying changesets. Input format YYYY-MM-DD"
  )
  .parse(process.argv);

/**
 * [requestOptionsSchema] is a JOI schema object. This schema is later used for validating API request options that get passed into OSMCHA API.
 * More reading https://github.com/hapijs/joi/blob/master/API.md
 * @returns {client} a JOI client that allows declared schema to be enforced on js objects
 */
const requestOptionsSchema = Joi.object({
  uri: Joi.string().required(),
  method: Joi.string().required(),
  headers: Joi.object({
    Authorization: Joi.string().required(),
    "Content-Type": Joi.string().optional()
  }).required()
});

/**
 * [validateOptions] is a function that enforces a previously declared schema on API options, handles the validation errors that might arise
 * @param {options} - a js object that contains information to query OSMCHA API. Like URI, ACCESS KEY, API METHOD et cetera
 * @returns {None}
 */
const validateOptions = options => {
  const validationResult = requestOptionsSchema.validate(options);
  if (validationResult.error) {
    process.exitCode = 1;
    throw new Error(
      `ERROR - OSMCHA API request options were invalid: ${validationResult.error}`
    );
  } else return validationResult;
};

/**
 * [executeRequest] is a function to request OSMCHA API with a set of prepared options. The function executes the API request and then returns the body of the response from OSMCHA backend
 * @param {options} - a js object that contains information to query OSMCHA API
 * @returns {object} - response body from the executed API request
 */
const executeRequest = options => {
  validateOptions(options);
  // Note that OSMCHA Authorization uses a "Token " appended to the actual secret token, in the API request
  // See README.md for how the OSMCHA API token looks like
  options.headers.Authorization = "Token " + options.headers.Authorization;

  return new Promise((resolve, reject) => {
    request.get(options, (error, resp, body) => {
      if (error) {
        process.exitCode = 1;
        console.error(error);
        reject(error);
      } else {
        resolve(body);
      }
    });
  });
};

/**
 * [getChangesetComments] is a function to get a list of OSM Changeset discussion comments for a given changeset ID
 * @param {string} - a OSM changeset ID
 * @returns {object} - response body from the executed API request for OSMCHA changeset discussion
 */
const getChangesetComments = async changeset => {
  const options = {
    uri: baseUrl + changeset + "/comment/",
    method: "GET",
    headers: {
      Authorization: OsmchaAuthKey,
      "Content-Type": "application/json"
    }
  };
  validateOptions(options);
  try {
    const response = await executeRequest(options);
    return response;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

/**
 * [getUserChangesetList] is a function to get a list of changesets by OSM username
 * @param {array} - a comma seperated string with OSM usernames
 * @param {string} - a FROM date in the format of YYYY-MM-DD
 * @param {string} - a TO date in the format of YYYY-MM-DD
 * @returns {object} - list of changeset IDs for each OSM username given in the input array
 */
const getUserChangesetList = async (usernames, fromDate, toDate) => {
  const options = {
    uri:
      baseUrl +
      `?page=1&page_size=100&users=${usernames}&date__gte=${fromDate}&date__lte=${toDate}`,
    method: "GET",
    headers: {
      Authorization: OsmchaAuthKey,
      "Content-Type": "application/json"
    }
  };

  validateOptions(options);

  const changesetIdsByUser = {};
  let next = options.uri;

  while (next !== null) {
    // OSMCHA handles pagination by returning a next url instead of a next page
    options.uri = next;
    const response = JSON.parse(await executeRequest(options));
    next = response.next;
    response.features.forEach(({ id, properties }) => {
      // Store changesetIds by username
      const user = properties.user;
      if (user in changesetIdsByUser) {
        changesetIdsByUser[user].push(id);
      } else {
        changesetIdsByUser[user] = [id];
      }
    });
  }

  return changesetIdsByUser;
};

/**
 * [createUserLogs] is a function to create logs for each user for resolved and unresolved issues on OSM based on changeset discussions
 * @param {array} - a array with OSM usernames
 * @param {string} - a FROM date in the format of YYYY-MM-DD
 * @param {string} - a TO date in the format of YYYY-MM-DD
 * @returns {None} - list of changesets for each OSM username given in the input array
 */
const createUserLogs = async (usernameArray, fromDate, toDate) => {
  const commaSeperatedUserNames = usernameArray.join(",");
  const userChangesets = await getUserChangesetList(
    commaSeperatedUserNames,
    fromDate,
    toDate
  );
  const users = Object.keys(userChangesets);
  const userlogs = users.map(async username => {
    const changesetDiscussions = await Promise.all(
      userChangesets[username].map(async changesetId => {
        return {
          id: changesetId,
          comments: JSON.parse(await getChangesetComments(changesetId))
        };
      })
    );

    const changesetsWithNoComments = changesetDiscussions.filter(
      discussion => !discussion.comments.length
    );
    const changesetsWithComments = changesetDiscussions.filter(
      discussion => !!discussion.comments.length
    );

    const resolvedIssues = changesetsWithComments
      .filter(discussion => {
        const allComments = discussion.comments;
        const lastComment = allComments[allComments.length - 1];
        return lastComment.userName === username;
      })
      .map(({ id }) => id);

    const unresolvedIssues = changesetsWithComments
      .filter(discussion => {
        const allComments = discussion.comments;
        const lastComment = allComments[allComments.length - 1];
        return lastComment.userName !== username;
      })
      .map(({ id }) => id);

    console.log("LOG FOR USERNAME : ", username);
    console.log(`-- Changeset count : ${userChangesets[username].length}`);

    console.log(
      `-- Count of Changesets with comments : ${changesetsWithComments.length}`
    );
    console.log(
      `-- Count of Changesets without comments : ${changesetsWithNoComments.length}`
    );

    console.log("-- Count of Resolved changesets : ", resolvedIssues.length);
    console.log(
      "-- Count of Unresolved changesets : ",
      unresolvedIssues.length
    );
    console.log(
      "-- Count of Unresolved changesets : ",
      unresolvedIssues.length
    );
    console.log("-- List of Unresolved changesets below");
    console.log(
      unresolvedIssues.map(
        id => `https://www.openstreetmap.org/changeset/${id}`
      )
    );
  });

  await Promise.all(userlogs);
};

if (program.fromDate && program.toDate) {
  return createUserLogs(usernameInput, program.fromDate, program.toDate);
} else {
  return program.help();
}
