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
        else {
            // Read
            ko.dependencyDetection.registerDependency(observable); // The caller only needs to be notified of changes if they did a "read" operation
            return observable[observableLatestValue];
        }
    }

    observable[observableLatestValue] = initialValue;

    Object.defineProperty(observable, length, {
        get: () => null == observable[observableLatestValue] ? undefined : observable[observableLatestValue][length]
    });

    // Inherit from 'subscribable'
    ko.subscribable['fn'].init(observable);

    // Inherit from 'observable'
    Object.setPrototypeOf(observable, observableFn);

    return observable;
}

// Define prototype for observables
var observableFn = {
    'toJSON': function() {
        let value = this[observableLatestValue];
        return value && value.toJSON ? value.toJSON() : value;
    },
    'equalityComparer': valuesArePrimitiveAndEqual,
    peek: function() { return this[observableLatestValue]; },
    valueHasMutated: function () {
        this['notifySubscribers'](this[observableLatestValue], 'spectate');
        this['notifySubscribers'](this[observableLatestValue]);
    },
    valueWillMutate: function () { this['notifySubscribers'](this[observableLatestValue], 'beforeChange'); }
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
