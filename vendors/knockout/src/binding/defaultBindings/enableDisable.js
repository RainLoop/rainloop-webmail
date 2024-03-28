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
