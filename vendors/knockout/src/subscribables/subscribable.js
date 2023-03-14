
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
