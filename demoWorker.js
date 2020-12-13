const { workerData, parentPort } = require("worker_threads");

console.log("workerData", workerData);
setTimeout(() => {
  parentPort.postMessage(Object.assign(workerData, { stamp: Date.now() }));
}, workerData.sleep);
