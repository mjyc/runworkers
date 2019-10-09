#!/usr/bin/env node

const execute = require("./execute");

const workerFilename =
  typeof process.argv[2] === "undefined" ? "./workers.js" : process.argv[2];
const workerDatas =
  typeof process.argv[3] === "undefined" ? [] : JSON.parse(process.argv[3]);
const numThreads =
  typeof process.argv[4] === "undefined" ? 8 : parseInt(process.argv[4]);

execute(numThreads, workerFilename, workerDatas, (err, results) => {
  if (!!err) {
    console.error(err);
    process.exit(1);
  }

  !!process.argv[5]
    ? require("fs").writeFileSync(process.argv[5], JSON.stringify(results))
    : console.log(JSON.stringify(results));
});
