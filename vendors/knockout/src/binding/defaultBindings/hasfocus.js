var hasfocusUpdatingProperty = '__ko_hasfocusUpdating';
var hasfocusLastValue = '__ko_hasfocusLastValue';
ko.bindingHandlers['hasfocus'] = {
    'init': (element, valueAccessor, allBindings) => {
        var handleElementFocusChange = isFocused => {
            // Where possible, ignore which event was raised and determine focus state using activeElement,
            // as this avoids phantom focus/blur events raised when changing tabs in modern browsers.
            // However, not all KO-targeted browsers (Firefox 2) support activeElement. For those browsers,
            // prevent a loss of focus when changing tabs/windows by setting a flag that prevents hasfocus
            // from calling 'blur()' on the element when it loses focus.
            // Discussion at https://github.com/SteveSanderson/knockout/pull/352
            element[hasfocusUpdatingProperty] = true;
            isFocused = (element.ownerDocument.activeElement === element);
            var modelValue = valueAccessor();
            ko.expressionRewriting.writeValueToProperty(modelValue, allBindings, 'hasfocus', isFocused, true);

            //cache the latest value, so we can avoid unnecessarily calling focus/blur in the update function
            element[hasfocusLastValue] = isFocused;
            element[hasfocusUpdatingProperty] = false;
        };
        var handleElementFocusIn = handleElementFocusChange.bind(null, true);
        var handleElementFocusOut = handleElementFocusChange.bind(null, false);

        var registerEventHandler = (event, handler) =>
            element.addEventListener(event, handler);

        registerEventHandler("focus", handleElementFocusIn);
        registerEventHandler("focusin", handleElementFocusIn);
        registerEventHandler("blur",  handleElementFocusOut);
        registerEventHandler("focusout",  handleElementFocusOut);

        // Assume element is not focused (prevents "blur" being called initially)
        element[hasfocusLastValue] = false;
    },
    'update': (element, valueAccessor) => {
        var value = !!ko.utils.unwrapObservable(valueAccessor());

        if (!element[hasfocusUpdatingProperty] && element[hasfocusLastValue] !== value) {
            value ? element.focus() : element.blur();
        }
    }
};
ko.expressionRewriting.twoWayBindings.add('hasfocus');
