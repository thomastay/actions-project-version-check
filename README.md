# Changelog

This repo is a vendored fork of Main changes are: [https://github.com/avides/actions-project-version-check](https://github.com/avides/actions-project-version-check).

### v2.0.0

API changes, so major bump

1. target branch now defaults to main, and must be set.
1. Failure on bump / not is now an explicit flag (fail-build-if-not-bumped). The updated project version and semver result is now always output as a variable.
1. Additional files now fails only if the branch version isn't there AND the target version is.

### v1.2.2

Compatible with forked version.

1. Removal of XML parser to reduce dependencies
2. upgrade dependencies and lint rules.

# actions-project-version-check

This action checks if the project version has been updated in your pull request. The action will request the file content (file with name from environment variable `file-to-check`) from the pull request target branch and parse the project version. After that the local project version will be checked against the targets one with [semver-diff](https://www.npmjs.com/package/semver-diff). If the new version is not higher than the old one from target, the action fails.

Currently supported are `package.json` and `version.txt`.

## Inputs

### `token`

**Required** The repository token is used to request the target branch `file-to-check`-file from the [GitHub API](https://developer.github.com/v3/repos/contents/#get-contents)

### `file-to-check`

**Required** Filename (with path) that must contain the project version update (examples: pom.xml, package.json or version.txt)

### `additional-files-to-check`

Comma separated list of filenames (with path) that must contain the same version as "file-to-check" (examples: README.md, src/file-with-version.txt)

### `only-return-version`

Is used to disable the whole version check and only return the project version as output for usage in other actions

## Outputs

### `version`

If the version update is valid then the new version is available as output. Usage:

```
- uses: avides/actions-project-version-check@latest
  id: actions_project_version_check
  with:
    token: ${{ secrets.GITHUB_TOKEN }}
    file-to-check: pom.xml

- name: use-version-from-check
  run: echo "New version is: " ${{ steps.actions_project_version_check.outputs.version }}
```

## Example usage

```
- uses: avides/actions-project-version-check@v1.2.0
- with:
    token: ${{ secrets.GITHUB_TOKEN }}
    file-to-check: package.json
    additional-files-to-check: README.md
```
