ko.bindingHandlers['visible'] = {
    'update': (element, valueAccessor) =>
        element.hidden = !ko.utils.unwrapObservable(valueAccessor())
};

ko.bindingHandlers['hidden'] = {
    'update': (element, valueAccessor) =>
        element.hidden = !!ko.utils.unwrapObservable(valueAccessor())
};
