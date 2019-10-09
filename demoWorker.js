const { workerData, parentPort } = require("worker_threads");

console.log("workerData", workerData);
setTimeout(() => {
  parentPort.postMessage(Object.assign(workerData, { done: true }));
}, workerData.sleep);
