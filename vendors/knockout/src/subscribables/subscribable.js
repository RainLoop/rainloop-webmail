
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
        ko.exportProperty(this, 'disposeWhenNodeIsRemoved', this.disposeWhenNodeIsRemoved);
    }

    dispose() {
        var self = this;
        if (!self._isDisposed) {
            if (self._domNodeDisposalCallback) {
                ko.utils.domNodeDisposal.removeDisposeCallback(self._node, self._domNodeDisposalCallback);
            }
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
        instance._subscriptions = { "change": [] };
        instance._versionNumber = 1;
    },

    subscribe: function (callback, callbackTarget, event) {
        var self = this;

        event = event || defaultEvent;
        var boundCallback = callbackTarget ? callback.bind(callbackTarget) : callback;

        var subscription = new koSubscription(self, boundCallback, () => {
            ko.utils.arrayRemoveItem(self._subscriptions[event], subscription);
            if (self.afterSubscriptionRemove)
                self.afterSubscriptionRemove(event);
        });

        if (self.beforeSubscriptionAdd)
            self.beforeSubscriptionAdd(event);

        if (!self._subscriptions[event])
            self._subscriptions[event] = [];
        self._subscriptions[event].push(subscription);

        return subscription;
    },

    "notifySubscribers": function (valueToNotify, event) {
        event = event || defaultEvent;
        if (event === defaultEvent) {
            this.updateVersion();
        }
        if (this.hasSubscriptionsForEvent(event)) {
            var subs = event === defaultEvent && this._changeSubscriptions || this._subscriptions[event].slice(0);
            try {
                ko.dependencyDetection.begin(); // Begin suppressing dependency detection (by setting the top frame to undefined)
                var i = 0, subscription;
                while ((subscription = subs[i++])) {
                    // In case a subscription was disposed during the arrayForEach cycle, check
                    // for isDisposed on each subscription before invoking its callback
                    if (!subscription._isDisposed)
                        subscription._callback(valueToNotify);
                }
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
            self._origNotifySubscribers = self["notifySubscribers"];
            // Moved out of "limit" to avoid the extra closure
            self["notifySubscribers"] = function(value, event) {
                if (!event || event === defaultEvent) {
                    this._limitChange(value);
                } else if (event === 'beforeChange') {
                    this._limitBeforeChange(value);
                } else {
                    this._origNotifySubscribers(value, event);
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
            self._changeSubscriptions = self._subscriptions[defaultEvent].slice(0);
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
        return this._subscriptions[event] && this._subscriptions[event].length;
    },

    isDifferent: function(oldValue, newValue) {
        return !this['equalityComparer'] || !this['equalityComparer'](oldValue, newValue);
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
Object.setPrototypeOf(ko_subscribable_fn, Function.prototype);

ko.subscribable['fn'] = ko_subscribable_fn;


ko.isSubscribable = instance =>
    instance != null && typeof instance.subscribe == "function" && typeof instance["notifySubscribers"] == "function";
