var classesWrittenByBindingKey = '__ko__cssValue';

// For details on the pattern for changing node classes
// see: https://github.com/knockout/knockout/issues/1597
function toggleDomNodeCssClass(node, classNames, shouldHaveClass) {
	if (classNames) {
		var addOrRemoveFn = shouldHaveClass ? 'add' : 'remove';
		classNames.split(/\s+/).forEach(function(className) {
			node.classList[addOrRemoveFn](className);
		});
	}
}

ko.bindingHandlers['class'] = {
    'update': function (element, valueAccessor) {
        var value = ko.utils.stringTrim(ko.utils.unwrapObservable(valueAccessor()));
        toggleDomNodeCssClass(element, element[classesWrittenByBindingKey], false);
        element[classesWrittenByBindingKey] = value;
        toggleDomNodeCssClass(element, value, true);
    }
};

ko.bindingHandlers['css'] = {
    'update': function (element, valueAccessor) {
        var value = ko.utils.unwrapObservable(valueAccessor());
        if (value !== null && typeof value == "object") {
            ko.utils.objectForEach(value, function(className, shouldHaveClass) {
                shouldHaveClass = ko.utils.unwrapObservable(shouldHaveClass);
                toggleDomNodeCssClass(element, className, shouldHaveClass);
            });
        } else {
            ko.bindingHandlers['class']['update'](element, valueAccessor);
        }
    }
};
