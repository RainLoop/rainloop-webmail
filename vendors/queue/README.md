# queue.js

**Queue.js** is yet another asynchronous helper library for JavaScript. Think of it as a minimalist version of [Async.js](https://github.com/caolan/async) that allows fine-tuning over parallelism. Or, think of it as a version of [TameJs](https://github.com/maxtaco/tamejs/) that does not use code generation.

For example, if you wanted to stat two files in parallel:

```js
queue()
    .defer(fs.stat, __dirname + "/../Makefile")
    .defer(fs.stat, __dirname + "/../package.json")
    .await(function(error, file1, file2) { console.log(file1, file2); });
```

Or, if you wanted to run a bazillion asynchronous tasks (here represented as an array of closures) serially:

```js
var q = queue(1);
tasks.forEach(function(t) { q.defer(t); });
q.awaitAll(function(error, results) { console.log("all done!"); });
```

Queue.js can be run inside Node.js or in a browser.

## Installation

In a browser, you can use the official hosted copy on [d3js.org](http://d3js.org):

```html
<script src="http://d3js.org/queue.v1.min.js"></script>
```

Queue.js supports the asynchronous module definition (AMD) API. For example, if you use [RequireJS](http://requirejs.org/), you may load as follows:

```js
require.config({paths: {queue: "http://d3js.org/queue.v1.min"}});

require(["queue"], function(queue) {
  console.log(queue.version);
});
```

In Node, use [NPM](http://npmjs.org) to install:

```bash
npm install queue-async
```

And then `require("queue-async")`. (The package name is [queue-async](https://npmjs.org/package/queue-async) because the name “queue” was already taken.)

## API Reference

### queue([parallelism])

Constructs a new queue with the specified *parallelism*. If *parallelism* is not specified, the queue has infinite parallelism. Otherwise, *parallelism* is a positive integer. For example, if *parallelism* is 1, then all tasks will be run in series. If *parallelism* is 3, then at most three tasks will be allowed to proceed concurrently; this is useful, for example, when loading resources in a web browser.

### queue.defer(task[, arguments…])

Adds the specified asynchronous *task* function to the queue, with any optional *arguments*. The *task* will be called with the specified optional arguments and an additional callback argument; the callback must then be invoked by the task when it has finished. The task must invoke the callback with two arguments: the error, if any, and the result of the task. For example:

```js
function simpleTask(callback) {
  setTimeout(function() {
    callback(null, {answer: 42});
  }, 250);
}
```

If an error occurs, any tasks that were scheduled *but not yet started* will not run. For a serial queue (of *parallelism* 1), this means that a task will only run if all previous tasks succeed. For a queue with higher parallelism, only the first error that occurs is reported to the await callback, and tasks that were started before the error occurred will continue to run; note, however, that their results will not be reported to the await callback.

Tasks can only be deferred before the *await* callback is set. If a task is deferred after the await callback is set, the behavior of the queue is undefined.

### queue.await(callback)
### queue.awaitAll(callback)

Sets the *callback* to be invoked when all deferred tasks have finished.

The first argument to the *callback* is the first error that occurred, or null if no error occurred. If an error occurred, there are no additional arguments to the callback. Otherwise, the *await* callback is passed each result as an additional separate argument, while the *awaitAll* callback is passed a single array of results as the second argument.

If all tasks complete before the *await* or *awaitAll* callback is set, the callback will be invoked immediately. This method should only be called once, after any tasks have been deferred. If the await callback is set multiple times, or set before a task is deferred, the behavior of the queue is undefined.

## Callbacks

The callbacks follow the Node.js convention where the first argument is an optional error object and the second argument is the result of the task. Queue.js does not support asynchronous functions that return multiple results; however, you can homogenize such functions by wrapping them and converting multiple results into a single object or array.
