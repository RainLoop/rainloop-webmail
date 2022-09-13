ko.bindingHandlers['style'] = {
    'update': (element, valueAccessor) => {
        ko.utils.objectForEach(ko.utils.unwrapObservable(valueAccessor() || {}), (styleName, styleValue) => {
            styleValue = ko.utils.unwrapObservable(styleValue);

            if (styleValue == null || styleValue === false) {
                // Empty string removes the value, whereas null/undefined have no effect
                styleValue = "";
            }

            if (/^--/.test(styleName)) {
                // Is styleName a custom CSS property?
                element.style.setProperty(styleName, styleValue);
            } else {
                styleName = styleName.replace(/-(\w)/g, (all, letter) => letter.toUpperCase());

                var previousStyle = element.style[styleName];
                element.style[styleName] = styleValue;

                if (styleValue !== previousStyle && element.style[styleName] == previousStyle && !isNaN(styleValue)) {
                    element.style[styleName] = styleValue + "px";
                }
            }
        });
    }
};
