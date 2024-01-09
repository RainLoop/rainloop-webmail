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
