ko['observableArray'] = initialValues => {
    initialValues = initialValues || [];

    if (typeof initialValues != 'object' || !('length' in initialValues))
        throw new Error("The argument passed when initializing an observable array must be an array, or null, or undefined.");

    return Object.setPrototypeOf(ko.observable(initialValues), ko['observableArray']['fn']).extend({'trackArrayChanges':true});
};

const IS_OBSERVABLE_ARRAY = Symbol('IS_OBSERVABLE_ARRAY');

// Note that for browsers that don't support proto assignment, the
// inheritance chain is created manually in the ko.observableArray constructor
ko['observableArray']['fn'] = Object.setPrototypeOf({
    [IS_OBSERVABLE_ARRAY]: 1,
    'remove'(valueOrPredicate) {
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
        removed && this['valueHasMutated']();
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
            ko['observableArray']['fn'][methodName] = function (...args) {
                // Use "peek" to avoid creating a subscription in any computed that we're executing in the context of
                // (for consistency with mutating regular observables)
                var underlyingArray = this.peek();
                this.valueWillMutate();
                this.cacheDiffForKnownOperation(underlyingArray, methodName, args);
                var methodCallResult = underlyingArray[methodName](...args);
                this['valueHasMutated']();
                // The native sort and reverse methods return a reference to the array, but it makes more sense to return the observable array instead.
                return methodCallResult === underlyingArray ? this : methodCallResult;
            };
        } else {
            // Accessor and Iteration methods
            ko['observableArray']['fn'][methodName] = function (...args) {
                return this()[methodName](...args);
            };
        }
    }
});

ko['isObservableArray'] = obj => !!(obj && obj[IS_OBSERVABLE_ARRAY]);
