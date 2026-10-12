// MediaPipe's browser solutions (hands, pose, face mesh) each load their model through the same
// global loader. If two of them start loading at once they overwrite each other's files and fail with
// "Failed to read file ...tflite". Every solution therefore runs its initialize() through this queue,
// so they load strictly one after another. Once loaded, they run side by side without problems.
// A load that has not finished after timeoutMs is abandoned (it rejects), so one stuck download can
// never block the models queued behind it.
let tail = Promise.resolve();

export const runExclusive = (task, timeoutMs = 25000) => {
  const run = tail.then(
    () =>
      new Promise((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error("model load timed out")),
          timeoutMs,
        );
        Promise.resolve()
          .then(task)
          .then(resolve, reject)
          .finally(() => clearTimeout(timer));
      }),
  );
  tail = run.catch(() => {});
  return run;
};