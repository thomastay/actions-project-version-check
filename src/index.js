// imports
const core = require("@actions/core");
const github = require("@actions/github");
const fs = require("fs");
const semverDiff = require("semver-diff");
const process = require("process");

// constants
const repositoryLocalWorkspace = process.env.GITHUB_WORKSPACE + "/";

// helper functions
function getProjectVersionFromPackageJsonFile(fileContent) {
  return JSON.parse(fileContent).version;
}

function getProjectVersion(fileContent, fileName) {
  if (fileName === "pom.xml") {
    throw new Error("XML files are unsupported");
  }

  if (fileName === "package.json") {
    return getProjectVersionFromPackageJsonFile(fileContent);
  }

  if (fileName === "version.txt") {
    return new String(fileContent).trim();
  }

  core.setFailed('"' + fileName + '" is not supported!');
  return undefined;
}

function checkVersionUpdate(
  targetVersion,
  branchVersion,
  additionalFilesToCheck,
) {
  const result = semverDiff(targetVersion, branchVersion);

  if (!result) {
    console.log("targetVersion: " + targetVersion);
    console.log("branchVersion: " + branchVersion);
    console.log("semverDiff: " + result);
    core.setFailed("You have to update the project version!");
  } else if (additionalFilesToCheck != null) {
    additionalFilesToCheck.forEach(file => {
      const fileContent = fs.readFileSync(
        repositoryLocalWorkspace + file.trim(),
      );

      if (
        !fileContent.includes(branchVersion) ||
        fileContent.includes(targetVersion)
      ) {
        core.setFailed(
          'You have to update the project version in "' + file + '"!',
        );
      }
    });
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
    if (additionalFilesToCheck !== "") {
      additionalFilesToCheck = additionalFilesToCheck.split(",");
    }

    // get target branch
    const event = JSON.parse(
      fs.readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"),
    );
    const targetBranch =
      event && event.pull_request && event.pull_request.base
        ? event.pull_request.base.ref
        : "master";

    // get updated project version
    const updatedBranchFileContent = fs.readFileSync(
      repositoryLocalWorkspace + fileToCheck,
    );
    const updatedProjectVersion = getProjectVersion(
      updatedBranchFileContent,
      fileToCheck,
    );

    // check version update
    if (core.getInput("only-return-version") === "false") {
      try {
        const { data: targetBranchFileContent } =
          await octokit.rest.repos.getContent({
            owner: repositoryOwner,
            repo: repositoryName,
            path: fileToCheck,
            ref: targetBranch,
            headers: { Accept: "application/vnd.github.v3+json" },
          });

        // get target project version
        const targetProjectVersion = getProjectVersion(
          targetBranchFileContent,
          fileToCheck,
        );

        checkVersionUpdate(
          targetProjectVersion,
          updatedProjectVersion,
          additionalFilesToCheck,
        );
      } catch (error) {
        console.log(
          "Cannot resolve `" +
            fileToCheck +
            "` in target branch! No version check required. ErrMsg => " +
            error,
        );
      }
    }

    // set output
    core.setOutput("version", updatedProjectVersion);
  } catch (error) {
    core.setFailed(error.message);
  }
}

// start the action
if (typeof require !== "undefined" && require.main === module) {
  run();
}

// exports for unit testing
module.exports = {
  getProjectVersion,
  getProjectVersionFromPackageJsonFile,
  checkVersionUpdate,
};
