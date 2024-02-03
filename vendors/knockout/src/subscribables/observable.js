const observableLatestValue = Symbol('_latestValue'),
    length = 'length';
//const IS_OBSERVABLE = Symbol('IS_OBSERVABLE');

ko.observable = initialValue => {
    function observable() {
        if (arguments.length > 0) {
            // Write

            // Ignore writes if the value hasn't changed
            if (observable.isDifferent(observable[observableLatestValue], arguments[0])) {
                observable.valueWillMutate();
                observable[observableLatestValue] = arguments[0];
                observable['valueHasMutated']();
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
    ko.subscribable['fn']['init'](observable);

    // Inherit from 'observable'
    return Object.setPrototypeOf(observable, observableFn);
}

// Define prototype for observables
var observableFn = {
//    [IS_OBSERVABLE]: 1,
    'toJSON'() {
        let value = this[observableLatestValue];
        return value?.toJSON?.() || value;
    },
    equalityComparer: valuesArePrimitiveAndEqual,
    peek() { return this[observableLatestValue]; },
    'valueHasMutated'() {
        this.notifySubscribers(this[observableLatestValue], 'spectate');
        this.notifySubscribers(this[observableLatestValue]);
    },
    valueWillMutate() { this.notifySubscribers(this[observableLatestValue], 'beforeChange'); }
};

// Note that for browsers that don't support proto assignment, the
// inheritance chain is created manually in the ko.observable constructor
Object.setPrototypeOf(observableFn, ko.subscribable['fn']);

var protoProperty = ko.observable.protoProperty = '__ko_proto__';
observableFn[protoProperty] = ko.observable;

//ko.isObservable = obj => !!(obj && obj[IS_OBSERVABLE]);
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
