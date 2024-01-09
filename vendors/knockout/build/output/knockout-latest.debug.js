/*!
 * Knockout JavaScript library v3.5.1-sm
 * (c) The Knockout.js team - http://knockoutjs.com/
 * License: MIT (http://www.opensource.org/licenses/mit-license.php)
 */

(window => {
    // (0, eval)('this') is a robust way of getting a reference to the global object
    // For details, see http://stackoverflow.com/questions/14119988/return-this-0-evalthis/14120023#14120023
    var document = window['document'],
        koExports = {};
// Internally, all KO objects are attached to koExports (even the non-exported ones whose names will be minified by the closure compiler).
// In the future, the following "ko" variable may be made distinct from "koExports" so that private objects are not externally reachable.
var ko = typeof koExports !== 'undefined' ? koExports : {};
// Google Closure Compiler helpers (used only to make the minified file smaller)
ko.exportSymbol = (koPath, object) => {
    var tokens = koPath.split(".");

    // In the future, "ko" may become distinct from "koExports" (so that non-exported objects are not reachable)
    // At that point, "target" would be set to: (typeof koExports !== "undefined" ? koExports : ko)
    var target = ko, i = 0, l = tokens.length - 1;

    for (; i < l; i++)
        target = target[tokens[i]];
    target[tokens[l]] = object;
};
ko.exportProperty = (owner, publicName, object) => owner[publicName] = object;
ko.exportSymbol('version', "3.5.1-sm");
ko.utils = {
    extend: (target, source) => source ? Object.assign(target, source) : target,

    objectForEach: (obj, action) => obj && Object.entries(obj).forEach(prop => action(prop[0], prop[1])),

    emptyDomNode: domNode => [...domNode.childNodes].forEach(child => ko.removeNode(child)),
//    emptyDomNode: domNode => {while (domNode.lastChild) ko.removeNode(domNode.lastChild)},
    // Safari 14+
//    emptyDomNode: domNode => domNode.replaceChildren(),

    moveCleanedNodesToContainerElement: nodes => {
        // Ensure it's a real array, as we're about to reparent the nodes and
        // we don't want the underlying collection to change while we're doing that.
        var nodesArray = [...nodes];
        var templateDocument = nodesArray[0]?.ownerDocument || document;

        var container = templateDocument.createElement('div');
        nodesArray.forEach(node => container.append(ko.cleanNode(node)));
        return container;
    },

    cloneNodes: (nodesArray, shouldCleanNodes) =>
        Array.prototype.map.call(nodesArray, shouldCleanNodes
            ? node => ko.cleanNode(node.cloneNode(true))
            : node => node.cloneNode(true)),

    setDomNodeChildren: (domNode, childNodes) => {
        ko.utils.emptyDomNode(domNode);
        childNodes && domNode.append(...childNodes);
    },

    fixUpContinuousNodeArray: (continuousNodeArray, parentNode) => {
        // Before acting on a set of nodes that were previously outputted by a template function, we have to reconcile
        // them against what is in the DOM right now. It may be that some of the nodes have already been removed, or that
        // new nodes might have been inserted in the middle, for example by a binding. Also, there may previously have been
        // leading comment nodes (created by rewritten string-based templates) that have since been removed during binding.
        // So, this function translates the old "map" output array into its best guess of the set of current DOM nodes.
        //
        // Rules:
        //   [A] Any leading nodes that have been removed should be ignored
        //       These most likely correspond to memoization nodes that were already removed during binding
        //       See https://github.com/knockout/knockout/pull/440
        //   [B] Any trailing nodes that have been remove should be ignored
        //       This prevents the code here from adding unrelated nodes to the array while processing rule [C]
        //       See https://github.com/knockout/knockout/pull/1903
        //   [C] We want to output a continuous series of nodes. So, ignore any nodes that have already been removed,
        //       and include any nodes that have been inserted among the previous collection

        if (continuousNodeArray.length) {
            // The parent node can be a virtual element; so get the real parent node
            parentNode = (parentNode.nodeType === 8 && parentNode.parentNode) || parentNode;

            // Rule [A]
            while (continuousNodeArray.length && continuousNodeArray[0].parentNode !== parentNode)
                continuousNodeArray.splice(0, 1);

            // Rule [B]
            while (continuousNodeArray.length > 1
                && continuousNodeArray[continuousNodeArray.length - 1].parentNode !== parentNode)
                --continuousNodeArray.length;

            // Rule [C]
            if (continuousNodeArray.length > 1) {
                var current = continuousNodeArray[0], last = continuousNodeArray[continuousNodeArray.length - 1];
                // Replace with the actual new continuous node set
                continuousNodeArray.length = 0;
                while (current !== last) {
                    continuousNodeArray.push(current);
                    current = current.nextSibling;
                }
                continuousNodeArray.push(last);
            }
        }
        return continuousNodeArray;
    },

    stringTrim: string => string == null ? '' :
            string.trim ?
                string.trim() :
                string.toString().replace(/^[\s\xa0]+|[\s\xa0]+$/g, ''),

    domNodeIsAttachedToDocument: node =>
        node.ownerDocument.documentElement.contains(node.nodeType !== 1 ? node.parentNode : node),

    triggerEvent: (element, eventType) => {
        if (!element?.nodeType)
            throw new Error("element must be a DOM node when calling triggerEvent");

        element.dispatchEvent(new Event(eventType));
    },

    unwrapObservable: value => ko.isObservable(value) ? value() : value,

    setTextContent: (element, textContent) =>
        element.textContent = ko.utils.unwrapObservable(textContent) || ""
};

ko.exportSymbol('utils', ko.utils);
ko.exportSymbol('unwrap', ko.utils.unwrapObservable); // Convenient shorthand, because this is used so commonly
(() => {

let uniqueId = 0,
    dataStoreKeyExpandoPropertyName = "__ko__" + (Date.now()),
    dataStore = new WeakMap();

ko.utils.domData = {
    get: (node, key) => (dataStore.get(node) || {})[key],
    set: (node, key, value) => {
        if (dataStore.has(node)) {
            dataStore.get(node)[key] = value;
        } else {
            dataStore.set(node, {[key]:value});
        }
        return value;
    },
    getOrSet: function(node, key, value) {
        return this.get(node, key) || this.set(node, key, value);
    },
    clear: node => dataStore.delete(node),

    nextKey: () => (uniqueId++) + dataStoreKeyExpandoPropertyName
};

})();

ko.utils.domNodeDisposal = (() => {
    var domDataKey = ko.utils.domData.nextKey();
    var cleanableNodeTypes = { 1: 1, 8: 1, 9: 1 };       // Element, Comment, Document
    var cleanableNodeTypesWithDescendants = { 1: 1, 9: 1 }; // Element, Document

    const getDisposeCallbacksCollection = (node, createIfNotFound) => {
        var allDisposeCallbacks = ko.utils.domData.get(node, domDataKey);
        if (createIfNotFound && !allDisposeCallbacks) {
            allDisposeCallbacks = new Set;
            ko.utils.domData.set(node, domDataKey, allDisposeCallbacks);
        }
        return allDisposeCallbacks;
    },

    destroyCallbacksCollection = node => ko.utils.domData.set(node, domDataKey, null),

    cleanSingleNode = node => {
        // Run all the dispose callbacks
        var callbacks = getDisposeCallbacksCollection(node);
        if (callbacks) {
            // Clone, as the array may be modified during iteration (typically, callbacks will remove themselves)
            (new Set(callbacks)).forEach(callback => callback(node));
        }

        // Erase the DOM data
        ko.utils.domData.clear(node);

        // Clear any immediate-child comment nodes, as these wouldn't have been found by
        // node.getElementsByTagName("*") in cleanNode() (comment nodes aren't elements)
        cleanableNodeTypesWithDescendants[node.nodeType]
        && cleanNodesInList(node.childNodes, true/*onlyComments*/);
    },

    cleanNodesInList = (nodeList, onlyComments) => {
        var cleanedNodes = [], lastCleanedNode;
        for (var i = 0; i < nodeList.length; i++) {
            if (!onlyComments || nodeList[i].nodeType === 8) {
                cleanSingleNode(cleanedNodes[cleanedNodes.length] = lastCleanedNode = nodeList[i]);
                if (nodeList[i] !== lastCleanedNode) {
                    while (i-- && !cleanedNodes.includes(nodeList[i]));
                }
            }
        }
    };

    return {
        addDisposeCallback : (node, callback) => {
            if (typeof callback != "function")
                throw new Error("Callback must be a function");
            getDisposeCallbacksCollection(node, 1).add(callback);
        },

        removeDisposeCallback : (node, callback) => {
            var callbacksCollection = getDisposeCallbacksCollection(node);
            if (callbacksCollection) {
                callbacksCollection.delete(callback);
                callbacksCollection.size || destroyCallbacksCollection(node);
            }
        },

        cleanNode : node => {
            ko.dependencyDetection.ignore(() => {
                // First clean this node, where applicable
                if (cleanableNodeTypes[node.nodeType]) {
                    cleanSingleNode(node);

                    // ... then its descendants, where applicable
                    cleanableNodeTypesWithDescendants[node.nodeType]
                    && cleanNodesInList(node.getElementsByTagName("*"));
                }
            });

            return node;
        },

        removeNode : node => {
            ko.cleanNode(node);
            node.parentNode && node.parentNode.removeChild(node);
        }
    };
})();
ko.cleanNode = ko.utils.domNodeDisposal.cleanNode; // Shorthand name for convenience
ko.removeNode = ko.utils.domNodeDisposal.removeNode; // Shorthand name for convenience
ko.exportSymbol('utils.domNodeDisposal', ko.utils.domNodeDisposal);
ko.exportSymbol('utils.domNodeDisposal.addDisposeCallback', ko.utils.domNodeDisposal.addDisposeCallback);
ko.extenders = {
    'debounce': (target, timeout) => target.limit(callback => debounce(callback, timeout)),

    'rateLimit': (target, timeout) => target.limit(callback => throttle(callback, timeout)),

    'notify': (target, notifyWhen) => {
        target.equalityComparer = notifyWhen == "always" ?
            null :  // null equalityComparer means to always notify
            valuesArePrimitiveAndEqual;
    }
};

var primitiveTypes = { 'undefined':1, 'boolean':1, 'number':1, 'string':1 };
function valuesArePrimitiveAndEqual(a, b) {
    return (a === null || primitiveTypes[typeof(a)]) ? (a === b) : false;
}

function throttle(callback, timeout) {
    var timeoutInstance;
    return () => {
        if (!timeoutInstance) {
            timeoutInstance = setTimeout(() => {
                timeoutInstance = 0;
                callback();
            }, timeout);
        }
    };
}

function debounce(callback, timeout) {
    var timeoutInstance;
    return () => {
        clearTimeout(timeoutInstance);
        timeoutInstance = setTimeout(callback, timeout);
    };
}

ko.exportSymbol('extenders', ko.extenders);

class koSubscription
{
    constructor (target, callback, disposeCallback) {
        this._target = target;
        this._callback = callback;
        this._disposeCallback = disposeCallback;
        this._isDisposed = false;
        this._node = null;
        this._domNodeDisposalCallback = null;
        ko.exportProperty(this, 'dispose', this.dispose);
    }

    dispose() {
        var self = this;
        if (!self._isDisposed) {
            self._domNodeDisposalCallback
            && ko.utils.domNodeDisposal.removeDisposeCallback(self._node, self._domNodeDisposalCallback);
            self._isDisposed = true;
            self._disposeCallback();

            self._target = self._callback = self._disposeCallback = self._node = self._domNodeDisposalCallback = null;
        }
    }

    disposeWhenNodeIsRemoved(node) {
        // MutationObserver ?
        this._node = node;
        ko.utils.domNodeDisposal.addDisposeCallback(node, this._domNodeDisposalCallback = this.dispose.bind(this));
    }
}

ko.subscribable = function () {
    Object.setPrototypeOf(this, ko_subscribable_fn);
    ko_subscribable_fn.init(this);
}

var defaultEvent = "change";

var ko_subscribable_fn = {
    init: instance => {
        instance._subscriptions = new Map();
        instance._subscriptions.set("change", new Set);
        instance._versionNumber = 1;
    },

    subscribe: function (callback, callbackTarget, event) {
        var self = this;

        event = event || defaultEvent;
        var boundCallback = callbackTarget ? callback.bind(callbackTarget) : callback;

        var subscription = new koSubscription(self, boundCallback, () => {
            self._subscriptions.get(event).delete(subscription);
            self.afterSubscriptionRemove?.(event);
        });

        self.beforeSubscriptionAdd?.(event);

        self._subscriptions.has(event) || self._subscriptions.set(event, new Set);
        self._subscriptions.get(event).add(subscription);

        return subscription;
    },

    notifySubscribers: function (valueToNotify, event) {
        event = event || defaultEvent;
        if (event === defaultEvent) {
            this.updateVersion();
        }
        if (this.hasSubscriptionsForEvent(event)) {
            var subs = event === defaultEvent && this._changeSubscriptions || new Set(this._subscriptions.get(event));
            try {
                ko.dependencyDetection.begin(); // Begin suppressing dependency detection (by setting the top frame to undefined)
                subs.forEach(subscription => {
                    // In case a subscription was disposed during the arrayForEach cycle, check
                    // for isDisposed on each subscription before invoking its callback
                    subscription._isDisposed || subscription._callback(valueToNotify);
                });
            } finally {
                ko.dependencyDetection.end(); // End suppressing dependency detection
            }
        }
    },

    getVersion: function () {
        return this._versionNumber;
    },

    hasChanged: function (versionToCheck) {
        return this.getVersion() !== versionToCheck;
    },

    updateVersion: function () {
        ++this._versionNumber;
    },

    limit: function(limitFunction) {
        var self = this, selfIsObservable = ko.isObservable(self),
            ignoreBeforeChange, notifyNextChange, previousValue, pendingValue, didUpdate,
            beforeChange = 'beforeChange';

        if (!self._origNotifySubscribers) {
            self._origNotifySubscribers = self.notifySubscribers;
            // Moved out of "limit" to avoid the extra closure
            self.notifySubscribers = (value, event) => {
                if (!event || event === defaultEvent) {
                    self._limitChange(value);
                } else if (event === beforeChange) {
                    self._limitBeforeChange(value);
                } else {
                    self._origNotifySubscribers(value, event);
                }
            }
        }

        var finish = limitFunction(() => {
            self._notificationIsPending = false;

            // If an observable provided a reference to itself, access it to get the latest value.
            // This allows computed observables to delay calculating their value until needed.
            if (selfIsObservable && pendingValue === self) {
                pendingValue = self._evalIfChanged ? self._evalIfChanged() : self();
            }
            var shouldNotify = notifyNextChange || (didUpdate && self.isDifferent(previousValue, pendingValue));

            didUpdate = notifyNextChange = ignoreBeforeChange = false;

            if (shouldNotify) {
                self._origNotifySubscribers(previousValue = pendingValue);
            }
        });

        self._limitChange = (value, isDirty) => {
            if (!isDirty || !self._notificationIsPending) {
                didUpdate = !isDirty;
            }
            self._changeSubscriptions = new Set(self._subscriptions.get(defaultEvent));
            self._notificationIsPending = ignoreBeforeChange = true;
            pendingValue = value;
            finish();
        };
        self._limitBeforeChange = value => {
            if (!ignoreBeforeChange) {
                previousValue = value;
                self._origNotifySubscribers(value, beforeChange);
            }
        };
        self._recordUpdate = () => {
            didUpdate = true;
        };
        self._notifyNextChangeIfValueIsDifferent = () => {
            if (self.isDifferent(previousValue, self.peek(true /*evaluate*/))) {
                notifyNextChange = true;
            }
        };
    },

    hasSubscriptionsForEvent: function(event) {
        return (this._subscriptions.get(event) || []).size;
    },

    isDifferent: function(oldValue, newValue) {
        return !this.equalityComparer || !this.equalityComparer(oldValue, newValue);
    },

    toString: () => '[object Object]',

    extend: function(requestedExtenders) {
        var target = this;
        if (requestedExtenders) {
            ko.utils.objectForEach(requestedExtenders, (key, value) => {
                var extenderHandler = ko.extenders[key];
                if (typeof extenderHandler == 'function') {
                    target = extenderHandler(target, value) || target;
                }
            });
        }
        return target;
    }
};

ko.exportProperty(ko_subscribable_fn, 'init', ko_subscribable_fn.init);
ko.exportProperty(ko_subscribable_fn, 'subscribe', ko_subscribable_fn.subscribe);
ko.exportProperty(ko_subscribable_fn, 'extend', ko_subscribable_fn.extend);

// For browsers that support proto assignment, we overwrite the prototype of each
// observable instance. Since observables are functions, we need Function.prototype
// to still be in the prototype chain.
ko.subscribable['fn'] = Object.setPrototypeOf(ko_subscribable_fn, Function.prototype);

ko.isSubscribable = instance =>
    typeof instance?.subscribe == "function" && typeof instance.notifySubscribers == "function";
(() => {

var outerFrames = [],
    currentFrame,
    lastId = 0,

    begin = options => {
        outerFrames.push(currentFrame);
        currentFrame = options;
    },

    end = () => currentFrame = outerFrames.pop();

ko.dependencyDetection = {
    begin: begin,

    end: end,

    registerDependency: subscribable => {
        if (currentFrame) {
            if (!ko.isSubscribable(subscribable))
                throw new Error("Only subscribable things can act as dependencies");
            currentFrame.callback.call(currentFrame.callbackTarget, subscribable,
                subscribable._id || (subscribable._id = ++lastId));
        }
    },

    ignore: (callback, callbackTarget, callbackArgs) => {
        try {
            begin();
            return callback.apply(callbackTarget, callbackArgs || []);
        } finally {
            end();
        }
    },

    getDependenciesCount: () => currentFrame?.computed.getDependenciesCount(),

    isInitial: () => currentFrame?.isInitial,

    computed: () => currentFrame?.computed
};

})();
const observableLatestValue = Symbol('_latestValue'),
    length = 'length';

ko.observable = initialValue => {
    function observable() {
        if (arguments.length > 0) {
            // Write

            // Ignore writes if the value hasn't changed
            if (observable.isDifferent(observable[observableLatestValue], arguments[0])) {
                observable.valueWillMutate();
                observable[observableLatestValue] = arguments[0];
                observable.valueHasMutated();
            }
            return this; // Permits chained assignments
        }
        // Read
        ko.dependencyDetection.registerDependency(observable); // The caller only needs to be notified of changes if they did a "read" operation
        return observable[observableLatestValue];
    }

    observable[observableLatestValue] = initialValue;

    Object.defineProperty(observable, length, {
        get: () => null == observable[observableLatestValue] ? undefined : observable[observableLatestValue][length]
    });

    // Inherit from 'subscribable'
    ko.subscribable['fn'].init(observable);

    // Inherit from 'observable'
    return Object.setPrototypeOf(observable, observableFn);
}

// Define prototype for observables
var observableFn = {
    'toJSON': function() {
        let value = this[observableLatestValue];
        return value?.toJSON?.() || value;
    },
    equalityComparer: valuesArePrimitiveAndEqual,
    peek: function() { return this[observableLatestValue]; },
    valueHasMutated: function () {
        this.notifySubscribers(this[observableLatestValue], 'spectate');
        this.notifySubscribers(this[observableLatestValue]);
    },
    valueWillMutate: function () { this.notifySubscribers(this[observableLatestValue], 'beforeChange'); }
};

// Note that for browsers that don't support proto assignment, the
// inheritance chain is created manually in the ko.observable constructor
Object.setPrototypeOf(observableFn, ko.subscribable['fn']);

var protoProperty = ko.observable.protoProperty = '__ko_proto__';
observableFn[protoProperty] = ko.observable;

ko.isObservable = instance => {
    var proto = typeof instance == 'function' && instance[protoProperty];
    if (proto && proto !== observableFn[protoProperty] && proto !== ko.computed['fn'][protoProperty]) {
        throw Error("Invalid object that looks like an observable; possibly from another Knockout instance");
    }
    return !!proto;
};

ko.isWriteableObservable = instance => {
    return (typeof instance == 'function' && (
        (instance[protoProperty] === observableFn[protoProperty]) ||  // Observable
        (instance[protoProperty] === ko.computed['fn'][protoProperty] && instance.hasWriteFunction)));   // Writable computed observable
};

ko.exportSymbol('observable', ko.observable);
ko.exportSymbol('isObservable', ko.isObservable);
ko.exportSymbol('observable.fn', observableFn);
ko.exportProperty(observableFn, 'valueHasMutated', observableFn.valueHasMutated);
ko.observableArray = initialValues => {
    initialValues = initialValues || [];

    if (typeof initialValues != 'object' || !('length' in initialValues))
        throw new Error("The argument passed when initializing an observable array must be an array, or null, or undefined.");

    return Object.setPrototypeOf(ko.observable(initialValues), ko.observableArray['fn']).extend({'trackArrayChanges':true});
};

// Note that for browsers that don't support proto assignment, the
// inheritance chain is created manually in the ko.observableArray constructor
ko.observableArray['fn'] = Object.setPrototypeOf({
    'remove': function (valueOrPredicate) {
        var underlyingArray = this.peek();
        var removed = false;
        var predicate = typeof valueOrPredicate == "function" && !ko.isObservable(valueOrPredicate)
            ? valueOrPredicate : value => value === valueOrPredicate;
        var i = underlyingArray.length;
        while (i--) {
            var value = underlyingArray[i];
            if (predicate(value)) {
                if (underlyingArray[i] !== value) {
                    throw Error("Array modified during remove; cannot remove item");
                }
                removed || this.valueWillMutate();
                removed = true;
                underlyingArray.splice(i, 1);
            }
        }
        removed && this.valueHasMutated();
    }
}, ko.observable['fn']);

// Populate ko.observableArray.fn with native arrays functions
Object.getOwnPropertyNames(Array.prototype).forEach(methodName => {
    // skip property length
    if (typeof Array.prototype[methodName] === 'function' && 'constructor' != methodName) {
        if (["copyWithin", "fill", "pop", "push", "reverse", "shift", "sort", "splice", "unshift"].includes(methodName)) {
            // Mutator methods
            // https://developer.mozilla.org/tr/docs/Web/JavaScript/Reference/Global_Objects/Array/prototype#mutator_methods
            // Important: Do not add any additional functions here that may reasonably be used to *read* data from the array
            // because we'll eval them without causing subscriptions, so ko.computed output could end up getting stale
            ko.observableArray['fn'][methodName] = function (...args) {
                // Use "peek" to avoid creating a subscription in any computed that we're executing in the context of
                // (for consistency with mutating regular observables)
                var underlyingArray = this.peek();
                this.valueWillMutate();
                this.cacheDiffForKnownOperation(underlyingArray, methodName, args);
                var methodCallResult = underlyingArray[methodName](...args);
                this.valueHasMutated();
                // The native sort and reverse methods return a reference to the array, but it makes more sense to return the observable array instead.
                return methodCallResult === underlyingArray ? this : methodCallResult;
            };
        } else {
            // Accessor and Iteration methods
            ko.observableArray['fn'][methodName] = function (...args) {
                return this()[methodName](...args);
            };
        }
    }
});

ko.isObservableArray = instance => {
    return ko.isObservable(instance)
        && typeof instance["remove"] == "function"
        && typeof instance["push"] == "function";
};

ko.exportSymbol('observableArray', ko.observableArray);
ko.exportSymbol('isObservableArray', ko.isObservableArray);
const arrayChangeEventName = 'arrayChange';
ko.extenders['trackArrayChanges'] = (target, options) => {
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
            changeSubscription?.dispose();
            spectateSubscription?.dispose();
            spectateSubscription = changeSubscription = null;
            trackingChanges = false;
            previousContents = undefined;
        }
    };

    function trackChanges() {

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

        if (trackingChanges) {
            // Whenever there's a new subscription and there are pending notifications, make sure all previous
            // subscriptions are notified of the change so that all subscriptions are in sync.
            notifyChanges();
            return;
        }

        trackingChanges = true;

        // Track how many times the array actually changed value
        spectateSubscription = target.subscribe(() => ++pendingChanges, null, "spectate");

        // Each time the array changes value, capture a clone so that on the next
        // change it's possible to produce a diff
        previousContents = [].concat(target.peek() || []);
        cachedDiff = null;
        changeSubscription = target.subscribe(notifyChanges);
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
            offset = 0;

        function pushDiff(status, value, index) {
            return diff[diff.length] = { 'status': status, 'value': value, 'index': index };
        }
        switch (operationName) {
            case 'push':
                offset = arrayLength;
            case 'unshift':
                for (let index = 0; index < argsLength; index++) {
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
var computedState = Symbol('_state');

ko.computed = (evaluatorFunctionOrOptions, options) => {
    if (typeof evaluatorFunctionOrOptions === "object") {
        // Single-parameter syntax - everything is on this "options" param
        options = evaluatorFunctionOrOptions;
    } else {
        // Multi-parameter syntax - construct the options according to the params passed
        options = options || {};
        if (evaluatorFunctionOrOptions) {
            options["read"] = evaluatorFunctionOrOptions;
        }
    }
    if (typeof options["read"] != "function")
        throw Error("Pass a function that returns the value of the ko.computed");

    var writeFunction = options["write"];
    var state = {
        latestValue: undefined,
        isStale: true,
        isDirty: true,
        isBeingEvaluated: false,
        suppressDisposalUntilDisposeWhenReturnsFalse: false,
        isDisposed: false,
        pure: false,
        isSleeping: false,
        readFunction: options["read"],
        disposeWhenNodeIsRemoved: options["disposeWhenNodeIsRemoved"] || options.disposeWhenNodeIsRemoved || null,
        disposeWhen: options["disposeWhen"] || options.disposeWhen,
        domNodeDisposalCallback: null,
        dependencyTracking: {},
        dependenciesCount: 0,
        evaluationTimeoutInstance: null
    };

    function computedObservable() {
        if (arguments.length > 0) {
            if (typeof writeFunction !== "function") {
                throw new Error("Cannot write a value to a ko.computed unless you specify a 'write' option. If you wish to read the current value, don't pass any parameters.");
            }
            // Writing a value
            writeFunction(...arguments);
            return this; // Permits chained assignments
        }
        // Reading the value
        state.isDisposed || ko.dependencyDetection.registerDependency(computedObservable);
        if (state.isDirty || (state.isSleeping && computedObservable.haveDependenciesChanged())) {
            computedObservable.evaluateImmediate();
        }
        return state.latestValue;
    }

    computedObservable[computedState] = state;
    computedObservable.hasWriteFunction = typeof writeFunction === "function";

    // Inherit from 'subscribable'
    ko.subscribable['fn'].init(computedObservable);

    // Inherit from 'computed'
    Object.setPrototypeOf(computedObservable, computedFn);

    if (options['pure']) {
        state.pure = true;
        state.isSleeping = true;     // Starts off sleeping; will awake on the first subscription
        ko.utils.extend(computedObservable, pureComputedOverrides);
    }

    if (state.disposeWhenNodeIsRemoved) {
        // Since this computed is associated with a DOM node, and we don't want to dispose the computed
        // until the DOM node is *removed* from the document (as opposed to never having been in the document),
        // we'll prevent disposal until "disposeWhen" first returns false.
        state.suppressDisposalUntilDisposeWhenReturnsFalse = true;

        // disposeWhenNodeIsRemoved: true can be used to opt into the "only dispose after first false result"
        // behaviour even if there's no specific node to watch. In that case, clear the option so we don't try
        // to watch for a non-node's disposal. This technique is intended for KO's internal use only and shouldn't
        // be documented or used by application code, as it's likely to change in a future version of KO.
        if (!state.disposeWhenNodeIsRemoved.nodeType) {
            state.disposeWhenNodeIsRemoved = null;
        }
    }

    // Evaluate, unless sleeping
    state.isSleeping || computedObservable.evaluateImmediate();

    // Attach a DOM node disposal callback so that the computed will be proactively disposed as soon as the node is
    // removed using ko.removeNode. But skip if isActive is false (there will never be any dependencies to dispose).
    if (state.disposeWhenNodeIsRemoved && computedObservable.isActive()) {
        ko.utils.domNodeDisposal.addDisposeCallback(state.disposeWhenNodeIsRemoved, state.domNodeDisposalCallback = () => {
            computedObservable.dispose();
        });
    }

    return computedObservable;
};

// Utility function that disposes a given dependencyTracking entry
function computedDisposeDependencyCallback(id, entryToDispose) {
    entryToDispose?.dispose?.();
}

// This function gets called each time a dependency is detected while evaluating a computed.
// It's factored out as a shared function to avoid creating unnecessary function instances during evaluation.
function computedBeginDependencyDetectionCallback(subscribable, id) {
    var computedObservable = this.computedObservable,
        state = computedObservable[computedState];
    if (!state.isDisposed) {
        if (this.disposalCount && this.disposalCandidates[id]) {
            // Don't want to dispose this subscription, as it's still being used
            computedObservable.addDependencyTracking(id, subscribable, this.disposalCandidates[id]);
            this.disposalCandidates[id] = null; // No need to actually delete the property - disposalCandidates is a transient object anyway
            --this.disposalCount;
        } else if (!state.dependencyTracking[id]) {
            // Brand new subscription - add it
            computedObservable.addDependencyTracking(id, subscribable, state.isSleeping ? { _target: subscribable } : computedObservable.subscribeToDependency(subscribable));
        }
        // If the observable we've accessed has a pending notification, ensure we get notified of the actual final value (bypass equality checks)
        if (subscribable._notificationIsPending) {
            subscribable._notifyNextChangeIfValueIsDifferent();
        }
    }
}

function evaluateImmediate_CallReadThenEndDependencyDetection(state, dependencyDetectionContext) {
    // This function is really part of the evaluateImmediate_CallReadWithDependencyDetection logic.
    // You'd never call it from anywhere else. Factoring it out means that evaluateImmediate_CallReadWithDependencyDetection
    // can be independent of try/finally blocks, which contributes to saving about 40% off the CPU
    // overhead of computed evaluation (on V8 at least).

    try {
        return state.readFunction();
    } finally {
        ko.dependencyDetection.end();

        // For each subscription no longer being used, remove it from the active subscriptions list and dispose it
        if (dependencyDetectionContext.disposalCount && !state.isSleeping) {
            ko.utils.objectForEach(dependencyDetectionContext.disposalCandidates, computedDisposeDependencyCallback);
        }

        state.isStale = state.isDirty = false;
    }
}

var computedFn = {
    equalityComparer: valuesArePrimitiveAndEqual,
    getDependenciesCount: function () {
        return this[computedState].dependenciesCount;
    },
    getDependencies: function () {
        var dependencyTracking = this[computedState].dependencyTracking, dependentObservables = [];

        ko.utils.objectForEach(dependencyTracking, (id, dependency) =>
            dependentObservables[dependency._order] = dependency._target
        );

        return dependentObservables;
    },
    hasAncestorDependency: function (obs) {
        if (!this[computedState].dependenciesCount) {
            return false;
        }
        var dependencies = this.getDependencies();
        return dependencies.includes(obs)
            || !!dependencies.find(dep => dep.hasAncestorDependency && dep.hasAncestorDependency(obs));
    },
    addDependencyTracking: function (id, target, trackingObj) {
        if (this[computedState].pure && target === this) {
            throw Error("A 'pure' computed must not be called recursively");
        }

        this[computedState].dependencyTracking[id] = trackingObj;
        trackingObj._order = this[computedState].dependenciesCount++;
        trackingObj._version = target.getVersion();
    },
    haveDependenciesChanged: function () {
        var id, dependency, dependencyTracking = this[computedState].dependencyTracking;
        for (id in dependencyTracking) {
            if (Object.prototype.hasOwnProperty.call(dependencyTracking, id)) {
                dependency = dependencyTracking[id];
                if ((this._evalDelayed && dependency._target._notificationIsPending) || dependency._target.hasChanged(dependency._version)) {
                    return true;
                }
            }
        }
    },
    markDirty: function () {
        // Process "dirty" events if we can handle delayed notifications
        if (!this[computedState].isBeingEvaluated) {
            this._evalDelayed?.(false /*isChange*/);
        }
    },
    isActive: function () {
        var state = this[computedState];
        return state.isDirty || state.dependenciesCount > 0;
    },
    respondToChange: function () {
        // Ignore "change" events if we've already scheduled a delayed notification
        if (!this._notificationIsPending) {
            this.evaluatePossiblyAsync();
        } else if (this[computedState].isDirty) {
            this[computedState].isStale = true;
        }
    },
    subscribeToDependency: function (target) {
        return target.subscribe(this.evaluatePossiblyAsync, this);
    },
    evaluatePossiblyAsync: function () {
        var computedObservable = this,
            throttleEvaluationTimeout = computedObservable['throttleEvaluation'];
        if (throttleEvaluationTimeout >= 0) {
            clearTimeout(this[computedState].evaluationTimeoutInstance);
            this[computedState].evaluationTimeoutInstance = setTimeout(() =>
                computedObservable.evaluateImmediate(true /*notifyChange*/)
            , throttleEvaluationTimeout);
        } else if (computedObservable._evalDelayed) {
            computedObservable._evalDelayed(true /*isChange*/);
        } else {
            computedObservable.evaluateImmediate(true /*notifyChange*/);
        }
    },
    evaluateImmediate: function (notifyChange) {
        var computedObservable = this,
            state = computedObservable[computedState],
            disposeWhen = state.disposeWhen,
            changed = false;

        // If the evaluation of a ko.computed causes side effects, it's possible that it will trigger its own re-evaluation.
        // This is not desirable (it's hard for a developer to realise a chain of dependencies might cause this, and they almost
        // certainly didn't intend infinite re-evaluations). So, for predictability, we simply prevent ko.computeds from causing
        // their own re-evaluation. Further discussion at https://github.com/SteveSanderson/knockout/pull/387
        if (state.isBeingEvaluated
        // Do not evaluate (and possibly capture new dependencies) if disposed
         || state.isDisposed) {
            return;
        }

        if (state.disposeWhenNodeIsRemoved && !ko.utils.domNodeIsAttachedToDocument(state.disposeWhenNodeIsRemoved) || disposeWhen?.()) {
            // See comment above about suppressDisposalUntilDisposeWhenReturnsFalse
            if (!state.suppressDisposalUntilDisposeWhenReturnsFalse) {
                computedObservable.dispose();
                return;
            }
        } else {
            // It just did return false, so we can stop suppressing now
            state.suppressDisposalUntilDisposeWhenReturnsFalse = false;
        }

        try {
            state.isBeingEvaluated = true;
            changed = this.evaluateImmediate_CallReadWithDependencyDetection(notifyChange);
        } finally {
            state.isBeingEvaluated = false;
        }

        return changed;
    },
    evaluateImmediate_CallReadWithDependencyDetection: function (notifyChange) {
        // This function is really just part of the evaluateImmediate logic. You would never call it from anywhere else.
        // Factoring it out into a separate function means it can be independent of the try/catch block in evaluateImmediate,
        // which contributes to saving about 40% off the CPU overhead of computed evaluation (on V8 at least).

        var computedObservable = this,
            state = computedObservable[computedState],
            changed = false;

        // Initially, we assume that none of the subscriptions are still being used (i.e., all are candidates for disposal).
        // Then, during evaluation, we cross off any that are in fact still being used.
        var isInitial = state.pure ? undefined : !state.dependenciesCount,   // If we're evaluating when there are no previous dependencies, it must be the first time
            dependencyDetectionContext = {
                computedObservable: computedObservable,
                disposalCandidates: state.dependencyTracking,
                disposalCount: state.dependenciesCount
            };

        ko.dependencyDetection.begin({
            callbackTarget: dependencyDetectionContext,
            callback: computedBeginDependencyDetectionCallback,
            computed: computedObservable,
            isInitial: isInitial
        });

        state.dependencyTracking = {};
        state.dependenciesCount = 0;

        var newValue = evaluateImmediate_CallReadThenEndDependencyDetection(state, dependencyDetectionContext);

        if (!state.dependenciesCount) {
            computedObservable.dispose();
            changed = true; // When evaluation causes a disposal, make sure all dependent computeds get notified so they'll see the new state
        } else {
            changed = computedObservable.isDifferent(state.latestValue, newValue);
        }

        if (changed) {
            if (!state.isSleeping) {
                computedObservable.notifySubscribers(state.latestValue, "beforeChange");
            } else {
                computedObservable.updateVersion();
            }

            state.latestValue = newValue;

            computedObservable.notifySubscribers(state.latestValue, "spectate");

            if (!state.isSleeping && notifyChange) {
                computedObservable.notifySubscribers(state.latestValue);
            }
            if (computedObservable._recordUpdate) {
                computedObservable._recordUpdate();
            }
        }

        if (isInitial) {
            computedObservable.notifySubscribers(state.latestValue, "awake");
        }

        return changed;
    },
    peek: function (evaluate) {
        // By default, peek won't re-evaluate, except while the computed is sleeping.
        // Pass in true to evaluate if needed.
        var state = this[computedState];
        if ((state.isDirty && (evaluate || !state.dependenciesCount)) || (state.isSleeping && this.haveDependenciesChanged())) {
            this.evaluateImmediate();
        }
        return state.latestValue;
    },
    limit: function (limitFunction) {
        var self = this;
        // Override the limit function with one that delays evaluation as well
        ko.subscribable['fn'].limit.call(self, limitFunction);
        self._evalIfChanged = () => {
            if (!self[computedState].isSleeping) {
                if (self[computedState].isStale) {
                    self.evaluateImmediate();
                } else {
                    self[computedState].isDirty = false;
                }
            }
            return self[computedState].latestValue;
        };
        self._evalDelayed = isChange => {
            self._limitBeforeChange(self[computedState].latestValue);

            // Mark as dirty
            self[computedState].isDirty = true;
            if (isChange) {
                self[computedState].isStale = true;
            }

            // Pass the observable to the "limit" code, which will evaluate it when
            // it's time to do the notification.
            self._limitChange(self, !isChange /* isDirty */);
        };
    },
    dispose: function () {
        var state = this[computedState];
        if (!state.isSleeping && state.dependencyTracking) {
            ko.utils.objectForEach(state.dependencyTracking, (id, dependency) =>
                dependency.dispose?.()
            );
        }
        if (state.disposeWhenNodeIsRemoved && state.domNodeDisposalCallback) {
            ko.utils.domNodeDisposal.removeDisposeCallback(state.disposeWhenNodeIsRemoved, state.domNodeDisposalCallback);
        }
        state.dependencyTracking = undefined;
        state.dependenciesCount = 0;
        state.isDisposed = true;
        state.isStale = false;
        state.isDirty = false;
        state.isSleeping = false;
        state.disposeWhenNodeIsRemoved = undefined;
        state.disposeWhen = undefined;
        state.readFunction = undefined;
    }
};

var pureComputedOverrides = {
    beforeSubscriptionAdd: function (event) {
        // If asleep, wake up the computed by subscribing to any dependencies.
        var computedObservable = this,
            state = computedObservable[computedState];
        if (!state.isDisposed && state.isSleeping && event == 'change') {
            state.isSleeping = false;
            if (state.isStale || computedObservable.haveDependenciesChanged()) {
                state.dependencyTracking = null;
                state.dependenciesCount = 0;
                if (computedObservable.evaluateImmediate()) {
                    computedObservable.updateVersion();
                }
            } else {
                // First put the dependencies in order
                var dependenciesOrder = [];
                ko.utils.objectForEach(state.dependencyTracking, (id, dependency) =>
                    dependenciesOrder[dependency._order] = id
                );
                // Next, subscribe to each one
                dependenciesOrder.forEach((id, order) => {
                    var dependency = state.dependencyTracking[id],
                        subscription = computedObservable.subscribeToDependency(dependency._target);
                    subscription._order = order;
                    subscription._version = dependency._version;
                    state.dependencyTracking[id] = subscription;
                });
                // Waking dependencies may have triggered effects
                if (computedObservable.haveDependenciesChanged()) {
                    if (computedObservable.evaluateImmediate()) {
                        computedObservable.updateVersion();
                    }
                }
            }

            if (!state.isDisposed) {     // test since evaluating could trigger disposal
                computedObservable.notifySubscribers(state.latestValue, "awake");
            }
        }
    },
    afterSubscriptionRemove: function (event) {
        var state = this[computedState];
        if (!state.isDisposed && event == 'change' && !this.hasSubscriptionsForEvent('change')) {
            ko.utils.objectForEach(state.dependencyTracking, (id, dependency) => {
                if (dependency.dispose) {
                    state.dependencyTracking[id] = {
                        _target: dependency._target,
                        _order: dependency._order,
                        _version: dependency._version
                    };
                    dependency.dispose();
                }
            });
            state.isSleeping = true;
            this.notifySubscribers(undefined, "asleep");
        }
    },
    getVersion: function () {
        // Because a pure computed is not automatically updated while it is sleeping, we can't
        // simply return the version number. Instead, we check if any of the dependencies have
        // changed and conditionally re-evaluate the computed observable.
        var state = this[computedState];
        if (state.isSleeping && (state.isStale || this.haveDependenciesChanged())) {
            this.evaluateImmediate();
        }
        return ko.subscribable['fn'].getVersion.call(this);
    }
};

// Note that for browsers that don't support proto assignment, the
// inheritance chain is created manually in the ko.computed constructor
Object.setPrototypeOf(computedFn, ko.subscribable['fn']);

// Set the proto values for ko.computed
var protoProp = ko.observable.protoProperty; // == "__ko_proto__"
computedFn[protoProp] = ko.computed;

ko.exportSymbol('computed', ko.computed);
ko.exportSymbol('isComputed', instance => (typeof instance == 'function' && instance[protoProp] === computedFn[protoProp]));
ko.exportSymbol('computed.fn', computedFn);
ko.exportProperty(computedFn, 'dispose', computedFn.dispose);

ko.pureComputed = (evaluatorFunctionOrOptions) => {
    if (typeof evaluatorFunctionOrOptions === 'function') {
        return ko.computed(evaluatorFunctionOrOptions, {'pure':true});
    }
    evaluatorFunctionOrOptions = { ...evaluatorFunctionOrOptions };   // make a copy of the parameter object
    evaluatorFunctionOrOptions['pure'] = true;
    return ko.computed(evaluatorFunctionOrOptions);
};

const hasDomDataExpandoProperty = '__ko__hasDomDataOptionValue__';

// Normally, SELECT elements and their OPTIONs can only take value of type 'string' (because the values
// are stored on DOM attributes). ko.selectExtensions provides a way for SELECTs/OPTIONs to have values
// that are arbitrary objects. This is very convenient when implementing things like cascading dropdowns.
ko.selectExtensions = {
    readValue : element => {
        switch (element.nodeName) {
            case 'OPTION':
                return (element[hasDomDataExpandoProperty] === true)
                    ? ko.utils.domData.get(element, ko.bindingHandlers.options.optionValueDomDataKey)
                    : element.value;
            case 'SELECT':
                return element.selectedIndex >= 0
                    ? ko.selectExtensions.readValue(element.options[element.selectedIndex])
                    : undefined;
            default:
                return element.value;
        }
    },

    writeValue: (element, value, allowUnset) => {
        switch (element.nodeName) {
            case 'OPTION':
                if (typeof value === "string") {
                    ko.utils.domData.set(element, ko.bindingHandlers.options.optionValueDomDataKey, undefined);
                    delete element[hasDomDataExpandoProperty];
                    element.value = value;
                }
                else {
                    // Store arbitrary object using DomData
                    ko.utils.domData.set(element, ko.bindingHandlers.options.optionValueDomDataKey, value);
                    element[hasDomDataExpandoProperty] = true;

                    // Special treatment of numbers is just for backward compatibility. KO 1.2.1 wrote numerical values to element.value.
                    element.value = typeof value === "number" ? value : "";
                }
                break;
            case 'SELECT':
                // A blank string or null value will select the caption
                var selection = -1, noValue = ("" === value || null == value),
                    i = element.options.length, optionValue;
                while (i--) {
                    optionValue = ko.selectExtensions.readValue(element.options[i]);
                    // Include special check to handle selecting a caption with a blank string value
                    if (optionValue == value || (optionValue === "" && noValue)) {
                        selection = i;
                        break;
                    }
                }
                if (allowUnset || selection >= 0 || (noValue && element.size > 1)) {
                    element.selectedIndex = selection;
                }
                break;
            default:
                element.value = (value == null) ? "" : value;
                break;
        }
    }
};
ko.expressionRewriting = (() => {
    var
/*
        javaScriptReservedWords = ["true", "false", "null", "undefined"],

    // Matches something that can be assigned to--either an isolated identifier or something ending with a property accessor
    // This is designed to be simple and avoid false negatives, but could produce false positives (e.g., a+b.c).
    // This also will not properly handle nested brackets (e.g., obj1[obj2['prop']]; see #911).
        javaScriptAssignmentTarget = /^(?:[$_a-z][$\w]*|(.+)(\.\s*[$_a-z][$\w]*|\[.+\]))$/i,

        getWriteableValue = expression => {
            if (javaScriptReservedWords.includes(expression))
                return false;
            var match = expression.match(javaScriptAssignmentTarget);
            return match === null ? false : match[1] ? ('Object(' + match[1] + ')' + match[2]) : expression;
        },
*/
    // The following regular expressions will be used to split an object-literal string into tokens

        specials = ',"\'`{}()/:[\\]',    // These characters have special meaning to the parser and must not appear in the middle of a token, except as part of a string.
        // Create the actual regular expression by or-ing the following regex strings. The order is important.
        bindingToken = RegExp([
            // These match strings, either with double quotes, single quotes, or backticks
            '"(?:\\\\.|[^"])*"',
            "'(?:\\\\.|[^'])*'",
            "`(?:\\\\.|[^`])*`",
            // Match C style comments
            "/\\*(?:[^*]|\\*+[^*/])*\\*+/",
            // Match C++ style comments
            "//.*\n",
            // Match a regular expression (text enclosed by slashes), but will also match sets of divisions
            // as a regular expression (this is handled by the parsing loop below).
            '/(?:\\\\.|[^/])+/w*',
            // Match text (at least two characters) that does not contain any of the above special characters,
            // although some of the special characters are allowed to start it (all but the colon and comma).
            // The text can contain spaces, but leading or trailing spaces are skipped.
            '[^\\s:,/][^' + specials + ']*[^\\s' + specials + ']',
            // Match any non-space character not matched already. This will match colons and commas, since they're
            // not matched by "everyThingElse", but will also match any other single character that wasn't already
            // matched (for example: in "a: 1, b: 2", each of the non-space characters will be matched by oneNotSpace).
            '[^\\s]'
        ].join('|'), 'g'),

        // Match end of previous token to determine whether a slash is a division or regex.
        divisionLookBehind = /[\])"'A-Za-z0-9_$]+$/,
        keywordRegexLookBehind = {'in':1,'return':1,'typeof':1},

        parseObjectLiteral = objectLiteralString => {
            // Trim leading and trailing spaces from the string
            var str = ko.utils.stringTrim(objectLiteralString);

            // Trim braces '{' surrounding the whole object literal
            if (str.charCodeAt(0) === 123) str = str.slice(1, -1);

            // Add a newline to correctly match a C++ style comment at the end of the string and
            // add a comma so that we don't need a separate code block to deal with the last item
            str += "\n,";

            // Split into tokens
            var result = [], toks = str.match(bindingToken), key, values = [], depth = 0;

            if (toks.length > 1) {
                var i = 0, tok;
                while ((tok = toks[i++])) {
                    var c = tok.charCodeAt(0);
                    // A comma signals the end of a key/value pair if depth is zero
                    if (c === 44) { // ","
                        if (depth <= 0) {
                            result.push((key && values.length)
                                ? {key: key, value: values.join('')}
                                : {'unknown': key || values.join('')});
                            key = depth = 0;
                            values = [];
                            continue;
                        }
                    // Simply skip the colon that separates the name and value
                    } else if (c === 58) { // ":"
                        if (!depth && !key && values.length === 1) {
                            key = values.pop();
                            continue;
                        }
                    // Comments: skip them
                    } else if (c === 47 && tok.length > 1 && (tok.charCodeAt(1) === 47 || tok.charCodeAt(1) === 42)) {  // "//" or "/*"
                        continue;
                    // A set of slashes is initially matched as a regular expression, but could be division
                    } else if (c === 47 && i && tok.length > 1) {  // "/"
                        // Look at the end of the previous token to determine if the slash is actually division
                        var match = toks[i-1].match(divisionLookBehind);
                        if (match && !keywordRegexLookBehind[match[0]]) {
                            // The slash is actually a division punctuator; re-parse the remainder of the string (not including the slash)
                            str = str.slice(str.indexOf(tok) + 1);
                            toks = str.match(bindingToken);
                            i = -1;
                            // Continue with just the slash
                            tok = '/';
                        }
                    // Increment depth for parentheses, braces, and brackets so that interior commas are ignored
                    } else if (c === 40 || c === 123 || c === 91) { // '(', '{', '['
                        ++depth;
                    } else if (c === 41 || c === 125 || c === 93) { // ')', '}', ']'
                        --depth;
                    // The key will be the first token; if it's a string, trim the quotes
                    } else if (!key && !values.length && (c === 34 || c === 39)) { // '"', "'"
                        tok = tok.slice(1, -1);
                    }
                    values.push(tok);
                }
                if (depth > 0) {
                    throw Error("Unbalanced parentheses, braces, or brackets");
                }
            }
            return result;
        },

    // Two-way bindings include a write function that allow the handler to update the value even if it's not an observable.
//        twoWayBindings = new Set,

        preProcessBindings = (bindingsStringOrKeyValueArray) => {

            var resultStrings = [],
//                propertyAccessorResultStrings = [],
                keyValueArray = parseObjectLiteral(bindingsStringOrKeyValueArray),

                processKeyValue = (key, val) => {
                    var /*writableVal,*/ obj = ko.bindingHandlers[key];
                    if (obj?.['preprocess'] && !obj['preprocess'](val, key, processKeyValue))
                        return;
/*
                    if (twoWayBindings.has(key) && (writableVal = getWriteableValue(val))) {
                        // For two-way bindings, provide a write method in case the value
                        // isn't a writable observable.
                        propertyAccessorResultStrings.push("'" + key + "':function(_z){" + writableVal + "=_z}");
                    }
*/
                    // Values are wrapped in a function so that each value can be accessed independently
                    val = 'function(){return ' + val + ' }';
                    resultStrings.push("'" + key + "':" + val);
                };

            keyValueArray.forEach(keyValue =>
                processKeyValue(keyValue.key || keyValue['unknown'], keyValue.value)
            );
/*
            if (propertyAccessorResultStrings.length)
                processKeyValue('_ko_property_writers', "{" + propertyAccessorResultStrings.join(",") + " }");
*/
            return resultStrings.join(",");
        };

    return {
        bindingRewriteValidators: [],

//        twoWayBindings: twoWayBindings,

        parseObjectLiteral: parseObjectLiteral,

        preProcessBindings: preProcessBindings,

        keyValueArrayContainsKey: (keyValueArray, key) =>
            -1 < keyValueArray.findIndex(v => v['key'] == key),

        // Internal, private KO utility for updating model properties from within bindings
        // property:            If the property being updated is (or might be) an observable, pass it here
        //                      If it turns out to be a writable observable, it will be written to directly
        // allBindings:         An object with a get method to retrieve bindings in the current execution context.
        //                      This will be searched for a '_ko_property_writers' property in case you're writing to a non-observable
        // key:                 The key identifying the property to be written. Example: for { hasFocus: myValue }, write to 'myValue' by specifying the key 'hasFocus'
        // value:               The value to be written
        // checkIfDifferent:    If true, and if the property being written is a writable observable, the value will only be written if
        //                      it is !== existing value on that writable observable
        writeValueToProperty: (property, allBindings, key, value, checkIfDifferent) => {
            if (!property || !ko.isObservable(property)) {
                throw Error(`${key} , must be observable`);
//                allBindings.get('_ko_property_writers')?.[key]?.(value);
            } else if (ko.isWriteableObservable(property) && (!checkIfDifferent || property.peek() !== value)) {
                property(value);
            }
        }
    };
})();
(() => {
    // "Virtual elements" is an abstraction on top of the usual DOM API which understands the notion that comment nodes
    // may be used to represent hierarchy (in addition to the DOM's natural hierarchy).
    // If you call the DOM-manipulating functions on ko.virtualElements, you will be able to read and write the state
    // of that virtual hierarchy
    //
    // The point of all this is to support containerless templates (e.g., <!-- ko foreach:someCollection -->blah<!-- /ko -->)
    // without having to scatter special cases all over the binding and templating code.

    var startCommentRegex = /^\s*ko(?:\s+([\s\S]+))?\s*$/;
    var endCommentRegex =   /^\s*\/ko\s*$/;

    function isStartComment(node) {
        return (node.nodeType == 8) && startCommentRegex.test(node.nodeValue);
    }

    function isEndComment(node) {
        return (node.nodeType == 8) && endCommentRegex.test(node.nodeValue);
    }

    function isUnmatchedEndComment(node) {
        return isEndComment(node) && !(ko.utils.domData.get(node, matchedEndCommentDataKey));
    }

    var matchedEndCommentDataKey = "__ko_matchedEndComment__"

    function getVirtualChildren(startComment, allowUnbalanced) {
        var currentNode = startComment;
        var depth = 1;
        var children = [];
        while (currentNode = currentNode.nextSibling) {
            if (isEndComment(currentNode)) {
                ko.utils.domData.set(currentNode, matchedEndCommentDataKey, true);
                if (!--depth)
                    return children;
            }

            children.push(currentNode);

            if (isStartComment(currentNode))
                ++depth;
        }
        if (!allowUnbalanced)
            throw new Error("Cannot find closing comment tag to match: " + startComment.nodeValue);
        return null;
    }

    function getMatchingEndComment(startComment, allowUnbalanced) {
        var allVirtualChildren = getVirtualChildren(startComment, allowUnbalanced);
        if (allVirtualChildren) {
            return (allVirtualChildren.length
                ? allVirtualChildren[allVirtualChildren.length - 1]
                : startComment).nextSibling;
        }
        return null; // Must have no matching end comment, and allowUnbalanced is true
    }

    ko.virtualElements = {
        allowedBindings: {},

        childNodes: node => isStartComment(node) ? getVirtualChildren(node) : node.childNodes,

        emptyNode: node => {
            if (isStartComment(node)) {
                var virtualChildren = getVirtualChildren(node);
                virtualChildren && [...virtualChildren].forEach(child => ko.removeNode(child));
            } else
                ko.utils.emptyDomNode(node);
        },

        setDomNodeChildren: (node, childNodes) => {
            if (isStartComment(node)) {
                ko.virtualElements.emptyNode(node);
                node.after(...childNodes);
            } else
                ko.utils.setDomNodeChildren(node, childNodes);
        },

        prepend: (containerNode, nodeToPrepend) => {
            // Start comments must always have a parent and at least one following sibling (the end comment)
            isStartComment(containerNode)
                ? containerNode.nextSibling.before(nodeToPrepend)
                : containerNode.prepend(nodeToPrepend);
        },

        insertAfter: (containerNode, nodeToInsert, insertAfterNode) => {
            insertAfterNode
                ? insertAfterNode.after(nodeToInsert)
                : ko.virtualElements.prepend(containerNode, nodeToInsert);
        },

        firstChild: node => {
            if (isStartComment(node)) {
                let next = node.nextSibling;
                return (!next || isEndComment(next)) ? null : next;
            }
            let first = node.firstChild;
            if (first && isEndComment(first)) {
                throw new Error("Found invalid end comment, as the first child of " + node);
            }
            return first;
        },

        nextSibling: node => {
            if (isStartComment(node)) {
                node = getMatchingEndComment(node);
            }
            let next = node.nextSibling;
            if (next && isEndComment(next)) {
                if (isUnmatchedEndComment(next)) {
                    throw Error("Found end comment without a matching opening comment, as child of " + node);
                }
                return null;
            }
            return next;
        },

        hasBindingValue: isStartComment,

        virtualNodeBindingValue: node => {
            var regexMatch = node.nodeValue.match(startCommentRegex);
            return regexMatch ? regexMatch[1] : null;
        }
    };
})();

const defaultBindingAttributeName = "data-bind",

    bindingCache = new Map,

    // The following function is only used internally by this default provider.
    // It's not part of the interface definition for a general binding provider.
    getBindingsString = node => {
        switch (node.nodeType) {
            case 1: return node.getAttribute(defaultBindingAttributeName);   // Element
            case 8: return ko.virtualElements.virtualNodeBindingValue(node); // Comment node
        }
        return null;
    };

ko.bindingProvider = new class
{
    nodeHasBindings(node) {
        switch (node.nodeType) {
            case 1: // Element
                return node.getAttribute(defaultBindingAttributeName) != null;
            case 8: // Comment node
                return ko.virtualElements.hasBindingValue(node);
        }
        return false;
    }

    getBindingAccessors(node, bindingContext) {
        var bindingsString = getBindingsString(node);
        if (bindingsString) {
            try {
                let cacheKey = bindingsString,
                    bindingFunction = bindingCache.get(cacheKey);
                if (!bindingFunction) {
                    // Build the source for a function that evaluates "expression"
                    // For each scope variable, add an extra level of "with" nesting
                    // Example result: with(sc1) { with(sc0) { return (expression) } }
                    var rewrittenBindings = ko.expressionRewriting.preProcessBindings(bindingsString),
                        functionBody = "with($context){with($data||{}){return{" + rewrittenBindings + "}}}";
                    bindingFunction = new Function("$context", "$element", functionBody);
                    bindingCache.set(cacheKey, bindingFunction);
                }
                return bindingFunction(bindingContext, node);
            } catch (ex) {
                ex.message = "Unable to parse bindings.\nBindings value: " + bindingsString
                    + "\nMessage: " + ex.message;
                throw ex;
            }
        }
        return null;
    }
};

// Hide or don't minify context properties, see https://github.com/knockout/knockout/issues/2294
const contextSubscribable = Symbol('_subscribable'),
    contextAncestorBindingInfo = Symbol('_ancestorBindingInfo'),
    contextDataDependency = Symbol('_dataDependency'),

    inheritParentVm = {},

    boundElementDomDataKey = ko.utils.domData.nextKey();

ko.bindingHandlers = {};

// The ko.bindingContext constructor is only called directly to create the root context. For child
// contexts, use bindingContext.createChildContext or bindingContext.extend.
ko.bindingContext = class {
    constructor(dataItemOrAccessor, parentContext, dataItemAlias, extendCallback, options)
    {
        var self = this,
            shouldInheritData = dataItemOrAccessor === inheritParentVm,
            realDataItemOrAccessor = shouldInheritData ? undefined : dataItemOrAccessor,
            isFunc = typeof(realDataItemOrAccessor) == "function" && !ko.isObservable(realDataItemOrAccessor),
            subscribable,
            dataDependency = options?.['dataDependency'],

        // The binding context object includes static properties for the current, parent, and root view models.
        // If a view model is actually stored in an observable, the corresponding binding context object, and
        // any child contexts, must be updated when the view model is changed.
        updateContext = () => {
            // Most of the time, the context will directly get a view model object, but if a function is given,
            // we call the function to retrieve the view model. If the function accesses any observables or returns
            // an observable, the dependency is tracked, and those observables can later cause the binding
            // context to be updated.
            var dataItemOrObservable = isFunc ? realDataItemOrAccessor() : realDataItemOrAccessor,
                dataItem = ko.utils.unwrapObservable(dataItemOrObservable);

            if (parentContext) {
                // Copy $root and any custom properties from the parent context
                ko.utils.extend(self, parentContext);

                // Copy Symbol properties
                if (contextAncestorBindingInfo in parentContext) {
                    self[contextAncestorBindingInfo] = parentContext[contextAncestorBindingInfo];
                }
            } else {
                self['$parents'] = [];
                self['$root'] = dataItem;

                // Export 'ko' in the binding context so it will be available in bindings and templates
                // even if 'ko' isn't exported as a global, such as when using an AMD loader.
                // See https://github.com/SteveSanderson/knockout/issues/490
                self['ko'] = ko;
            }

            self[contextSubscribable] = subscribable;

            if (shouldInheritData) {
                dataItem = self['$data'];
            } else {
                self['$rawData'] = dataItemOrObservable;
                self['$data'] = dataItem;
            }

            if (dataItemAlias)
                self[dataItemAlias] = dataItem;

            // The extendCallback function is provided when creating a child context or extending a context.
            // It handles the specific actions needed to finish setting up the binding context. Actions in this
            // function could also add dependencies to this binding context.
            extendCallback?.(self, parentContext, dataItem);

            // When a "parent" context is given and we don't already have a dependency on its context, register a dependency on it.
            // Thus whenever the parent context is updated, this context will also be updated.
            if (parentContext?.[contextSubscribable] && !ko.dependencyDetection.computed().hasAncestorDependency(parentContext[contextSubscribable])) {
                parentContext[contextSubscribable]();
            }

            if (dataDependency) {
                self[contextDataDependency] = dataDependency;
            }

            return self['$data'];
        };

        if (options?.['exportDependencies']) {
            // The "exportDependencies" option means that the calling code will track any dependencies and re-create
            // the binding context when they change.
            updateContext();
        } else {
            subscribable = ko.pureComputed(updateContext);
            subscribable.peek();

            // At this point, the binding context has been initialized, and the "subscribable" computed observable is
            // subscribed to any observables that were accessed in the process. If there is nothing to track, the
            // computed will be inactive, and we can safely throw it away. If it's active, the computed is stored in
            // the context object.
            if (subscribable.isActive()) {
                // Always notify because even if the model ($data) hasn't changed, other context properties might have changed
                subscribable.equalityComparer = null;
            } else {
                self[contextSubscribable] = undefined;
            }
        }
    }

    // Extend the binding context hierarchy with a new view model object. If the parent context is watching
    // any observables, the new child context will automatically get a dependency on the parent context.
    // But this does not mean that the $data value of the child context will also get updated. If the child
    // view model also depends on the parent view model, you must provide a function that returns the correct
    // view model on each update.
   'createChildContext'(dataItemOrAccessor, dataItemAlias, extendCallback, options) {
        if (!options && dataItemAlias && typeof dataItemAlias == "object") {
            options = dataItemAlias;
            dataItemAlias = options['as'];
            extendCallback = options['extend'];
        }

        return new ko.bindingContext(dataItemOrAccessor, this, dataItemAlias, (self, parentContext) => {
            // Extend the context hierarchy by setting the appropriate pointers
            self['$parentContext'] = parentContext;
            self['$parent'] = parentContext['$data'];
            self['$parents'] = (parentContext['$parents'] || []).slice(0);
            self['$parents'].unshift(self['$parent']);
            if (extendCallback)
                extendCallback(self);
        }, options);
    }

    // Extend the binding context with new custom properties. This doesn't change the context hierarchy.
    // Similarly to "child" contexts, provide a function here to make sure that the correct values are set
    // when an observable view model is updated.
    'extend'(properties, options) {
        return new ko.bindingContext(inheritParentVm, this, null, self =>
            ko.utils.extend(self, typeof(properties) == "function" ? properties(self) : properties)
        , options);
    }
};

function asyncContextDispose(node) {
    var bindingInfo = ko.utils.domData.get(node, boundElementDomDataKey),
        asyncContext = bindingInfo?.asyncContext;
    if (asyncContext) {
        bindingInfo.asyncContext = null;
        asyncContext.notifyAncestor();
    }
}

class AsyncCompleteContext {
    constructor(node, bindingInfo, ancestorBindingInfo) {
        this.node = node;
        this.bindingInfo = bindingInfo;
        this.asyncDescendants = new Set;
        this.childrenComplete = false;

        bindingInfo.asyncContext || ko.utils.domNodeDisposal.addDisposeCallback(node, asyncContextDispose);

        if (ancestorBindingInfo?.asyncContext) {
            ancestorBindingInfo.asyncContext.asyncDescendants.add(node);
            this.ancestorBindingInfo = ancestorBindingInfo;
        }
    }
    notifyAncestor() {
        this.ancestorBindingInfo?.asyncContext?.descendantComplete(this.node);
    }
    descendantComplete(node) {
        this.asyncDescendants.delete(node);
        this.asyncDescendants.size || this.completeChildren?.();
    }
    completeChildren() {
        this.childrenComplete = true;
        if (this.bindingInfo.asyncContext && !this.asyncDescendants.size) {
            this.bindingInfo.asyncContext = null;
            ko.utils.domNodeDisposal.removeDisposeCallback(this.node, asyncContextDispose);
            ko.bindingEvent.notify(this.node, ko.bindingEvent.descendantsComplete);
            this.notifyAncestor();
        }
    }
}

ko.bindingEvent = {
    childrenComplete: "childrenComplete",
    descendantsComplete : "descendantsComplete",

    subscribe: (node, event, callback, context, options) => {
        var bindingInfo = ko.utils.domData.getOrSet(node, boundElementDomDataKey, {});
        if (!bindingInfo.eventSubscribable) {
            bindingInfo.eventSubscribable = new ko.subscribable;
        }
        if (options?.['notifyImmediately'] && bindingInfo.notifiedEvents[event]) {
            ko.dependencyDetection.ignore(callback, context, [node]);
        }
        return bindingInfo.eventSubscribable.subscribe(callback, context, event);
    },

    notify: (node, event) => {
        var bindingInfo = ko.utils.domData.get(node, boundElementDomDataKey);
        if (bindingInfo) {
            bindingInfo.notifiedEvents[event] = true;
            bindingInfo.eventSubscribable?.notifySubscribers(node, event);
            if (event == ko.bindingEvent.childrenComplete) {
                if (bindingInfo.asyncContext) {
                    bindingInfo.asyncContext.completeChildren();
                } else if (bindingInfo.asyncContext === undefined && bindingInfo.eventSubscribable?.hasSubscriptionsForEvent(ko.bindingEvent.descendantsComplete)) {
                    // It's currently an error to register a descendantsComplete handler for a node that was never registered as completing asynchronously.
                    // That's because without the asyncContext, we don't have a way to know that all descendants have completed.
                    throw new Error("descendantsComplete event not supported for bindings on this node");
                }
            }
        }
    },

    startPossiblyAsyncContentBinding: (node, bindingContext) => {
        var bindingInfo = ko.utils.domData.getOrSet(node, boundElementDomDataKey, {});

        if (!bindingInfo.asyncContext) {
            bindingInfo.asyncContext = new AsyncCompleteContext(node, bindingInfo, bindingContext[contextAncestorBindingInfo]);
        }

        // If the provided context was already extended with this node's binding info, just return the extended context
        if (bindingContext[contextAncestorBindingInfo] == bindingInfo) {
            return bindingContext;
        }

        return bindingContext['extend'](ctx => {
            ctx[contextAncestorBindingInfo] = bindingInfo;
        });
    }
};

function validateThatBindingIsAllowedForVirtualElements(bindingName) {
    var validator = ko.virtualElements.allowedBindings[bindingName];
    if (!validator)
        throw new Error("The binding '" + bindingName + "' cannot be used with virtual elements")
}

function applyBindingsToDescendantsInternal(bindingContext, elementOrVirtualElement) {
    var currentChild, nextInQueue = ko.virtualElements.firstChild(elementOrVirtualElement);

    while (currentChild = nextInQueue) {
        // Keep a record of the next child *before* applying bindings, in case the binding removes the current child from its position
        nextInQueue = ko.virtualElements.nextSibling(currentChild);
        applyBindingsToNodeAndDescendantsInternal(bindingContext, currentChild);
    }
    ko.bindingEvent.notify(elementOrVirtualElement, ko.bindingEvent.childrenComplete);
}

function applyBindingsToNodeAndDescendantsInternal(bindingContext, nodeVerified) {
    var bindingContextForDescendants = bindingContext;

    var isElement = (nodeVerified.nodeType === 1);

    // Perf optimisation: Apply bindings only if...
    // (1) We need to store the binding info for the node (all element nodes)
    // (2) It might have bindings (e.g., it has a data-bind attribute, or it's a marker for a containerless template)
    if (isElement || ko.bindingProvider.nodeHasBindings(nodeVerified))
        bindingContextForDescendants = applyBindingsToNodeInternal(nodeVerified, null, bindingContext)['bindingContextForDescendants'];

    // Don't want bindings that operate on text nodes to mutate <script> and <textarea> contents,
    // because it's unexpected and a potential XSS issue.
    // Also bindings should not operate on <template> elements since this breaks in Internet Explorer
    // and because such elements' contents are always intended to be bound in a different context
    // from where they appear in the document.
    if (bindingContextForDescendants && !nodeVerified.matches?.('SCRIPT,TEXTAREA,TEMPLATE')) {
        applyBindingsToDescendantsInternal(bindingContextForDescendants, nodeVerified);
    }
}

function topologicalSortBindings(bindings) {
    // Depth-first sort
    var result = [],                // The list of key/handler pairs that we will return
        bindingsConsidered = {},    // A temporary record of which bindings are already in 'result'
        cyclicDependencyStack = []; // Keeps track of a depth-search so that, if there's a cycle, we know which bindings caused it
    ko.utils.objectForEach(bindings, function pushBinding(bindingKey) {
        if (!bindingsConsidered[bindingKey]) {
            var binding = ko.bindingHandlers[bindingKey];
            if (binding) {
                // First add dependencies (if any) of the current binding
                if (binding['after']) {
                    cyclicDependencyStack.push(bindingKey);
                    binding['after'].forEach(bindingDependencyKey => {
                        if (bindings[bindingDependencyKey]) {
                            if (cyclicDependencyStack.includes(bindingDependencyKey)) {
                                throw Error("Cannot combine the following bindings, because they have a cyclic dependency: " + cyclicDependencyStack.join(", "));
                            }
                            pushBinding(bindingDependencyKey);
                        }
                    });
                    cyclicDependencyStack.length--;
                }
                // Next add the current binding
                result.push({ key: bindingKey, handler: binding });
            }
            bindingsConsidered[bindingKey] = true;
        }
    });

    return result;
}

function applyBindingsToNodeInternal(node, sourceBindings, bindingContext) {
    var bindingInfo = ko.utils.domData.getOrSet(node, boundElementDomDataKey, {});

    // Prevent multiple applyBindings calls for the same node, except when a binding value is specified
    var alreadyBound = bindingInfo.alreadyBound;
    if (!sourceBindings) {
        if (alreadyBound) {
            throw Error("You cannot apply bindings multiple times to the same element.");
        }
        bindingInfo.alreadyBound = true;
    }
    if (!alreadyBound) {
        bindingInfo.context = bindingContext;
    }
    if (!bindingInfo.notifiedEvents) {
        bindingInfo.notifiedEvents = {};
    }

    // Use bindings if given, otherwise fall back on asking the bindings provider to give us some bindings
    var bindings;
    if (sourceBindings && typeof sourceBindings !== 'function') {
        bindings = sourceBindings;
    } else {
        // Get the binding from the provider within a computed observable so that we can update the bindings whenever
        // the binding context is updated or if the binding provider accesses observables.
        var bindingsUpdater = ko.computed(
            () => {
                bindings = sourceBindings ? sourceBindings(bindingContext, node) : ko.bindingProvider.getBindingAccessors(node, bindingContext);
                // Register a dependency on the binding context to support observable view models.
                if (bindings) {
                    bindingContext[contextSubscribable]?.();
                    bindingContext[contextDataDependency]?.();
                }
                return bindings;
            },
            { disposeWhenNodeIsRemoved: node }
        );

        if (!bindings || !bindingsUpdater.isActive())
            bindingsUpdater = null;
    }

    var contextToExtend = bindingContext;
    var bindingHandlerThatControlsDescendantBindings;
    if (bindings) {
        // Return the value accessor for a given binding. When bindings are static (won't be updated because of a binding
        // context update), just return the value accessor from the binding. Otherwise, return a function that always gets
        // the latest binding value and registers a dependency on the binding updater.
        var getValueAccessor = bindingsUpdater
            ? bindingKey => () => bindingsUpdater()[bindingKey]()
            : bindingKey => bindings[bindingKey];

        // Use of allBindings as a function is deprecated and removed
        // The following is the 3.x allBindings API
        var allBindings = {
            'get': key => bindings[key] && getValueAccessor(key)(),
            'has': key => key in bindings
        };

        if (ko.bindingEvent.childrenComplete in bindings) {
            ko.bindingEvent.subscribe(node, ko.bindingEvent.childrenComplete, () => {
                var callback = bindings[ko.bindingEvent.childrenComplete]();
                if (callback) {
                    var nodes = ko.virtualElements.childNodes(node);
                    nodes.length && callback(nodes, ko.dataFor(nodes[0]));
                }
            });
        }

        if (ko.bindingEvent.descendantsComplete in bindings) {
            contextToExtend = ko.bindingEvent.startPossiblyAsyncContentBinding(node, bindingContext);
            ko.bindingEvent.subscribe(node, ko.bindingEvent.descendantsComplete, () => {
                var callback = bindings[ko.bindingEvent.descendantsComplete]();
                if (callback && ko.virtualElements.firstChild(node)) {
                    callback(node);
                }
            });
        }

        // First put the bindings into the right order
        // Go through the sorted bindings, calling init and update for each
        topologicalSortBindings(bindings).forEach(bindingKeyAndHandler => {
            // Note that topologicalSortBindings has already filtered out any nonexistent binding handlers,
            // so bindingKeyAndHandler.handler will always be nonnull.
            var handlerInitFn = bindingKeyAndHandler.handler["init"],
                handlerUpdateFn = bindingKeyAndHandler.handler["update"],
                bindingKey = bindingKeyAndHandler.key;

            if (node.nodeType === 8) {
                validateThatBindingIsAllowedForVirtualElements(bindingKey);
            }

            try {
                // Run init, ignoring any dependencies
                if (typeof handlerInitFn == "function") {
                    ko.dependencyDetection.ignore(() => {
                        var initResult = handlerInitFn(node, getValueAccessor(bindingKey), allBindings, contextToExtend['$data'], contextToExtend);

                        // If this binding handler claims to control descendant bindings, make a note of this
                        if (initResult && initResult['controlsDescendantBindings']) {
                            if (bindingHandlerThatControlsDescendantBindings !== undefined)
                                throw new Error("Multiple bindings (" + bindingHandlerThatControlsDescendantBindings + " and " + bindingKey + ") are trying to control descendant bindings of the same element. You cannot use these bindings together on the same element.");
                            bindingHandlerThatControlsDescendantBindings = bindingKey;
                        }
                    });
                }

                // Run update in its own computed wrapper
                if (typeof handlerUpdateFn == "function") {
                    ko.computed(
                        () => handlerUpdateFn(node, getValueAccessor(bindingKey), allBindings, contextToExtend['$data'], contextToExtend),
                        { disposeWhenNodeIsRemoved: node }
                    );
                }
            } catch (ex) {
                ex.message = "Unable to process binding \"" + bindingKey + ": " + bindings[bindingKey] + "\"\nMessage: " + ex.message;
                throw ex;
            }
        });
    }

    var shouldBindDescendants = bindingHandlerThatControlsDescendantBindings === undefined;
    return {
        'shouldBindDescendants': shouldBindDescendants,
        'bindingContextForDescendants': shouldBindDescendants && contextToExtend
    };
}

ko.storedBindingContextForNode = node => {
    var bindingInfo = ko.utils.domData.get(node, boundElementDomDataKey);
    return bindingInfo && bindingInfo.context;
}

function getBindingContext(viewModelOrBindingContext, extendContextCallback) {
    return viewModelOrBindingContext && (viewModelOrBindingContext instanceof ko.bindingContext)
        ? viewModelOrBindingContext
        : new ko.bindingContext(viewModelOrBindingContext, undefined, undefined, extendContextCallback);
}

ko.applyBindingAccessorsToNode = (node, bindings, viewModelOrBindingContext) =>
    applyBindingsToNodeInternal(node, bindings, getBindingContext(viewModelOrBindingContext));

ko.applyBindingsToDescendants = (viewModelOrBindingContext, rootNode) => {
    if (rootNode.nodeType === 1 || rootNode.nodeType === 8)
        applyBindingsToDescendantsInternal(getBindingContext(viewModelOrBindingContext), rootNode);
};

ko.applyBindings = function (viewModelOrBindingContext, rootNode, extendContextCallback) {
    if (arguments.length < 2) {
        rootNode = document.body;
        if (!rootNode) {
            throw Error("ko.applyBindings: could not find document.body; has the document been loaded?");
        }
    } else if (!rootNode || (rootNode.nodeType !== 1 && rootNode.nodeType !== 8)) {
        throw Error("ko.applyBindings: first parameter should be your view model; second parameter should be a DOM node");
    }

    applyBindingsToNodeAndDescendantsInternal(getBindingContext(viewModelOrBindingContext, extendContextCallback), rootNode);
};

// Retrieving binding context from arbitrary nodes
ko.dataFor = node => {
    // We can only do something meaningful for elements and comment nodes (in particular, not text nodes, as IE can't store domdata for them)
    var context = node && [1,8].includes(node.nodeType) && ko.storedBindingContextForNode(node);
    return context ? context['$data'] : undefined;
};

ko.exportSymbol('bindingHandlers', ko.bindingHandlers);
ko.exportSymbol('applyBindings', ko.applyBindings);
ko.exportSymbol('applyBindingAccessorsToNode', ko.applyBindingAccessorsToNode);
ko.exportSymbol('dataFor', ko.dataFor);
(() => {
    var loadingSubscribablesCache = Object.create(null), // Tracks component loads that are currently in flight
        loadedDefinitionsCache = new Map();    // Tracks component loads that have already completed

    ko.components = {
        get: (componentName, callback) => {
            if (loadedDefinitionsCache.has(componentName)) {
                callback(loadedDefinitionsCache.get(componentName));
            } else {
                // Join the loading process that is already underway, or start a new one.
                var subscribable = loadingSubscribablesCache[componentName];
                if (subscribable) {
                    subscribable.subscribe(callback);
                } else {
                    // It's not started loading yet. Start loading, and when it's done, move it to loadedDefinitionsCache.
                    subscribable = loadingSubscribablesCache[componentName] = new ko.subscribable();
                    subscribable.subscribe(callback);

                    loadComponent(componentName, definition => {
                        loadedDefinitionsCache.set(componentName, definition);
                        delete loadingSubscribablesCache[componentName];

                        // For API consistency, all loads complete asynchronously. However we want to avoid
                        // adding an extra task schedule if it's unnecessary (i.e., the completion is already
                        // async).
                        //
                        // You can bypass the 'always asynchronous' feature by putting the synchronous:true
                        // flag on your component configuration when you register it.
                        subscribable.notifySubscribers(definition);
                    });
                }
            }
        },

        register: (componentName, config) => {
            if (!config) {
                throw new Error('Invalid configuration for ' + componentName);
            }

            if (defaultConfigRegistry[componentName]) {
                throw new Error('Component ' + componentName + ' is already registered');
            }

            defaultConfigRegistry[componentName] = config;
        }
    };

    // The default loader is responsible for two things:
    // 1. Maintaining the default in-memory registry of component configuration objects
    //    (i.e., the thing you're writing to when you call ko.components.register(someName, ...))
    // 2. Answering requests for components by fetching configuration objects
    //    from that default in-memory registry and resolving them into standard
    //    component definition objects (of the form { createViewModel: ..., template: ... })
    // Custom loaders may override either of these facilities, i.e.,
    // 1. To supply configuration objects from some other source (e.g., conventions)
    // 2. Or, to resolve configuration objects by loading viewmodels/templates via arbitrary logic.

    var defaultConfigRegistry = Object.create(null),
        createViewModelKey = 'createViewModel',
        throwError = (componentName, message) => { throw new Error(`Component '${componentName}': ${message}`) },

        // Takes a config object of the form { template: ..., viewModel: ... }, and asynchronously convert it
        // into the standard component definition format:
        //    { template: <ArrayOfDomNodes>, createViewModel: function(params, componentInfo) { ... } }.
        // Since both template and viewModel may need to be resolved asynchronously, both tasks are performed
        // in parallel, and the results joined when both are ready. We don't depend on any promises infrastructure,
        // so this is implemented manually below.
        loadComponent = (componentName, callback) => {
            // Try the candidates
            var result = {},
                config = defaultConfigRegistry[componentName] || {},
                templateConfig = config['template'],
                viewModelConfig = config['viewModel'];

            if (templateConfig) {
                if (!templateConfig['element']) {
                    throwError(componentName, 'Unknown template value: ' + templateConfig);
                }
                // Element ID - find it, then copy its child nodes
                var element = templateConfig['element'];
                var elemInstance = document.getElementById(element);
                if (!elemInstance) {
                    throwError(componentName, 'Cannot find element with ID ' + element);
                }
                if (!elemInstance.matches('TEMPLATE')) {
                    throwError(componentName, 'Template Source Element not a <template>');
                }
                // For browsers with proper <template> element support (i.e., where the .content property
                // gives a document fragment), use that document fragment.
                result['template'] = ko.utils.cloneNodes(elemInstance.content.childNodes);
            }

            if (viewModelConfig) {
                if (typeof viewModelConfig[createViewModelKey] !== 'function') {
                    throwError(componentName, 'Unknown viewModel value: ' + viewModelConfig);
                }
                // Already a factory function - use it as-is
                result[createViewModelKey] = viewModelConfig[createViewModelKey];
            }

            // Did candidate return a value?
            var found = (result['template'] && result[createViewModelKey]);
            callback(found ? result : null);
        };

    ko.exportSymbol('components', ko.components);
    ko.exportSymbol('components.register', ko.components.register);
})();
(() => {
    var componentLoadingOperationUniqueId = 0;

    ko.bindingHandlers['component'] = {
        'init': (element, valueAccessor, ignored1, ignored2, bindingContext) => {
            var currentViewModel,
                currentLoadingOperationId,
                afterRenderSub,
                disposeAssociatedComponentViewModel = () => {
                    var currentViewModelDispose = currentViewModel && currentViewModel['dispose'];
                    if (typeof currentViewModelDispose === 'function') {
                        currentViewModelDispose.call(currentViewModel);
                    }
                    if (afterRenderSub) {
                        afterRenderSub.dispose();
                    }
                    afterRenderSub = null;
                    currentViewModel = null;
                    // Any in-flight loading operation is no longer relevant, so make sure we ignore its completion
                    currentLoadingOperationId = null;
                },
                originalChildNodes = [...ko.virtualElements.childNodes(element)];

            ko.virtualElements.emptyNode(element);
            ko.utils.domNodeDisposal.addDisposeCallback(element, disposeAssociatedComponentViewModel);

            ko.computed(() => {
                var componentName = ko.utils.unwrapObservable(valueAccessor()),
                    componentParams;

                if (typeof componentName !== 'string') {
                    componentParams = ko.utils.unwrapObservable(componentName['params']);
                    componentName = ko.utils.unwrapObservable(componentName['name']);
                }

                if (!componentName) {
                    throw new Error('No component name specified');
                }

                var asyncContext = ko.bindingEvent.startPossiblyAsyncContentBinding(element, bindingContext);

                var loadingOperationId = currentLoadingOperationId = ++componentLoadingOperationUniqueId;
                ko.components.get(componentName, componentDefinition => {
                    // If this is the current load operation for this element
                    if (currentLoadingOperationId === loadingOperationId) {
                        // Clean up previous state
                        disposeAssociatedComponentViewModel();

                        // Instantiate and bind new component. Implicitly this cleans any old DOM nodes.
                        if (!componentDefinition) {
                            throw new Error('Unknown component \'' + componentName + '\'');
                        }
                        // cloneTemplateIntoElement
                        var template = componentDefinition['template'];
                        if (!template) {
                            throw new Error('Component \'' + componentName + '\' has no template');
                        }
                        ko.virtualElements.setDomNodeChildren(element, ko.utils.cloneNodes(template));

                        currentViewModel = componentDefinition['createViewModel'](componentParams, {
                            'element': element,
                            'templateNodes': originalChildNodes
                        });
                        ko.applyBindingsToDescendants(asyncContext['createChildContext'](currentViewModel, {
                                'extend': ctx => {
                                    ctx['$component'] = currentViewModel;
                                    ctx['$componentTemplateNodes'] = originalChildNodes;
                                }
                            }), element);
                    }
                });
            }, { disposeWhenNodeIsRemoved: element });

            return { 'controlsDescendantBindings': true };
        }
    };

    ko.virtualElements.allowedBindings['component'] = true;

})();
ko.bindingHandlers['attr'] = {
    'update': (element, valueAccessor) => {
        var value = ko.utils.unwrapObservable(valueAccessor()) || {};
        ko.utils.objectForEach(value, function(attrName, attrValue) {
            attrValue = ko.utils.unwrapObservable(attrValue);

            // Find the namespace of this attribute, if any.
            var prefixLen = attrName.indexOf(':');
            var namespace = "lookupNamespaceURI" in element && prefixLen > 0 && element.lookupNamespaceURI(attrName.slice(0, prefixLen));

            // To cover cases like "attr: { checked:someProp }", we want to remove the attribute entirely
            // when someProp is a "no value"-like value (strictly null, false, or undefined)
            // (because the absence of the "checked" attr is how to mark an element as not checked, etc.)
            var toRemove = (attrValue === false) || (attrValue == null);
            if (toRemove) {
                namespace ? element.removeAttributeNS(namespace, attrName) : element.removeAttribute(attrName);
            } else {
                attrValue = attrValue.toString();
                namespace ? element.setAttributeNS(namespace, attrName, attrValue) : element.setAttribute(attrName, attrValue);
            }

            // Treat "name" specially - although you can think of it as an attribute, it also needs
            // special handling on older versions of IE (https://github.com/SteveSanderson/knockout/pull/333)
            // Deliberately being case-sensitive here because XHTML would regard "Name" as a different thing
            // entirely, and there's no strong reason to allow for such casing in HTML.
            if (attrName === "name") {
                element.name = toRemove ? "" : attrValue;
            }
        });
    }
};
(()=>{

ko.bindingHandlers['checked'] = {
    'after': ['value', 'attr'],
    'init': function (element, valueAccessor, allBindings) {
        var isCheckbox = element.type == "checkbox",
            isRadio = element.type == "radio";

        // Only bind to check boxes and radio buttons
        if (isCheckbox || isRadio) {
            const checkedValue = ko.pureComputed(()=>{
                // Treat "value" like "checkedValue" when it is included with "checked" binding
                if (allBindings['has']('checkedValue')) {
                    return ko.utils.unwrapObservable(allBindings.get('checkedValue'));
                } else if (useElementValue) {
                    return allBindings['has']('value')
                        ? ko.utils.unwrapObservable(allBindings.get('value'))
                        : element.value;
                }
            });

            var updateModel = () => {
                // When we're first setting up this computed, don't change any model state.
                if (ko.dependencyDetection.isInitial()) {
                    return;
                }

                // This updates the model value from the view value.
                // It runs in response to DOM events (click) and changes in checkedValue.
                var isChecked = element.checked,
                    elemValue = checkedValue();

                // We can ignore unchecked radio buttons, because some other radio
                // button will be checked, and that one can take care of updating state.
                // Also ignore value changes to an already unchecked checkbox.
                if (!isChecked && (isRadio || ko.dependencyDetection.getDependenciesCount())) {
                    return;
                }

                var modelValue = ko.dependencyDetection.ignore(valueAccessor);
                if (valueIsArray) {
                    var writableValue = rawValueIsNonArrayObservable ? modelValue.peek() : modelValue,
                        saveOldValue = oldElemValue;
                    oldElemValue = elemValue;

                    if (saveOldValue !== elemValue) {
                        // When we're responding to the checkedValue changing, and the element is
                        // currently checked, replace the old elem value with the new elem value
                        // in the model array.
                        if (isChecked) {
                            writableValue.push(elemValue);
                            writableValue.remove(saveOldValue);
                        }
                    } else {
                        // When we're responding to the user having checked/unchecked a checkbox,
                        // add/remove the element value to the model array.
                        isChecked ? writableValue.push(elemValue) : writableValue.remove(elemValue);
                    }

                    if (rawValueIsNonArrayObservable && ko.isWriteableObservable(modelValue)) {
                        modelValue(writableValue);
                    }
                } else {
                    if (isCheckbox) {
                        if (elemValue === undefined) {
                            elemValue = isChecked;
                        } else if (!isChecked) {
                            elemValue = undefined;
                        }
                    }
                    ko.expressionRewriting.writeValueToProperty(modelValue, allBindings, 'checked', elemValue, true);
                }
            }

            var rawValue = valueAccessor(),
                valueIsArray = isCheckbox && (ko.utils.unwrapObservable(rawValue) instanceof Array),
                rawValueIsNonArrayObservable = !(valueIsArray && rawValue.push && rawValue.splice),
                useElementValue = isRadio || valueIsArray,
                oldElemValue = valueIsArray ? checkedValue() : undefined;

            // IE 6 won't allow radio buttons to be selected unless they have a name
            if (isRadio && !element.name)
                ko.bindingHandlers['uniqueName']['init'](element, function() { return true });

            // Set up two computeds to update the binding:

            // The first responds to changes in the checkedValue value and to element clicks
            ko.computed(updateModel, null, { disposeWhenNodeIsRemoved: element });
            element.addEventListener("click", updateModel);

            // The second responds to changes in the model value (the one associated with the checked binding)
            ko.computed(() => {
                // This updates the view value from the model value.
                // It runs in response to changes in the bound (checked) value.
                var modelValue = ko.utils.unwrapObservable(valueAccessor()),
                    elemValue = checkedValue();

                if (valueIsArray) {
                    // When a checkbox is bound to an array, being checked represents its value being present in that array
                    element.checked = modelValue.includes(elemValue);
                    oldElemValue = elemValue;
                } else if (isCheckbox && elemValue === undefined) {
                    // When a checkbox is bound to any other value (not an array) and "checkedValue" is not defined,
                    // being checked represents the value being trueish
                    element.checked = !!modelValue;
                } else {
                    // Otherwise, being checked means that the checkbox or radio button's value corresponds to the model value
                    element.checked = (checkedValue() === modelValue);
                }
            }, null, { disposeWhenNodeIsRemoved: element });

            rawValue = undefined;
        }
    }
};
//ko.expressionRewriting.twoWayBindings['checked'] = true;

ko.bindingHandlers['checkedValue'] = {
    'update': function (element, valueAccessor) {
        element.value = ko.utils.unwrapObservable(valueAccessor());
    }
};

})();
var classesWrittenByBindingKey = '__ko__cssValue',
    toggleClasses = (node, classNames, force) =>
        classNames && classNames.split(/\s+/).forEach(className =>
            node.classList.toggle(className, force)
        );

ko.bindingHandlers['css'] = {
    'update': (element, valueAccessor) => {
        var value = ko.utils.unwrapObservable(valueAccessor());
        if (typeof value == "object") {
            ko.utils.objectForEach(value, (className, shouldHaveClass) => {
                shouldHaveClass = ko.utils.unwrapObservable(shouldHaveClass);
                toggleClasses(element, className, !!shouldHaveClass);
            });
        } else {
            value = ko.utils.stringTrim(value);
            toggleClasses(element, element[classesWrittenByBindingKey], false);
            element[classesWrittenByBindingKey] = value;
            toggleClasses(element, value, true);
        }
    }
};
ko.bindingHandlers['enable'] = {
    'update': (element, valueAccessor) => {
        var value = ko.utils.unwrapObservable(valueAccessor());
        if (value && element.disabled)
            element.removeAttribute("disabled");
        else if (!value && !element.disabled)
            element.disabled = true;
    }
};

ko.bindingHandlers['disable'] = {
    'update': (element, valueAccessor) =>
        ko.bindingHandlers['enable']['update'](element, () => !ko.utils.unwrapObservable(valueAccessor()))
};
// For certain common events (currently just 'click'), allow a simplified data-binding syntax
// e.g. click:handler instead of the usual full-length event:{click:handler}
function makeEventHandlerShortcut(eventName) {
    ko.bindingHandlers[eventName] = {
        'init': function(element, valueAccessor, allBindings, viewModel, bindingContext) {
            return ko.bindingHandlers['event']['init'].call(this, element,
                () => ({[eventName]: valueAccessor()}), // newValueAccessor
                allBindings, viewModel, bindingContext);
        }
    }
}

ko.bindingHandlers['event'] = {
    'init' : (element, valueAccessor, allBindings, viewModel, bindingContext) => {
        ko.utils.objectForEach(valueAccessor() || {}, eventName => {
            if (typeof eventName == "string") {
                element.addEventListener(eventName, (...args) => {
                    var handlerReturnValue,
                        handlerFunction = valueAccessor()[eventName];
                    if (handlerFunction) {
                        try {
                            viewModel = bindingContext['$data'];
                            // Take all the event args, and prefix with the viewmodel
                            handlerReturnValue = handlerFunction.apply(viewModel, [viewModel, ...args]);
                        } finally {
                            if (handlerReturnValue !== true) { // Normally we want to prevent default action. Developer can override this be explicitly returning true.
                                args[0].preventDefault();
                            }
                        }
                    }
                });
            }
        });
    }
};
// "foreach: someExpression" is equivalent to "template: { foreach: someExpression }"
// "foreach: { data: someExpression, afterAdd: myfn }" is equivalent to "template: { foreach: someExpression, afterAdd: myfn }"
ko.bindingHandlers['foreach'] = {
    makeTemplateValueAccessor: valueAccessor =>
        () => {
            var modelValue = valueAccessor(),
                // Unwrap without setting a dependency here
                unwrappedValue = ko.isObservable(modelValue) ? modelValue.peek() : modelValue;

            // If unwrappedValue is the array, pass in the wrapped value on its own
            // The value will be unwrapped and tracked within the template binding
            // (See https://github.com/SteveSanderson/knockout/issues/523)
            if ((!unwrappedValue) || typeof unwrappedValue.length == "number")
                return { 'foreach': modelValue };

            // If unwrappedValue.data is the array, preserve all relevant options and unwrap again value so we get updates
            ko.utils.unwrapObservable(modelValue);
            return {
                'foreach': unwrappedValue['data'],
                'as': unwrappedValue['as'],
                'beforeRemove': unwrappedValue['beforeRemove']
            };
    },
    'init': (element, valueAccessor) =>
        ko.bindingHandlers['template']['init'](element, ko.bindingHandlers['foreach'].makeTemplateValueAccessor(valueAccessor))
    ,
    'update': (element, valueAccessor, allBindings, viewModel, bindingContext) =>
        ko.bindingHandlers['template']['update'](element, ko.bindingHandlers['foreach'].makeTemplateValueAccessor(valueAccessor), allBindings, viewModel, bindingContext)
};
ko.expressionRewriting.bindingRewriteValidators['foreach'] = false; // Can't rewrite control flow bindings
ko.virtualElements.allowedBindings['foreach'] = true;
const hasfocusUpdatingProperty = '__ko_hasfocusUpdating',
    hasfocusLastValue = '__ko_hasfocusLastValue';
ko.bindingHandlers['hasfocus'] = {
    'init': (element, valueAccessor, allBindings) => {
        var handleElementFocusChange = isFocused => {
            // Where possible, ignore which event was raised and determine focus state using activeElement,
            // as this avoids phantom focus/blur events raised when changing tabs in modern browsers.
            // However, not all KO-targeted browsers (Firefox 2) support activeElement. For those browsers,
            // prevent a loss of focus when changing tabs/windows by setting a flag that prevents hasfocus
            // from calling 'blur()' on the element when it loses focus.
            // Discussion at https://github.com/SteveSanderson/knockout/pull/352
            element[hasfocusUpdatingProperty] = true;
            isFocused = (element.ownerDocument.activeElement === element);
            ko.expressionRewriting.writeValueToProperty(valueAccessor(), allBindings, 'hasfocus', isFocused, true);

            //cache the latest value, so we can avoid unnecessarily calling focus/blur in the update function
            element[hasfocusLastValue] = isFocused;
            element[hasfocusUpdatingProperty] = false;
        };
        var handleElementFocusIn = handleElementFocusChange.bind(null, true);
        var handleElementFocusOut = handleElementFocusChange.bind(null, false);

        element.addEventListener("focus", handleElementFocusIn);
        element.addEventListener("focusin", handleElementFocusIn);
        element.addEventListener("blur",  handleElementFocusOut);
        element.addEventListener("focusout",  handleElementFocusOut);

        // Assume element is not focused (prevents "blur" being called initially)
        element[hasfocusLastValue] = false;
    },
    'update': (element, valueAccessor) => {
        var value = !!ko.utils.unwrapObservable(valueAccessor());

        if (!element[hasfocusUpdatingProperty] && element[hasfocusLastValue] !== value) {
            value ? element.focus() : element.blur();
        }
    }
};
//ko.expressionRewriting.twoWayBindings.add('hasfocus');
ko.bindingHandlers['html'] = {
    'init': () => (
        // Prevent binding on the dynamically-injected HTML (as developers are unlikely to expect that, and it has security implications)
        { 'controlsDescendantBindings': true }
    ),
    'update': (element, valueAccessor) => {
        // setHtml will unwrap the value if needed
        ko.utils.emptyDomNode(element);

        // There's no legitimate reason to display a stringified observable without unwrapping it, so we'll unwrap it
        let html = ko.utils.unwrapObservable(valueAccessor());

        if (html != null) {
            const template = document.createElement('template');
            template.innerHTML = typeof html != 'string' ? html.toString() : html;
            element.appendChild(template.content);
        }
    }
};
(() => {

// Makes a binding like with or if
function makeWithIfBinding(bindingKey, isWith, isNot) {
    ko.bindingHandlers[bindingKey] = {
        'init': (element, valueAccessor, allBindings, viewModel, bindingContext) => {
            var savedNodes, contextOptions = {}, needAsyncContext;

            if (isWith) {
                contextOptions = { 'as': allBindings.get('as'), 'exportDependencies': true };
            }

            needAsyncContext = allBindings['has'](ko.bindingEvent.descendantsComplete);

            ko.computed(() => {
                var value = ko.utils.unwrapObservable(valueAccessor()),
                    shouldDisplay = !isNot !== !value, // equivalent to isNot ? !value : !!value,
                    isInitial = !savedNodes,
                    childContext;

                if (needAsyncContext) {
                    bindingContext = ko.bindingEvent.startPossiblyAsyncContentBinding(element, bindingContext);
                }

                if (shouldDisplay) {
                    contextOptions['dataDependency'] = ko.dependencyDetection.computed();

                    childContext = isWith
                        ? bindingContext['createChildContext'](typeof value == "function" ? value : valueAccessor, contextOptions)
                        : (ko.dependencyDetection.getDependenciesCount()
                            ? bindingContext['extend'](null, contextOptions)
                            : bindingContext
                        );
                }

                // Save a copy of the inner nodes on the initial update, but only if we have dependencies.
                if (isInitial && ko.dependencyDetection.getDependenciesCount()) {
                    savedNodes = ko.utils.cloneNodes(ko.virtualElements.childNodes(element), true /* shouldCleanNodes */);
                }

                if (shouldDisplay) {
                    isInitial || ko.virtualElements.setDomNodeChildren(element, ko.utils.cloneNodes(savedNodes));

                    ko.applyBindingsToDescendants(childContext, element);
                } else {
                    ko.virtualElements.emptyNode(element);

                    ko.bindingEvent.notify(element, ko.bindingEvent.childrenComplete);
                }

            }, { disposeWhenNodeIsRemoved: element });

            return { 'controlsDescendantBindings': true };
        }
    };
    ko.expressionRewriting.bindingRewriteValidators[bindingKey] = false; // Can't rewrite control flow bindings
    ko.virtualElements.allowedBindings[bindingKey] = true;
}

// Construct the actual binding handlers
makeWithIfBinding('if');
makeWithIfBinding('ifnot', false /* isWith */, true /* isNot */);
makeWithIfBinding('with', true /* isWith */);

})();
var captionPlaceholder = {};
ko.bindingHandlers['options'] = {
    'init': element => {
        if (!element.matches("SELECT"))
            throw new Error("options binding applies only to SELECT elements");

        // Remove all existing <option>s.
        let l = element.length;
        while (l--) {
            element.remove(l);
        }

        // Ensures that the binding processor doesn't try to bind the options
        return { 'controlsDescendantBindings': true };
    },
    'update': (element, valueAccessor, allBindings) => {

        var selectWasPreviouslyEmpty = element.length == 0,
            multiple = element.multiple,
            previousScrollTop = (!selectWasPreviouslyEmpty && multiple) ? element.scrollTop : null,
            unwrappedArray = ko.utils.unwrapObservable(valueAccessor()),
            valueAllowUnset = allBindings.get('valueAllowUnset') && allBindings['has']('value'),
            arrayToDomNodeChildrenOptions = {},
            captionValue,
            filteredArray,
            previousSelectedValues = [],

            selectedOptions = () => Array.from(element.options).filter(node => node.selected),

            applyToObject = (object, predicate, defaultValue) => {
                var predicateType = typeof predicate;
                if (predicateType == "function")    // Given a function; run it against the data value
                    return predicate(object);
                else if (predicateType == "string") // Given a string; treat it as a property name on the data value
                    return object[predicate];
                                                    // Given no optionsText arg; use the data value itself
                    return defaultValue;
            },

            setSelectionCallback = (arrayEntry, newOptions) => {
                if (itemUpdate && valueAllowUnset) {
                    // The model value is authoritative, so make sure its value is the one selected
                    ko.bindingEvent.notify(element, ko.bindingEvent.childrenComplete);
                } else if (previousSelectedValues.length) {
                    // IE6 doesn't like us to assign selection to OPTION nodes before they're added to the document.
                    // That's why we first added them without selection. Now it's time to set the selection.
                    var isSelected = previousSelectedValues.includes(ko.selectExtensions.readValue(newOptions[0]));
                    newOptions[0].selected = isSelected;

                    // If this option was changed from being selected during a single-item update, notify the change
                    if (itemUpdate && !isSelected) {
                        ko.dependencyDetection.ignore(ko.utils.triggerEvent, null, [element, "change"]);
                    }
                }
            };

        if (!valueAllowUnset) {
            if (multiple) {
                previousSelectedValues = selectedOptions().map(ko.selectExtensions.readValue);
            } else if (element.selectedIndex >= 0) {
                previousSelectedValues.push(ko.selectExtensions.readValue(element.options[element.selectedIndex]));
            }
        }

        if (unwrappedArray) {
            if (typeof unwrappedArray.length == "undefined") // Coerce single value into array
                unwrappedArray = [unwrappedArray];

            // Filter out any entries marked as destroyed
            filteredArray = unwrappedArray.filter(item => item || item == null);

            // If caption is included, add it to the array
            if (allBindings['has']('optionsCaption')) {
                captionValue = ko.utils.unwrapObservable(allBindings.get('optionsCaption'));
                // If caption value is null or undefined, don't show a caption
                if (captionValue != null) {
                    filteredArray.unshift(captionPlaceholder);
                }
            }
        } else {
            // If a falsy value is provided (e.g. null), we'll simply empty the select element
        }

        // The following functions can run at two different times:
        // The first is when the whole array is being updated directly from this binding handler.
        // The second is when an observable value for a specific array entry is updated.
        // oldOptions will be empty in the first case, but will be filled with the previously generated option in the second.
        var itemUpdate = false,
        optionForArrayItem = (arrayEntry, index, oldOptions) => {
            if (oldOptions.length) {
                previousSelectedValues = !valueAllowUnset && oldOptions[0].selected ? [ ko.selectExtensions.readValue(oldOptions[0]) ] : [];
                itemUpdate = true;
            }
            var option = element.ownerDocument.createElement("option");
            if (arrayEntry === captionPlaceholder) {
                ko.utils.setTextContent(option, allBindings.get('optionsCaption'));
                ko.selectExtensions.writeValue(option, undefined);
            } else {
                // Apply a value to the option element
                var optionValue = applyToObject(arrayEntry, allBindings.get('optionsValue'), arrayEntry);
                ko.selectExtensions.writeValue(option, ko.utils.unwrapObservable(optionValue));

                // Apply some text to the option element
                var optionText = applyToObject(arrayEntry, allBindings.get('optionsText'), optionValue);
                ko.utils.setTextContent(option, optionText);
            }
            return [option];
        };

        // By using a beforeRemove callback, we delay the removal until after new items are added. This fixes a selection
        // problem in IE<=8 and Firefox. See https://github.com/knockout/knockout/issues/1208
        arrayToDomNodeChildrenOptions['beforeRemove'] = option => element.removeChild(option);

        var callback = setSelectionCallback;
        if (allBindings['has']('optionsAfterRender') && typeof allBindings.get('optionsAfterRender') == "function") {
            callback = (arrayEntry, newOptions) => {
                setSelectionCallback(arrayEntry, newOptions);
                ko.dependencyDetection.ignore(allBindings.get('optionsAfterRender'), null, [newOptions[0], arrayEntry !== captionPlaceholder ? arrayEntry : undefined]);
            }
        }

        ko.utils.setDomNodeChildrenFromArrayMapping(element, filteredArray, optionForArrayItem, arrayToDomNodeChildrenOptions, callback);

        if (!valueAllowUnset) {
            // Determine if the selection has changed as a result of updating the options list
            var selectionChanged, prevLength = previousSelectedValues.length;
            if (multiple) {
                // For a multiple-select box, compare the new selection count to the previous one
                // But if nothing was selected before, the selection can't have changed
                selectionChanged = prevLength && selectedOptions().length < prevLength;
            } else {
                // For a single-select box, compare the current value to the previous value
                // But if nothing was selected before or nothing is selected now, just look for a change in selection
                selectionChanged = (prevLength && element.selectedIndex >= 0)
                    ? (ko.selectExtensions.readValue(element.options[element.selectedIndex]) !== previousSelectedValues[0])
                    : (prevLength || element.selectedIndex >= 0);
            }

            // Ensure consistency between model value and selected option.
            // If the dropdown was changed so that selection is no longer the same,
            // notify the value or selectedOptions binding.
            selectionChanged && ko.dependencyDetection.ignore(ko.utils.triggerEvent, null, [element, "change"]);
        }

        if (valueAllowUnset || ko.dependencyDetection.isInitial()) {
            ko.bindingEvent.notify(element, ko.bindingEvent.childrenComplete);
        }

        if (previousScrollTop && Math.abs(previousScrollTop - element.scrollTop) > 20)
            element.scrollTop = previousScrollTop;
    }
};
ko.bindingHandlers['options'].optionValueDomDataKey = ko.utils.domData.nextKey();
ko.bindingHandlers['style'] = {
    'update': (element, valueAccessor) => {
        ko.utils.objectForEach(ko.utils.unwrapObservable(valueAccessor() || {}), (styleName, styleValue) => {
            styleValue = ko.utils.unwrapObservable(styleValue);

            if (styleValue == null || styleValue === false) {
                // Empty string removes the value, whereas null/undefined have no effect
                styleValue = "";
            }

            if (/^--/.test(styleName)) {
                // Is styleName a custom CSS property?
                element.style.setProperty(styleName, styleValue);
            } else {
                styleName = styleName.replace(/-(\w)/g, (all, letter) => letter.toUpperCase());

                var previousStyle = element.style[styleName];
                element.style[styleName] = styleValue;

                if (styleValue !== previousStyle && element.style[styleName] == previousStyle && !isNaN(styleValue)) {
                    element.style[styleName] = styleValue + "px";
                }
            }
        });
    }
};
ko.bindingHandlers['submit'] = {
    'init': (element, valueAccessor, allBindings, viewModel, bindingContext) => {
        if (typeof valueAccessor() != "function")
            throw new Error("The value for a submit binding must be a function");
        element.addEventListener("submit", event => {
            var handlerReturnValue;
            var value = valueAccessor();
            try { handlerReturnValue = value.call(bindingContext['$data'], element); }
            finally {
                if (handlerReturnValue !== true) { // Normally we want to prevent default action. Developer can override this be explicitly returning true.
                    event.preventDefault();
                }
            }
        });
    }
};
ko.bindingHandlers['text'] = {
    'init': () => (
        // Prevent binding on the dynamically-injected text node (as developers are unlikely to expect that, and it has security implications).
        // It should also make things faster, as we no longer have to consider whether the text node might be bindable.
        { 'controlsDescendantBindings': true }
    ),
    'update': (element, valueAccessor) => {
        if (8 === element.nodeType) {
            element.text || element.after(element.text = document.createTextNode(''));
            element = element.text;
        }
        ko.utils.setTextContent(element, valueAccessor());
    }
};
ko.virtualElements.allowedBindings['text'] = true;
ko.bindingHandlers['textInput'] = {
    'init': (element, valueAccessor, allBindings) => {

        var previousElementValue = element.value,
            timeoutHandle,
            elementValueBeforeEvent;

        var updateModel = () => {
            clearTimeout(timeoutHandle);
            elementValueBeforeEvent = timeoutHandle = undefined;

            var elementValue = element.value;
            if (previousElementValue !== elementValue) {
                // Provide a way for tests to know exactly which event was processed
                previousElementValue = elementValue;
                ko.expressionRewriting.writeValueToProperty(valueAccessor(), allBindings, 'textInput', elementValue);
            }
        };

        var updateView = () => {
            var modelValue = ko.utils.unwrapObservable(valueAccessor());

            if (modelValue == null) {
                modelValue = '';
            }

            if (elementValueBeforeEvent !== undefined && modelValue === elementValueBeforeEvent) {
                setTimeout(updateView, 4);
                return;
            }

            // Update the element only if the element and model are different. On some browsers, updating the value
            // will move the cursor to the end of the input, which would be bad while the user is typing.
            if (element.value !== modelValue) {
                element.value = modelValue;
                previousElementValue = element.value; // In case the browser changes the value (see #2281)
            }
        };

        var onEvent = (event, handler) =>
            element.addEventListener(event, handler);

        onEvent('input', updateModel);

        // Bind to the change event so that we can catch programmatic updates of the value that fire this event.
        onEvent('change', updateModel);

        // To deal with browsers that don't notify any kind of event for some changes (IE, Safari, etc.)
        onEvent('blur', updateModel);

        ko.computed(updateView, { disposeWhenNodeIsRemoved: element });
    }
};
//ko.expressionRewriting.twoWayBindings.add('textInput');

// textinput is an alias for textInput
ko.bindingHandlers['textinput'] = {
    // preprocess is the only way to set up a full alias
    'preprocess': (value, name, addBinding) => addBinding('textInput', value)
};
ko.bindingHandlers['value'] = {
    'init': (element, valueAccessor, allBindings) => {
        var isSelectElement = element.matches("SELECT"),
            isInputElement = element.matches("INPUT");

        // If the value binding is placed on a radio/checkbox, then just pass through to checkedValue and quit
        if (isInputElement && (element.type == "checkbox" || element.type == "radio")) {
            ko.applyBindingAccessorsToNode(element, { 'checkedValue': valueAccessor });
            return;
        }

        var eventsToCatch = new Set,
            requestedEventsToCatch = allBindings.get("valueUpdate"),
            elementValueBeforeEvent = null,
            updateFromModel,
            registerEventHandler = (event, handler) =>
                element.addEventListener(event, handler),

            valueUpdateHandler = () => {
                elementValueBeforeEvent = null;
                var modelValue = valueAccessor();
                var elementValue = ko.selectExtensions.readValue(element);
                ko.expressionRewriting.writeValueToProperty(modelValue, allBindings, 'value', elementValue);
            };

        if (requestedEventsToCatch) {
            // Allow both individual event names, and arrays of event names
            if (typeof requestedEventsToCatch == "string") {
                eventsToCatch.add(requestedEventsToCatch);
            } else {
                requestedEventsToCatch.forEach(item => eventsToCatch.add(item));
            }
            eventsToCatch.delete("change");  // We'll subscribe to "change" events later
        }

        eventsToCatch.forEach(eventName => {
            // The syntax "after<eventname>" means "run the handler asynchronously after the event"
            // This is useful, for example, to catch "keydown" events after the browser has updated the control
            // (otherwise, ko.selectExtensions.readValue(this) will receive the control's value *before* the key event)
            var handler = valueUpdateHandler;
            if ((eventName||'').startsWith("after")) {
                handler = () => {
                    // The elementValueBeforeEvent variable is non-null *only* during the brief gap between
                    // a keyX event firing and the valueUpdateHandler running, which is scheduled to happen
                    // at the earliest asynchronous opportunity. We store this temporary information so that
                    // if, between keyX and valueUpdateHandler, the underlying model value changes separately,
                    // we can overwrite that model value change with the value the user just typed. Otherwise,
                    // techniques like rateLimit can trigger model changes at critical moments that will
                    // override the user's inputs, causing keystrokes to be lost.
                    elementValueBeforeEvent = ko.selectExtensions.readValue(element);
                    setTimeout(valueUpdateHandler, 0);
                };
                eventName = eventName.slice(5);
            }
            registerEventHandler(eventName, handler);
        });

        if (isInputElement && element.type == "file") {
            // For file input elements, can only write the empty string
            updateFromModel = () => {
                var newValue = ko.utils.unwrapObservable(valueAccessor());
                if (newValue == null || newValue === "") {
                    element.value = "";
                } else {
                    ko.dependencyDetection.ignore(valueUpdateHandler);  // reset the model to match the element
                }
            }
        } else {
            updateFromModel = () => {
                var newValue = ko.utils.unwrapObservable(valueAccessor());
                var elementValue = ko.selectExtensions.readValue(element);

                if (elementValueBeforeEvent !== null && newValue === elementValueBeforeEvent) {
                    setTimeout(updateFromModel, 0);
                    return;
                }

                var valueHasChanged = newValue !== elementValue;

                if (valueHasChanged || elementValue === undefined) {
                    if (isSelectElement) {
                        var allowUnset = allBindings.get('valueAllowUnset');
                        ko.selectExtensions.writeValue(element, newValue, allowUnset);
                        if (!allowUnset && newValue !== ko.selectExtensions.readValue(element)) {
                            // If you try to set a model value that can't be represented in an already-populated dropdown, reject that change,
                            // because you're not allowed to have a model value that disagrees with a visible UI selection.
                            ko.dependencyDetection.ignore(valueUpdateHandler);
                        }
                    } else {
                        ko.selectExtensions.writeValue(element, newValue);
                    }
                }
            };
        }

        if (isSelectElement) {
            var updateFromModelComputed;
            ko.bindingEvent.subscribe(element, ko.bindingEvent.childrenComplete, () => {
                if (!updateFromModelComputed) {
                    registerEventHandler("change", valueUpdateHandler);
                    updateFromModelComputed = ko.computed(updateFromModel, { disposeWhenNodeIsRemoved: element });
                } else if (allBindings.get('valueAllowUnset')) {
                    updateFromModel();
                } else {
                    valueUpdateHandler();
                }
            }, null, { 'notifyImmediately': true });
        } else {
            registerEventHandler("change", valueUpdateHandler);
            ko.computed(updateFromModel, { disposeWhenNodeIsRemoved: element });
        }
    },
    'update': () => {} // Keep for backwards compatibility with code that may have wrapped value binding
};
//ko.expressionRewriting.twoWayBindings.add('value');
ko.bindingHandlers['visible'] = {
    'update': (element, valueAccessor) => {
        var value = ko.utils.unwrapObservable(valueAccessor());
        var isCurrentlyVisible = !(element.style.display == "none");
        if (value && !isCurrentlyVisible)
            element.style.display = "";
        else if (isCurrentlyVisible && !value)
            element.style.display = "none";
    }
};

ko.bindingHandlers['hidden'] = {
    'update': (element, valueAccessor) =>
        element.hidden = !!ko.utils.unwrapObservable(valueAccessor())
};
// 'click' is just a shorthand for the usual full-length event:{click:handler}
makeEventHandlerShortcut('click');
(() => {
    // A template source represents a read/write way of accessing a template. This is to eliminate the need for template loading/saving
    // logic to be duplicated in every template engine (and means they can all work with anonymous templates, etc.)
    //
    // Two are provided by default:
    //  1. ko.templateSources.domElement       - reads/writes the text content of an arbitrary DOM element
    //  2. ko.templateSources.anonymousElement - uses ko.utils.domData to read/write text *associated* with the DOM element, but
    //                                           without reading/writing the actual element text content, since it will be overwritten
    //                                           with the rendered template output.
    //
    // Once you've implemented a templateSource, make your template engine use it by subclassing whatever template engine you were
    // using and overriding "makeTemplateSource" to return an instance of your custom template source.

    let templatesDomDataKey = ko.utils.domData.nextKey();

    // ---- ko.templateSources.anonymousTemplate -----
    // Anonymous templates are normally saved/retrieved as DOM nodes through "nodes".
    // For compatibility, you can also read "text"; it will be serialized from the nodes on demand.
    // Writing to "text" is still supported, but then the template data will not be available as DOM nodes.
    class anonymousTemplate
    {
        constructor(element)
        {
            this.domElement = element;
        }

        nodes(...args)
        {
            let element = this.domElement;
            if (!args.length) {
                return ko.utils.domData.get(element, templatesDomDataKey) || (
                        this.templateType === 11 ? element.content :
                        this.templateType === 1 ? element :
                        undefined);
            }
            ko.utils.domData.set(element, templatesDomDataKey, args[0]);
        }
    }

    // ---- ko.templateSources.domElement -----
    class domElement extends anonymousTemplate
    {
        constructor(element)
        {
            super(element);

            if (element) {
                this.templateType =
                    element.matches("TEMPLATE") && element.content ? element.content.nodeType : 1;
            }
        }
    }

    ko.templateSources = {
        domElement: domElement,
        anonymousTemplate: anonymousTemplate
    };
})();
(() => {
    var renderTemplateSource = templateSource => {
            var templateNodes = templateSource.nodes ? templateSource.nodes() : null;
            return templateNodes
                ? [...templateNodes.cloneNode(true).childNodes]
                : null;
        },

        makeTemplateSource = (template, templateDocument) => {
            // Named template
            if (typeof template == "string") {
                templateDocument = templateDocument || document;
                var elem = templateDocument.getElementById(template);
                if (!elem)
                    throw new Error("Cannot find template with ID " + template);
                return new ko.templateSources.domElement(elem);
            }
            if ([1,8].includes(template.nodeType)) {
                // Anonymous template
                return new ko.templateSources.anonymousTemplate(template);
            }
            throw new Error("Unknown template type: " + template);
        },

        invokeForEachNodeInContinuousRange = (firstNode, lastNode, action) => {
            var node, nextInQueue = firstNode, firstOutOfRangeNode = ko.virtualElements.nextSibling(lastNode);
            while (nextInQueue && ((node = nextInQueue) !== firstOutOfRangeNode)) {
                nextInQueue = ko.virtualElements.nextSibling(node);
                action(node, nextInQueue);
            }
        },

        activateBindingsOnContinuousNodeArray = (continuousNodeArray, bindingContext) => {
            // To be used on any nodes that have been rendered by a template and have been inserted into some parent element
            // Walks through continuousNodeArray (which *must* be continuous, i.e., an uninterrupted sequence of sibling nodes, because
            // the algorithm for walking them relies on this), and for each top-level item in the virtual-element sense,
            // (1) Does a regular "applyBindings" to associate bindingContext with this node and to activate any non-memoized bindings
            // (2) Unmemoizes any memos in the DOM subtree (e.g., to activate bindings that had been memoized during template rewriting)

            if (continuousNodeArray.length) {
                var firstNode = continuousNodeArray[0],
                    lastNode = continuousNodeArray[continuousNodeArray.length - 1],
                    parentNode = firstNode.parentNode;

                // Need to applyBindings *before* unmemoziation, because unmemoization might introduce extra nodes (that we don't want to re-bind)
                // whereas a regular applyBindings won't introduce new memoized nodes
                invokeForEachNodeInContinuousRange(firstNode, lastNode, node => {
                    if (node.nodeType === 1 || node.nodeType === 8)
                        ko.applyBindings(bindingContext, node);
                });

                // Make sure any changes done by applyBindings or unmemoize are reflected in the array
                ko.utils.fixUpContinuousNodeArray(continuousNodeArray, parentNode);
            }
        },

        getFirstNodeFromPossibleArray = (nodeOrNodeArray) => {
            return nodeOrNodeArray.nodeType ? nodeOrNodeArray
                                            : nodeOrNodeArray.length > 0 ? nodeOrNodeArray[0]
                                            : null;
        },

        executeTemplate = (targetNodeOrNodeArray, renderMode, template, bindingContext) => {
            var firstTargetNode = targetNodeOrNodeArray && getFirstNodeFromPossibleArray(targetNodeOrNodeArray);
            var templateDocument = (firstTargetNode || template || {}).ownerDocument;

            var renderedNodesArray = renderTemplateSource(makeTemplateSource(template, templateDocument));

            // Loosely check result is an array of DOM nodes
            if ((typeof renderedNodesArray.length != "number") || (renderedNodesArray.length > 0 && typeof renderedNodesArray[0].nodeType != "number"))
                throw new Error("Template engine must return an array of DOM nodes");

            var haveAddedNodesToParent = false;
            switch (renderMode) {
                case "replaceChildren":
                    ko.virtualElements.setDomNodeChildren(targetNodeOrNodeArray, renderedNodesArray);
                    haveAddedNodesToParent = true;
                    break;
                case "ignoreTargetNode": break;
                default:
                    throw new Error("Unknown renderMode: " + renderMode);
            }

            if (haveAddedNodesToParent) {
                activateBindingsOnContinuousNodeArray(renderedNodesArray, bindingContext);
                if (renderMode == "replaceChildren") {
                    ko.bindingEvent.notify(targetNodeOrNodeArray, ko.bindingEvent.childrenComplete);
                }
            }

            return renderedNodesArray;
        },

        resolveTemplateName = (template, data, context) => {
            // The template can be specified as:
            if (ko.isObservable(template)) {
                // 1. An observable, with string value
                return template();
            }
            // 2. A function of (data, context) returning a string ELSE 3. A string
            return (typeof template === 'function') ? template(data, context) : template;
        };

    ko.renderTemplate = function (template, dataOrBindingContext, options, targetNodeOrNodeArray, renderMode) {
        options = options || {};
        renderMode = renderMode || "replaceChildren";

        if (targetNodeOrNodeArray) {
            var firstTargetNode = getFirstNodeFromPossibleArray(targetNodeOrNodeArray);

            var whenToDispose = () => (!firstTargetNode) || !ko.utils.domNodeIsAttachedToDocument(firstTargetNode); // Passive disposal (on next evaluation)

            return ko.computed( // So the DOM is automatically updated when any dependency changes
                () => {
                    // Ensure we've got a proper binding context to work with
                    var bindingContext = (dataOrBindingContext instanceof ko.bindingContext)
                        ? dataOrBindingContext
                        : new ko.bindingContext(dataOrBindingContext, null, null, null, { "exportDependencies": true });

                    var templateName = resolveTemplateName(template, bindingContext['$data'], bindingContext);
                    executeTemplate(targetNodeOrNodeArray, renderMode, templateName, bindingContext, options);
                },
                { disposeWhen: whenToDispose, disposeWhenNodeIsRemoved: firstTargetNode }
            );
        } else {
            console.log('no targetNodeOrNodeArray');
        }
    };

    ko.renderTemplateForEach = (template, arrayOrObservableArray, options, targetNode, parentBindingContext) => {
        // Since setDomNodeChildrenFromArrayMapping always calls executeTemplateForArrayItem and then
        // activateBindingsCallback for added items, we can store the binding context in the former to use in the latter.
        var arrayItemContext, asName = options['as'];

        // This will be called by setDomNodeChildrenFromArrayMapping to get the nodes to add to targetNode
        var executeTemplateForArrayItem = (arrayValue, index) => {
            // Support selecting template as a function of the data being rendered
            arrayItemContext = parentBindingContext['createChildContext'](arrayValue, {
                'as': asName,
                'extend': context => {
                    context['$index'] = index;
                    if (asName) {
                        context[asName + "Index"] = index;
                    }
                }
            });

            var templateName = resolveTemplateName(template, arrayValue, arrayItemContext);
            return executeTemplate(targetNode, "ignoreTargetNode", templateName, arrayItemContext, options);
        };

        // This will be called whenever setDomNodeChildrenFromArrayMapping has added nodes to targetNode
        var activateBindingsCallback = (arrayValue, addedNodesArray) => {
            activateBindingsOnContinuousNodeArray(addedNodesArray, arrayItemContext);

            // release the "cache" variable, so that it can be collected by
            // the GC when its value isn't used from within the bindings anymore.
            arrayItemContext = null;
        };

        var setDomNodeChildrenFromArrayMapping = function (newArray, changeList) {
            // Call setDomNodeChildrenFromArrayMapping, ignoring any observables unwrapped within (most likely from a callback function).
            // If the array items are observables, though, they will be unwrapped in executeTemplateForArrayItem and managed within setDomNodeChildrenFromArrayMapping.
            ko.dependencyDetection.ignore(ko.utils.setDomNodeChildrenFromArrayMapping, null, [targetNode, newArray, executeTemplateForArrayItem, options, activateBindingsCallback, changeList]);
            ko.bindingEvent.notify(targetNode, ko.bindingEvent.childrenComplete);
        };

        if (!options['beforeRemove'] && ko.isObservableArray(arrayOrObservableArray)) {
            setDomNodeChildrenFromArrayMapping(arrayOrObservableArray.peek());

            var subscription = arrayOrObservableArray.subscribe(changeList => {
                setDomNodeChildrenFromArrayMapping(arrayOrObservableArray(), changeList);
            }, null, "arrayChange");
            subscription.disposeWhenNodeIsRemoved(targetNode);

            return subscription;
        }
        return ko.computed(() => {
            var unwrappedArray = ko.utils.unwrapObservable(arrayOrObservableArray) || [];
            if (typeof unwrappedArray.length == "undefined") // Coerce single value into array
                unwrappedArray = [unwrappedArray];

            setDomNodeChildrenFromArrayMapping(unwrappedArray);

        }, { disposeWhenNodeIsRemoved: targetNode });
    };

    var templateComputedDomDataKey = ko.utils.domData.nextKey();
    function disposeOldComputedAndStoreNewOne(element, newComputed) {
        var oldComputed = ko.utils.domData.get(element, templateComputedDomDataKey);
        oldComputed?.dispose?.();
        ko.utils.domData.set(element, templateComputedDomDataKey, (newComputed && (!newComputed.isActive || newComputed.isActive())) ? newComputed : undefined);
    }

    var cleanContainerDomDataKey = ko.utils.domData.nextKey();
    ko.bindingHandlers['template'] = {
        'init': (element, valueAccessor) => {
            // Support anonymous templates
            var bindingValue = ko.utils.unwrapObservable(valueAccessor());
            if (typeof bindingValue == "string" || 'name' in bindingValue) {
                // It's a named template - clear the element
                ko.virtualElements.emptyNode(element);
            } else if ('nodes' in bindingValue) {
                // We've been given an array of DOM nodes. Save them as the template source.
                // There is no known use case for the node array being an observable array (if the output
                // varies, put that behavior *into* your template - that's what templates are for), and
                // the implementation would be a mess, so assert that it's not observable.
                var nodes = bindingValue['nodes'] || [];
                if (ko.isObservable(nodes)) {
                    throw new Error('The "nodes" option must be a plain, non-observable array.');
                }

                // If the nodes are already attached to a KO-generated container, we reuse that container without moving the
                // elements to a new one (we check only the first node, as the nodes are always moved together)
                let container = nodes[0]?.parentNode;
                if (!container || !ko.utils.domData.get(container, cleanContainerDomDataKey)) {
                    container = ko.utils.moveCleanedNodesToContainerElement(nodes);
                    ko.utils.domData.set(container, cleanContainerDomDataKey, true);
                }

                new ko.templateSources.anonymousTemplate(element).nodes(container);
            } else {
                // It's an anonymous template - store the element contents, then clear the element
                var templateNodes = ko.virtualElements.childNodes(element);
                if (templateNodes.length) {
                    let container = ko.utils.moveCleanedNodesToContainerElement(templateNodes); // This also removes the nodes from their current parent
                    new ko.templateSources.anonymousTemplate(element).nodes(container);
                } else {
                    throw new Error("Anonymous template defined, but no template content was provided");
                }
            }
            return { 'controlsDescendantBindings': true };
        },
        'update': (element, valueAccessor, allBindings, viewModel, bindingContext) => {
            var value = valueAccessor(),
                options = ko.utils.unwrapObservable(value),
                shouldDisplay = true,
                templateComputed = null,
                template;

            if (typeof options == "string") {
                template = value;
                options = {};
            } else {
                template = 'name' in options ? options['name'] : element;

                // Support "if"/"ifnot" conditions
                if ('if' in options)
                    shouldDisplay = ko.utils.unwrapObservable(options['if']);
                if (shouldDisplay && 'ifnot' in options)
                    shouldDisplay = !ko.utils.unwrapObservable(options['ifnot']);

                // Don't show anything if an empty name is given (see #2446)
                if (shouldDisplay && !template) {
                    shouldDisplay = false;
                }
            }

            if ('foreach' in options) {
                // Render once for each data point (treating data set as empty if shouldDisplay==false)
                var dataArray = (shouldDisplay && options['foreach']) || [];
                templateComputed = ko.renderTemplateForEach(template, dataArray, options, element, bindingContext);
            } else if (!shouldDisplay) {
                ko.virtualElements.emptyNode(element);
            } else {
                // Render once for this single data point (or use the viewModel if no data was provided)
                var innerBindingContext = bindingContext;
                if ('data' in options) {
                    innerBindingContext = bindingContext['createChildContext'](options['data'], {
                        'as': options['as'],
                        'exportDependencies': true
                    });
                }
                templateComputed = ko.renderTemplate(template, innerBindingContext, options, element);
            }

            // It only makes sense to have a single template computed per element (otherwise which one should have its output displayed?)
            disposeOldComputedAndStoreNewOne(element, templateComputed);
        }
    };

    // Anonymous templates can't be rewritten. Give a nice error message if you try to do it.
    ko.expressionRewriting.bindingRewriteValidators['template'] = bindingValue => {
        var parsedBindingValue = ko.expressionRewriting.parseObjectLiteral(bindingValue);

        if ((parsedBindingValue.length == 1) && parsedBindingValue[0]['unknown'])
            return null; // It looks like a string literal, not an object literal, so treat it as a named template (which is allowed for rewriting)

        if (ko.expressionRewriting.keyValueArrayContainsKey(parsedBindingValue, "name"))
            return null; // Named templates can be rewritten, so return "no error"
        return "This template engine does not support anonymous templates nested within its templates";
    };

    ko.virtualElements.allowedBindings['template'] = true;
})();
// Go through the items that have been added and deleted and try to find matches between them.
ko.utils.findMovesInArrayComparison = (left, right, limitFailedCompares) => {
    var failedCompares = 0, r, l = right.length;
    l && left.every(leftItem => {
        r = right.findIndex(rightItem => leftItem['value'] === rightItem['value']);
        if (r >= 0) {
            leftItem['moved'] = right[r]['index'];
            right[r]['moved'] = leftItem['index'];
            right.splice(r, 1);         // This item is marked as moved; so remove it from right list
//            right[r] = null;
            failedCompares = r = 0;     // Reset failed compares count because we're checking for consecutive failures
            --l;
        }
        failedCompares += l;
        return l && (!limitFailedCompares || failedCompares < limitFailedCompares);
    });
};

ko.utils.compareArrays = (() => {
    var statusNotInOld = 'added', statusNotInNew = 'deleted',

    compareSmallArrayToBigArray = (smlArray, bigArray, statusNotInSml, statusNotInBig, options) => {
        var myMin = Math.min,
            myMax = Math.max,
            editDistanceMatrix = [],
            smlIndex = -1, smlIndexMax = smlArray.length,
            bigIndex, bigIndexMax = bigArray.length,
            compareRange = (bigIndexMax - smlIndexMax) || 1,
            maxDistance = smlIndexMax + bigIndexMax + 1,
            thisRow, prevRow,
            bigIndexMaxForRow, bigIndexMinForRow;

        while (++smlIndex <= smlIndexMax) {
            prevRow = thisRow;
            editDistanceMatrix.push(thisRow = []);
            bigIndexMaxForRow = myMin(bigIndexMax, smlIndex + compareRange);
            bigIndexMinForRow = myMax(0, smlIndex - 1);
            for (bigIndex = bigIndexMinForRow; bigIndex <= bigIndexMaxForRow; bigIndex++) {
                if (!bigIndex)
                    thisRow[bigIndex] = smlIndex + 1;
                else if (!smlIndex)  // Top row - transform empty array into new array via additions
                    thisRow[bigIndex] = bigIndex + 1;
                else if (smlArray[smlIndex - 1] === bigArray[bigIndex - 1])
                    thisRow[bigIndex] = prevRow[bigIndex - 1];                  // copy value (no edit)
                else {
                    var northDistance = prevRow[bigIndex] || maxDistance;       // not in big (deletion)
                    var westDistance = thisRow[bigIndex - 1] || maxDistance;    // not in small (addition)
                    thisRow[bigIndex] = myMin(northDistance, westDistance) + 1;
                }
            }
        }

        var editScript = [], meMinusOne, notInSml = [], notInBig = [];
        smlIndex = smlIndexMax;
        bigIndex = bigIndexMax
        while (smlIndex || bigIndex) {
            meMinusOne = editDistanceMatrix[smlIndex][bigIndex] - 1;
            if (bigIndex && meMinusOne === editDistanceMatrix[smlIndex][bigIndex-1]) {
                notInSml.push(editScript[editScript.length] = {     // added
                    'status': statusNotInSml,
                    'value': bigArray[--bigIndex],
                    'index': bigIndex });
            } else if (smlIndex && meMinusOne === editDistanceMatrix[smlIndex - 1][bigIndex]) {
                notInBig.push(editScript[editScript.length] = {     // deleted
                    'status': statusNotInBig,
                    'value': smlArray[--smlIndex],
                    'index': smlIndex });
            } else {
                --bigIndex;
                --smlIndex;
                if (!options['sparse']) {
                    editScript.push({
                        'status': "retained",
                        'value': bigArray[bigIndex] });
                }
            }
        }

        // Set a limit on the number of consecutive non-matching comparisons; having it a multiple of
        // smlIndexMax keeps the time complexity of this algorithm linear.
        ko.utils.findMovesInArrayComparison(notInBig, notInSml, !options['dontLimitMoves'] && smlIndexMax * 10);

        return editScript.reverse();
    };

    // Simple calculation based on Levenshtein distance.
    return (oldArray, newArray, options) => {
        // For backward compatibility, if the third arg is actually a bool, interpret
        // it as the old parameter 'dontLimitMoves'. Newer code should use { dontLimitMoves: true }.
        options = (typeof options === 'boolean') ? { 'dontLimitMoves': options } : (options || {});
        oldArray = oldArray || [];
        newArray = newArray || [];

        return (oldArray.length < newArray.length)
            ? compareSmallArrayToBigArray(oldArray, newArray, statusNotInOld, statusNotInNew, options)
            : compareSmallArrayToBigArray(newArray, oldArray, statusNotInNew, statusNotInOld, options);
    };
})();
(() => {
    // Objective:
    // * Given an input array, a container DOM node, and a function from array elements to arrays of DOM nodes,
    //   map the array elements to arrays of DOM nodes, concatenate together all these arrays, and use them to populate the container DOM node
    // * Next time we're given the same combination of things (with the array possibly having mutated), update the container DOM node
    //   so that its children is again the concatenation of the mappings of the array elements, but don't re-map any array elements that we
    //   previously mapped - retain those nodes, and just insert/delete other ones

    // "callbackAfterAddingNodes" will be invoked after any "mapping"-generated nodes are inserted into the container node
    // You can use this, for example, to activate bindings on those nodes.

    function mapNodeAndRefreshWhenChanged(containerNode, mapping, valueToMap, callbackAfterAddingNodes, index) {
        // Map this array value inside a dependentObservable so we re-map when any dependency changes
        var mappedNodes = [];
        var dependentObservable = ko.computed(() => {
            var newMappedNodes = mapping(valueToMap, index, ko.utils.fixUpContinuousNodeArray(mappedNodes, containerNode)) || [];

            // On subsequent evaluations, just replace the previously-inserted DOM nodes
            if (mappedNodes.length > 0) {
                var nodesToReplaceArray = mappedNodes.nodeType ? [mappedNodes] : mappedNodes;
                if (nodesToReplaceArray.length > 0) {
                    var insertionPoint = nodesToReplaceArray[0],
                        parent = insertionPoint.parentNode;
                    newMappedNodes.forEach(node => parent.insertBefore(node, insertionPoint));
                    nodesToReplaceArray.forEach(node => ko.removeNode(node));
                }
                if (callbackAfterAddingNodes)
                    ko.dependencyDetection.ignore(callbackAfterAddingNodes, null, [valueToMap, newMappedNodes, index]);
            }

            // Replace the contents of the mappedNodes array, thereby updating the record
            // of which nodes would be deleted if valueToMap was itself later removed
            mappedNodes.length = 0;
            mappedNodes.push(...newMappedNodes);
        }, { disposeWhenNodeIsRemoved: containerNode, disposeWhen: ()=>!!mappedNodes.find(ko.utils.domNodeIsAttachedToDocument) });
        return { mappedNodes : mappedNodes, dependentObservable : (dependentObservable.isActive() ? dependentObservable : undefined) };
    }

    var lastMappingResultDomDataKey = ko.utils.domData.nextKey(),
        deletedItemDummyValue = ko.utils.domData.nextKey();

    ko.utils.setDomNodeChildrenFromArrayMapping = (domNode, array, mapping, options, callbackAfterAddingNodes, editScript) => {
        array = array || [];
        if (typeof array.length == "undefined") // Coerce single value into array
            array = [array];

        options = options || {};
        var lastMappingResult = ko.utils.domData.get(domNode, lastMappingResultDomDataKey),
            isFirstExecution = !lastMappingResult,

            // Build the new mapping result
            newMappingResult = [],
            lastMappingResultIndex = 0,
            currentArrayIndex = 0,

            nodesToDelete = [],
            itemsToMoveFirstIndexes = [],
            itemsForBeforeRemoveCallbacks = [],
            mapData,
            countWaitingForRemove = 0,

            itemAdded = value => {
                mapData = { arrayEntry: value, indexObservable: ko.observable(currentArrayIndex++) };
                newMappingResult.push(mapData);
            },

            itemMovedOrRetained = oldPosition => {
                mapData = lastMappingResult[oldPosition];
                // Since updating the index might change the nodes, do so before calling fixUpContinuousNodeArray
                mapData.indexObservable(currentArrayIndex++);
                ko.utils.fixUpContinuousNodeArray(mapData.mappedNodes, domNode);
                newMappingResult.push(mapData);
            },

            callCallback = (callback, items) => {
                if (callback) {
                    items.forEach(item => item?.mappedNodes.forEach(node => callback(node, i, item.arrayEntry)));
                }
            };

        if (isFirstExecution) {
            array.forEach(itemAdded);
        } else {
            if (!editScript || (lastMappingResult && lastMappingResult['_countWaitingForRemove'])) {
                // Compare the provided array against the previous one
                editScript = ko.utils.compareArrays(
                    Array.prototype.map.call(lastMappingResult, x => x.arrayEntry),
                    array,
                    {
                        'dontLimitMoves': options['dontLimitMoves'],
                        'sparse': true
                    });
            }

            let movedIndex, itemIndex;
            editScript.forEach(editScriptItem => {
                movedIndex = editScriptItem['moved'];
                itemIndex = editScriptItem['index'];
                switch (editScriptItem['status']) {
                    case "deleted":
                        while (lastMappingResultIndex < itemIndex) {
                            itemMovedOrRetained(lastMappingResultIndex++);
                        }
                        if (movedIndex === undefined) {
                            mapData = lastMappingResult[lastMappingResultIndex];

                            // Stop tracking changes to the mapping for these nodes
                            if (mapData.dependentObservable) {
                                mapData.dependentObservable.dispose();
                                mapData.dependentObservable = undefined;
                            }

                            // Queue these nodes for later removal
                            if (ko.utils.fixUpContinuousNodeArray(mapData.mappedNodes, domNode).length) {
                                if (options['beforeRemove']) {
                                    newMappingResult.push(mapData);
                                    countWaitingForRemove++;
                                    if (mapData.arrayEntry === deletedItemDummyValue) {
                                        mapData = null;
                                    } else {
                                        itemsForBeforeRemoveCallbacks[mapData.indexObservable.peek()] = mapData;
                                    }
                                }
                                if (mapData) {
                                    nodesToDelete.push.apply(nodesToDelete, mapData.mappedNodes);
                                }
                            }
                        }
                        lastMappingResultIndex++;
                        break;

                    case "added":
                        while (currentArrayIndex < itemIndex) {
                            itemMovedOrRetained(lastMappingResultIndex++);
                        }
                        if (movedIndex !== undefined) {
                            itemsToMoveFirstIndexes.push(newMappingResult.length);
                            itemMovedOrRetained(movedIndex);
                        } else {
                            itemAdded(editScriptItem['value']);
                        }
                        break;
                }
            });

            while (currentArrayIndex < array.length) {
                itemMovedOrRetained(lastMappingResultIndex++);
            }

            // Record that the current view may still contain deleted items
            // because it means we won't be able to use a provided editScript.
            newMappingResult['_countWaitingForRemove'] = countWaitingForRemove;
        }

        // Store a copy of the array items we just considered so we can difference it next time
        ko.utils.domData.set(domNode, lastMappingResultDomDataKey, newMappingResult);

        // Next remove nodes for deleted items (or just clean if there's a beforeRemove callback)
        nodesToDelete.forEach(options['beforeRemove'] ? ko.cleanNode : ko.removeNode);

        var i, lastNode, mappedNodes, activeElement,
            insertNode = nodeToInsert => {
                ko.virtualElements.insertAfter(domNode, nodeToInsert, lastNode);
                lastNode = nodeToInsert;
            };

        // Since most browsers remove the focus from an element when it's moved to another location,
        // save the focused element and try to restore it later.
        activeElement = domNode.ownerDocument.activeElement;

        // Try to reduce overall moved nodes by first moving the ones that were marked as moved by the edit script
        if (itemsToMoveFirstIndexes.length) {
            while ((i = itemsToMoveFirstIndexes.shift()) != undefined) {
                mapData = newMappingResult[i];
                for (lastNode = undefined; i; ) {
                    mappedNodes = newMappingResult[--i].mappedNodes;
                    if (mappedNodes?.length) {
                        lastNode = mappedNodes[mappedNodes.length - 1];
                        break;
                    }
                }
                mapData.mappedNodes.forEach(insertNode);
            }
        }

        // Next add/reorder the remaining items (will include deleted items if there's a beforeRemove callback)
        newMappingResult.forEach(mapData => {
            // Get nodes for newly added items
            mapData.mappedNodes
            || ko.utils.extend(mapData, mapNodeAndRefreshWhenChanged(domNode, mapping, mapData.arrayEntry, callbackAfterAddingNodes, mapData.indexObservable));

            // Put nodes in the right place if they aren't there already
            mapData.mappedNodes.forEach(insertNode);

            // Run the callbacks for newly added nodes (for example, to apply bindings, etc.)
            if (!mapData.initialized && callbackAfterAddingNodes) {
                callbackAfterAddingNodes(mapData.arrayEntry, mapData.mappedNodes, mapData.indexObservable);
                mapData.initialized = true;
                lastNode = mapData.mappedNodes[mapData.mappedNodes.length - 1];     // get the last node again since it may have been changed by a preprocessor
            }
        });

        // Restore the focused element if it had lost focus
        if (domNode.ownerDocument.activeElement != activeElement) {
            activeElement?.focus();
        }

        // If there's a beforeRemove callback, call it after reordering.
        // Note that we assume that the beforeRemove callback will usually be used to remove the nodes using
        // some sort of animation, which is why we first reorder the nodes that will be removed. If the
        // callback instead removes the nodes right away, it would be more efficient to skip reordering them.
        // Perhaps we'll make that change in the future if this scenario becomes more common.
        callCallback(options['beforeRemove'], itemsForBeforeRemoveCallbacks);

        // Replace the stored values of deleted items with a dummy value. This provides two benefits: it marks this item
        // as already "removed" so we won't call beforeRemove for it again, and it ensures that the item won't match up
        // with an actual item in the array and appear as "retained" or "moved".
        itemsForBeforeRemoveCallbacks.forEach(callback => callback && (callback.arrayEntry = deletedItemDummyValue));
    }
})();
	window['ko'] = koExports;
})(this);
