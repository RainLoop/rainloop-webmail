(() => {
    const defaultBindingAttributeName = "data-bind",

        bindingCache = new Map,

        // The following function is only used internally by this default provider.
        // It's not part of the interface definition for a general binding provider.
        getBindingsString = node => {
            switch (node.nodeType) {
                case 1: return node.getAttribute(defaultBindingAttributeName);   // Element
                case 8: return ko.virtualElements.virtualNodeBindingValue(node); // Comment node
            }
            return null;
        };

    ko.bindingProvider = new class
    {
        nodeHasBindings(node) {
            switch (node.nodeType) {
                case 1: // Element
                    return node.getAttribute(defaultBindingAttributeName) != null;
                case 8: // Comment node
                    return ko.virtualElements.hasBindingValue(node);
                default: return false;
            }
        }

        getBindingAccessors(node, bindingContext) {
            var bindingsString = getBindingsString(node);
            if (bindingsString) {
                try {
                    let options = { 'valueAccessors': true },
                        cacheKey = bindingsString,
                        bindingFunction = bindingCache.get(cacheKey);
                    if (!bindingFunction) {
                        // Build the source for a function that evaluates "expression"
                        // For each scope variable, add an extra level of "with" nesting
                        // Example result: with(sc1) { with(sc0) { return (expression) } }
                        var rewrittenBindings = ko.expressionRewriting.preProcessBindings(bindingsString, options),
                            functionBody = "with($context){with($data||{}){return{" + rewrittenBindings + "}}}";
                        bindingFunction = new Function("$context", "$element", functionBody);
                        bindingCache.set(cacheKey, bindingFunction);
                    }
                    return bindingFunction(bindingContext, node);
                } catch (ex) {
                    ex.message = "Unable to parse bindings.\nBindings value: " + bindingsString
                        + "\nMessage: " + ex.message;
                    throw ex;
                }
            }
            return null;
        }
    };

})();
