const arrayChangeEventName = 'arrayChange';
ko['extenders']['trackArrayChanges'] = (target, options) => {
    // Use the provided options--each call to trackArrayChanges overwrites the previously set options
    target.compareArrayOptions = {};
    if (typeof options == "object") {
        ko.utils.extend(target.compareArrayOptions, options);
    }
    target.compareArrayOptions['sparse'] = true;

    // Only modify the target observable once
    if (target.cacheDiffForKnownOperation) {
        return;
    }
    var trackingChanges = false,
        cachedDiff = null,
        changeSubscription,
        spectateSubscription,
        pendingChanges = 0,
        previousContents,
        underlyingBeforeSubscriptionAddFunction = target.beforeSubscriptionAdd,
        underlyingAfterSubscriptionRemoveFunction = target.afterSubscriptionRemove;

    // Watch "subscribe" calls, and for array change events, ensure change tracking is enabled
    target.beforeSubscriptionAdd = event => {
        underlyingBeforeSubscriptionAddFunction?.call(target, event);
        if (event === arrayChangeEventName) {
            trackChanges();
        }
    };
    // Watch "dispose" calls, and for array change events, ensure change tracking is disabled when all are disposed
    target.afterSubscriptionRemove = event => {
        underlyingAfterSubscriptionRemoveFunction?.call(target, event);
        if (event === arrayChangeEventName && !target.hasSubscriptionsForEvent(arrayChangeEventName)) {
            changeSubscription?.['dispose']();
            spectateSubscription?.['dispose']();
            spectateSubscription = changeSubscription = null;
            trackingChanges = false;
            previousContents = undefined;
        }
    };

    function notifyChanges() {
        if (pendingChanges) {
            // Make a copy of the current contents and ensure it's an array
            var currentContents = [].concat(target.peek() || []), changes;

            // Compute the diff and issue notifications, but only if someone is listening
            if (target.hasSubscriptionsForEvent(arrayChangeEventName)) {
                changes = getChanges(previousContents, currentContents);
            }

            // Eliminate references to the old, removed items, so they can be GCed
            previousContents = currentContents;
            cachedDiff = null;
            pendingChanges = 0;

            if (changes?.length) {
                target.notifySubscribers(changes, arrayChangeEventName);
            }
        }
    }

    function trackChanges() {
        if (trackingChanges) {
            // Whenever there's a new subscription and there are pending notifications, make sure all previous
            // subscriptions are notified of the change so that all subscriptions are in sync.
            notifyChanges();
            return;
        }

        trackingChanges = true;

        // Track how many times the array actually changed value
        spectateSubscription = target['subscribe'](() => ++pendingChanges, null, "spectate");

        // Each time the array changes value, capture a clone so that on the next
        // change it's possible to produce a diff
        previousContents = [].concat(target.peek() || []);
        cachedDiff = null;
        changeSubscription = target['subscribe'](notifyChanges);
    }

    function getChanges(previousContents, currentContents) {
        // We try to re-use cached diffs.
        // The scenarios where pendingChanges > 1 are when using rate limiting or deferred updates,
        // which without this check would not be compatible with arrayChange notifications. Normally,
        // notifications are issued immediately so we wouldn't be queueing up more than one.
        if (!cachedDiff || pendingChanges > 1) {
            cachedDiff = ko.utils.compareArrays(previousContents, currentContents, target.compareArrayOptions);
        }

        return cachedDiff;
    }

    target.cacheDiffForKnownOperation = (rawArray, operationName, args) => {
        // Only run if we're currently tracking changes for this observable array
        // and there aren't any pending deferred notifications.
        if (!trackingChanges || pendingChanges) {
            return;
        }
        var diff = [],
            arrayLength = rawArray.length,
            argsLength = args.length,
            offset = 0,
            pushDiff = (status, value, index) =>
                diff[diff.length] = { 'status': status, 'value': value, 'index': index };

        switch (operationName) {
            case 'push':
                offset = arrayLength;
            case 'unshift':
                for (let index = 0; index < argsLength; ++index) {
                    pushDiff('added', args[index], offset + index);
                }
                break;

            case 'pop':
                offset = arrayLength - 1;
            case 'shift':
                arrayLength && pushDiff('deleted', rawArray[offset], offset);
                break;

            case 'splice':
                // Negative start index means 'from end of array'. After that we clamp to [0...arrayLength].
                // See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/splice
                var index = Math.min(Math.max(0, args[0] < 0 ? arrayLength + args[0] : args[0]), arrayLength),
                    endDeleteIndex = argsLength === 1 ? arrayLength : Math.min(index + (args[1] || 0), arrayLength),
                    endAddIndex = index + argsLength - 2,
                    endIndex = Math.max(endDeleteIndex, endAddIndex),
                    additions = [], deletions = [],
                    argsIndex = 2;
                for (; index < endIndex; ++index, ++argsIndex) {
                    if (index < endDeleteIndex)
                        deletions.push(pushDiff('deleted', rawArray[index], index));
                    if (index < endAddIndex)
                        additions.push(pushDiff('added', args[argsIndex], index));
                }
                ko.utils.findMovesInArrayComparison(deletions, additions);
                break;

            default:
                return;
        }
        cachedDiff = diff;
    };
};
