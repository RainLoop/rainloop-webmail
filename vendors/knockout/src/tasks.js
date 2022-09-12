ko.tasks = (() => {
    var taskQueue = [],
        taskQueueLength = 0,
        nextIndexToProcess = 0,

    processTasks = () => {
        if (taskQueueLength) {
            // Each mark represents the end of a logical group of tasks and the number of these groups is
            // limited to prevent unchecked recursion.
            var mark = taskQueueLength, countMarks = 0;

            // nextIndexToProcess keeps track of where we are in the queue; processTasks can be called recursively without issue
            for (var task; nextIndexToProcess < taskQueueLength; ) {
                if (task = taskQueue[nextIndexToProcess++]) {
                    if (nextIndexToProcess > mark) {
                        if (++countMarks >= 5000) {
                            nextIndexToProcess = taskQueueLength;   // skip all tasks remaining in the queue since any of them could be causing the recursion
                            setTimeout(() => {
                                throw Error(`'Too much recursion' after processing ${countMarks} task groups.`)
                            }, 0)
                            break;
                        }
                        mark = taskQueueLength;
                    }
                    try {
                        task();
                    } catch (ex) {
                        setTimeout(() => { throw ex }, 0);
                    }
                }
            }
        }
    },

    scheduledProcess = () => {
        processTasks();

        // Reset the queue
        nextIndexToProcess = taskQueueLength = taskQueue.length = 0;
    },

    // Chrome 27+, Firefox 14+, IE 11+, Opera 15+, Safari 6.1+
    // From https://github.com/petkaantonov/bluebird * Copyright (c) 2014 Petka Antonov * License: MIT
    scheduler = (callback => {
        var div = document.createElement("div");
        new MutationObserver(callback).observe(div, {attributes: true});
        return () => div.classList.toggle("foo");
    })(scheduledProcess);

    return {
        schedule: func => {
            taskQueueLength || scheduler(scheduledProcess);

            taskQueue[taskQueueLength++] = func;
        }
    };
})();
