// "foreach: someExpression" is equivalent to "template: { foreach: someExpression }"
// "foreach: { data: someExpression }" is equivalent to "template: { foreach: someExpression }"
const makeTemplateValueAccessor = valueAccessor =>
    () => {
        var modelValue = valueAccessor(),
            // Unwrap without setting a dependency here
            unwrappedValue = ko.isObservable(modelValue) ? modelValue.peek() : modelValue;

        // If unwrappedValue is the array, pass in the wrapped value on its own
        // The value will be unwrapped and tracked within the template binding
        // (See https://github.com/SteveSanderson/knockout/issues/523)
        if ((!unwrappedValue) || Array.isArray(unwrappedValue))
            return { 'foreach': modelValue };

        // If unwrappedValue.data is the array, preserve all relevant options and unwrap again value so we get updates
        ko.utils.unwrapObservable(modelValue);
        return {
            'foreach': unwrappedValue['data']
        };
    };
ko.bindingHandlers['foreach'] = {
    'init': (element, valueAccessor) =>
        ko.bindingHandlers['template']['init'](element, makeTemplateValueAccessor(valueAccessor))
    ,
    'update': (element, valueAccessor, allBindings, viewModel, bindingContext) =>
        ko.bindingHandlers['template']['update'](element, makeTemplateValueAccessor(valueAccessor), allBindings, viewModel, bindingContext)
};
ko.virtualElements.allowedBindings['foreach'] = true;
