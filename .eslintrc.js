module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es2021: true,
  },
  extends: "eslint:recommended",
  parserOptions: {
    ecmaVersion: 12,
  },
  rules: {
    "no-var": "error",
    "prefer-const": "error",
    eqeqeq: ["error", "smart"],
    "prefer-template": "error",
  },
};
