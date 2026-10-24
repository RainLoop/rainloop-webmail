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
