const { Worker } = require("worker_threads");
const xs = require("xstream").default;

const makeExecutor = (numThreads, workerFilename) => {
  return req$ => {
    const workers = new Array(numThreads);
    const output$ = xs.create({
      start: listener => {
        req$.addListener({
          next: req => {
            console.debug("req", req);
            if (!!workers[req.threadId]) {
              console.warn(
                `!!workers[req.threadId]; req.threadId=${req.threadId}`
              );
              return;
            }
            if (req.threadId < 0 || req.threadId >= workers.length) {
              console.warn(
                `req.threadId < 0 || req.threadId >= workers.length; req.threadId=${
                  req.threadId
                } workers.length=${workers.length}`
              );
              return;
            }

            workers[req.threadId] = new Worker(workerFilename, {
              workerData: req.data
            });
            workers[req.threadId].on("message", value =>
              listener.next({ type: "message", req, value })
            );
            workers[req.threadId].on("error", err => {
              delete workers[req.threadId];
              listener.next({ type: "error", req, value: err });
            });
            workers[req.threadId].on("exit", code => {
              delete workers[req.threadId];
              listener.next({ type: "exit", req, value: code });
            });
          }
        });
      },
      stop: () => {
        workers.map(x => x.terminate());
      }
    });

    return output$;
  };
};

module.exports = (numThreads, workerFilename, workderDatas, callback) => {
  const executor = makeExecutor(numThreads, workerFilename);

  const executorOutputProxy$ = xs.create();
  const threadId$ = xs.merge(
    xs.fromArray(Array.from({ length: numThreads }, (_, i) => i)),
    executorOutputProxy$
      .filter(({ type }) => type === "exit")
      .map(({ req }) => req.threadId)
  );

  const request$ = threadId$
    .fold(
      ({ request, remaining }, threadId) => {
        const count = workderDatas.length - remaining.length;
        console.debug(
          "remaining",
          remaining.length,
          "total",
          workderDatas.length,
          `${((count / workderDatas.length) * 100).toFixed(2)}% started so far`
        );
        return remaining.length > 0
          ? {
              request: {
                count,
                threadId,
                data: remaining[0]
              },
              remaining: remaining.slice(1)
            }
          : { request: null, remaining };
      },
      {
        request: null,
        remaining: workderDatas
      }
    )
    .filter(({ request }) => request !== null)
    .map(({ request }) => request);

  const executorOutput$ = executor(request$);
  executorOutputProxy$.imitate(executorOutput$);

  const results = [];
  const handle = executorOutputProxy$.subscribe({
    next: ({ type, req, value }) => {
      console.debug("type, req.count", type, req.count);
      if (type === "message") {
        results.push({
          req,
          result: value
        });
      }
      if (type === "exit" && results.length === workderDatas.length) {
        handle.unsubscribe();
        callback(null, results);
      }
    }
  });
};
