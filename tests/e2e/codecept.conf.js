
var cfg = require('./configuration');

exports.config = {
  "tests": "./tests/*_test.js",
  "timeout": 10000,
  "output": "./output",
  "helpers": {
    "WebDriverIO": {
      "url": cfg.url,
      "browser": "phantomjs"
    }
  },
  "include": {},
  "bootstrap": false,
  "mocha": {},
  "name": "RainLoop e2e tests"
};
