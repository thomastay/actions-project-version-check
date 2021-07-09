// imports
const core = require("@actions/core");
const github = require("@actions/github");
const fs = require("fs");
const path = require("path");
const semverDiff = require("semver-diff");
const process = require("process");

// constants
const repositoryLocalWorkspace = process.env.GITHUB_WORKSPACE;
const NO_UPDATE = "no-update";

function getProjectVersionFromPackageJsonFile(fileContent) {
  return JSON.parse(fileContent).version;
}

// helper functions
function getProjectVersion(fileContent, fileName) {
  if (fileName === "pom.xml") {
    throw new Error("XML files are unsupported in this fork");
  }

  if (fileName === "package.json") {
    return getProjectVersionFromPackageJsonFile(fileContent);
  }

  if (fileName === "version.txt") {
    return new String(fileContent).trim();
  }

  throw new Error(`"${fileName}" is not supported!`);
}

/**
 * @param {string} targetVersion
 * @param {string} branchVersion
 * @param {string[]} additionalFilesToCheck
 * @returns the result of semverDiff. If there are no changes, semverDiff returns undefined
 * @throws An error if a failure occurs.
 */
function checkVersionUpdate(
  targetVersion,
  branchVersion,
  additionalFilesToCheck,
) {
  console.log(`targetVersion: ${targetVersion}`);
  console.log(`branchVersion: ${branchVersion}`);

  const result = semverDiff(targetVersion, branchVersion);
  console.log(`semverDiff: ${result}`);

  if (additionalFilesToCheck) {
    for (const file of additionalFilesToCheck) {
      const fileContent = fs.readFileSync(
        path.resolve(repositoryLocalWorkspace, file.trim()),
      );

      if (
        !fileContent.includes(branchVersion) &&
        fileContent.includes(targetVersion)
      ) {
        return undefined;
      }
    }
  }

  return result;
}

/**
 * @returns the project version
 * @throws
 */
async function getProjectVersionFromNetwork(
  octokit,
  { repositoryOwner, repositoryName, fileToCheck, targetBranch },
) {
  try {
    const { data: targetBranchFileContent } =
      await octokit.rest.repos.getContent({
        owner: repositoryOwner,
        repo: repositoryName,
        path: fileToCheck,
        ref: targetBranch,
        headers: { Accept: "application/vnd.github.v3.raw" },
      });

    // get target project version
    return getProjectVersion(targetBranchFileContent, fileToCheck);
  } catch (error) {
    throw new Error(
      `Found error fetching version check from network. 
Error message: ${error},
fileToCheck: ${fileToCheck},
targetBranch: ${targetBranch}`,
    );
  }
}

// main
async function run() {
  try {
    // setup objects
    const octokit = github.getOctokit(core.getInput("token"));

    // get repository owner and name
    const repository = process.env.GITHUB_REPOSITORY.split("/");
    const repositoryOwner = repository[0];
    const repositoryName = repository[1];

    // get file with updated project version
    const fileToCheck = core.getInput("file-to-check");

    // get additional files with updated project version
    let additionalFilesToCheck = core.getInput("additional-files-to-check");
    if (additionalFilesToCheck) {
      additionalFilesToCheck = additionalFilesToCheck.split(",");
    }

    // get target branch
    const event = JSON.parse(
      fs.readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"),
    );
    const targetBranch =
      (event &&
        event.pull_request &&
        event.pull_request.base &&
        event.pull_request.base.ref) ||
      core.getInput("target-branch") ||
      "main";

    // get updated project version
    const updatedBranchFileContent = fs.readFileSync(
      path.resolve(repositoryLocalWorkspace, fileToCheck),
      "utf8",
    );
    const updatedProjectVersion = getProjectVersion(
      updatedBranchFileContent,
      fileToCheck,
    );
    // set output
    core.setOutput("version", updatedProjectVersion);

    // Get project version from network
    const targetProjectVersion = await getProjectVersionFromNetwork(octokit, {
      repositoryOwner,
      repositoryName,
      fileToCheck,
      targetBranch,
    });

    // Check for version update
    try {
      const versionUpdate = checkVersionUpdate(
        targetProjectVersion,
        updatedProjectVersion,
        additionalFilesToCheck,
      );
      core.setOutput("semver", versionUpdate || NO_UPDATE);
    } catch (error) {
      if (core.getInput("fail-build-if-not-bumped") === "true") {
        core.setFailed(error);
      } else {
        console.log(
          `Found error ${error}, but fail-build-if-not-bumped is not set, continuing.`,
        );
      }
    }
  } catch (error) {
    core.setFailed(error);
  }
}

// start the action
if (typeof require !== "undefined" && require.main === module) {
  run();
}

// exports for unit testing
module.exports = {
  getProjectVersion,
  checkVersionUpdate,
};
