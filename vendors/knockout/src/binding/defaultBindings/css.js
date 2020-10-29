var classesWrittenByBindingKey = '__ko__cssValue',
    toggleClasses = (node, classNames, force) => {
        if (classNames) {
            classNames.split(/\s+/).forEach(className =>
                node.classList.toggle(className, force)
            );
        }
    };

ko.bindingHandlers['css'] = {
    'update': (element, valueAccessor) => {
        var value = ko.utils.unwrapObservable(valueAccessor());
        if (value !== null && typeof value == "object") {
            ko.utils.objectForEach(value, (className, shouldHaveClass) => {
                shouldHaveClass = ko.utils.unwrapObservable(shouldHaveClass);
                toggleClasses(element, className, !!shouldHaveClass);
            });
        } else {
            value = ko.utils.stringTrim(value);
            toggleClasses(element, element[classesWrittenByBindingKey], false);
            element[classesWrittenByBindingKey] = value;
            toggleClasses(element, value, true);
        }
    }
};
