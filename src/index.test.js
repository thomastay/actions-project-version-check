const Index = require("./index");
const core = require("@actions/core");
const fs = require("fs");
const path = require("path");

beforeEach(() => {
  // setup mock
  jest.mock("@actions/core");
  jest.spyOn(core, "setFailed");
  jest.mock("fs");
  jest.spyOn(fs, "readFileSync");
});

afterEach(() => {
  jest.clearAllMocks();
});

test("testGetProjectVersionWithTxtFile", () => {
  const result = Index.getProjectVersion("1.0.0", "version.txt");
  expect(result).toBe("1.0.0");

  const fileContent = fs.readFileSync(".jest/version.txt");
  const result2 = Index.getProjectVersion(fileContent, "version.txt");
  expect(result2).toBe("1.0.0");
});

test("testGetProjectVersionWithUnsupportedFile", () => {
  expect(() => Index.getProjectVersion("1.0.0", "README.md").toThrow());
});

it("testCheckVersionUpdateWithVersionsAreEqual", () => {
  // action
  const result = Index.checkVersionUpdate("1.0.0", "1.0.0", undefined);
  expect(result).toBeUndefined();
});

it("testCheckVersionUpdateWithVersionIsDowngraded", () => {
  // action
  const result = Index.checkVersionUpdate("1.0.0", "0.9.0", undefined);
  expect(result).toBeUndefined();
});

it("testCheckVersionUpdateWithVersionIsUpdated", () => {
  // action
  const result = Index.checkVersionUpdate("1.0.0", "1.1.0", undefined);
  expect(result).toBe("minor");
});

it("testCheckVersionUpdateWithVersionIsUpdatedAndAdditionalFilesGivenButNotUpdated", () => {
  // prepare
  fs.readFileSync.mockReturnValue("foo... version: 1.0.0 ...bar");

  // action
  const result = Index.checkVersionUpdate("1.0.0", "1.1.0", ["README.md"]);

  // verify
  expect(fs.readFileSync).toHaveBeenCalledWith(
    path.resolve("test/workspace/README.md"),
  );
  expect(result).toBeUndefined();
});

it("testCheckVersionUpdateWithVersionIsUpdatedAndAdditionalFilesGiven", () => {
  // prepare
  fs.readFileSync.mockReturnValue("foo... version: 1.1.0 ...bar");

  // action
  const result = Index.checkVersionUpdate("1.0.0", "1.1.0", ["README.md"]);

  // verify
  expect(fs.readFileSync).toHaveBeenCalledWith(
    path.resolve("test/workspace/README.md"),
  );
  expect(result).toBe("minor");
});
