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
        disposeWhenNodeIsRemoved: options.disposeWhenNodeIsRemoved,
        disposeWhen: options.disposeWhen,
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
    ko.subscribable['fn']['init'](computedObservable);

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
        ko.utils.domNodeDisposal['addDisposeCallback'](state.disposeWhenNodeIsRemoved, state.domNodeDisposalCallback = () => {
            computedObservable['dispose']();
        });
    }

    return computedObservable;
};

// Utility function that disposes a given dependencyTracking entry
function computedDisposeDependencyCallback(id, entryToDispose) {
    entryToDispose?.['dispose']?.();
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
    getDependenciesCount() {
        return this[computedState].dependenciesCount;
    },
    getDependencies() {
        var dependencyTracking = this[computedState].dependencyTracking, dependentObservables = [];

        ko.utils.objectForEach(dependencyTracking, (id, dependency) =>
            dependentObservables[dependency._order] = dependency._target
        );

        return dependentObservables;
    },
    hasAncestorDependency(obs) {
        if (!this[computedState].dependenciesCount) {
            return false;
        }
        var dependencies = this.getDependencies();
        return dependencies.includes(obs)
            || !!dependencies.find(dep => dep.hasAncestorDependency && dep.hasAncestorDependency(obs));
    },
    addDependencyTracking(id, target, trackingObj) {
        if (this[computedState].pure && target === this) {
            throw Error("A 'pure' computed must not be called recursively");
        }

        this[computedState].dependencyTracking[id] = trackingObj;
        trackingObj._order = this[computedState].dependenciesCount++;
        trackingObj._version = target.getVersion();
    },
    haveDependenciesChanged() {
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
    markDirty() {
        // Process "dirty" events if we can handle delayed notifications
        if (!this[computedState].isBeingEvaluated) {
            this._evalDelayed?.(false /*isChange*/);
        }
    },
    isActive() {
        var state = this[computedState];
        return state.isDirty || state.dependenciesCount > 0;
    },
    respondToChange() {
        // Ignore "change" events if we've already scheduled a delayed notification
        if (!this._notificationIsPending) {
            this.evaluatePossiblyAsync();
        } else if (this[computedState].isDirty) {
            this[computedState].isStale = true;
        }
    },
    subscribeToDependency(target) {
        return target['subscribe'](this.evaluatePossiblyAsync, this);
    },
    evaluatePossiblyAsync() {
        var computedObservable = this;
        if (computedObservable._evalDelayed) {
            computedObservable._evalDelayed(true /*isChange*/);
        } else {
            computedObservable.evaluateImmediate(true /*notifyChange*/);
        }
    },
    evaluateImmediate(notifyChange) {
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
                computedObservable['dispose']();
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
    evaluateImmediate_CallReadWithDependencyDetection(notifyChange) {
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
            computedObservable['dispose']();
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
    peek(evaluate) {
        // By default, peek won't re-evaluate, except while the computed is sleeping.
        // Pass in true to evaluate if needed.
        var state = this[computedState];
        if ((state.isDirty && (evaluate || !state.dependenciesCount)) || (state.isSleeping && this.haveDependenciesChanged())) {
            this.evaluateImmediate();
        }
        return state.latestValue;
    },
    limit(limitFunction) {
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
    'dispose'() {
        var state = this[computedState];
        if (!state.isSleeping && state.dependencyTracking) {
            ko.utils.objectForEach(state.dependencyTracking, (id, dependency) =>
                dependency['dispose']?.()
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
    beforeSubscriptionAdd(event) {
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
    afterSubscriptionRemove(event) {
        var state = this[computedState];
        if (!state.isDisposed && event == 'change' && !this.hasSubscriptionsForEvent('change')) {
            ko.utils.objectForEach(state.dependencyTracking, (id, dependency) => {
                if (dependency['dispose']) {
                    state.dependencyTracking[id] = {
                        _target: dependency._target,
                        _order: dependency._order,
                        _version: dependency._version
                    };
                    dependency['dispose']();
                }
            });
            state.isSleeping = true;
            this.notifySubscribers(undefined, "asleep");
        }
    },
    getVersion() {
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
ko.computed['fn'] = computedFn;

ko.exportSymbol('computed', ko.computed);
ko['isComputed'] = instance => (typeof instance == 'function' && instance[protoProp] === computedFn[protoProp]);

ko.pureComputed = (evaluatorFunctionOrOptions) => {
    if (typeof evaluatorFunctionOrOptions === 'function') {
        return ko.computed(evaluatorFunctionOrOptions, {'pure':true});
    }
    evaluatorFunctionOrOptions = { ...evaluatorFunctionOrOptions };   // make a copy of the parameter object
    evaluatorFunctionOrOptions['pure'] = true;
    return ko.computed(evaluatorFunctionOrOptions);
};
