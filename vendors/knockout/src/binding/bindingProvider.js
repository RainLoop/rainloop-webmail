(() => {
    const defaultBindingAttributeName = "data-bind",

        bindingCache = {},

        createBindingsStringEvaluatorViaCache = (bindingsString, cache, options) => {
            var cacheKey = bindingsString + (options && options['valueAccessors'] || '');
            return cache[cacheKey]
                || (cache[cacheKey] = createBindingsStringEvaluator(bindingsString, options));
        },

        createBindingsStringEvaluator = (bindingsString, options) => {
            // Build the source for a function that evaluates "expression"
            // For each scope variable, add an extra level of "with" nesting
            // Example result: with(sc1) { with(sc0) { return (expression) } }
            var rewrittenBindings = ko.expressionRewriting.preProcessBindings(bindingsString, options),
                functionBody = "with($context){with($data||{}){return{" + rewrittenBindings + "}}}";
            return new Function("$context", "$element", functionBody);
        },

        // The following function is only used internally by this default provider.
        // It's not part of the interface definition for a general binding provider.
        getBindingsString = node => {
            switch (node.nodeType) {
                case 1: return node.getAttribute(defaultBindingAttributeName);   // Element
                case 8: return ko.virtualElements.virtualNodeBindingValue(node); // Comment node
            }
            return null;
        },

        // The following function is only used internally by this default provider.
        // It's not part of the interface definition for a general binding provider.
        parseBindingsString = (bindingsString, bindingContext, node, options) => {
            try {
                var bindingFunction = createBindingsStringEvaluatorViaCache(bindingsString, bindingCache, options);
                return bindingFunction(bindingContext, node);
            } catch (ex) {
                ex.message = "Unable to parse bindings.\nBindings value: " + bindingsString + "\nMessage: " + ex.message;
                throw ex;
            }
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
            var bindingsString = getBindingsString(node, bindingContext);
            return bindingsString ? parseBindingsString(bindingsString, bindingContext, node, { 'valueAccessors': true }) : null;
        }
    };

})();
