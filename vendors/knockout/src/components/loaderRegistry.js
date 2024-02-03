(() => {
    var loadingSubscribablesCache = Object.create(null), // Tracks component loads that are currently in flight
        loadedDefinitionsCache = new Map();    // Tracks component loads that have already completed

    ko.components = {
        get: (componentName, callback) => {
            if (loadedDefinitionsCache.has(componentName)) {
                callback(loadedDefinitionsCache.get(componentName));
            } else {
                // Join the loading process that is already underway, or start a new one.
                var subscribable = loadingSubscribablesCache[componentName];
                if (subscribable) {
                    subscribable['subscribe'](callback);
                } else {
                    // It's not started loading yet. Start loading, and when it's done, move it to loadedDefinitionsCache.
                    subscribable = loadingSubscribablesCache[componentName] = new ko.subscribable();
                    subscribable['subscribe'](callback);

                    loadComponent(componentName, definition => {
                        loadedDefinitionsCache.set(componentName, definition);
                        delete loadingSubscribablesCache[componentName];

                        // For API consistency, all loads complete asynchronously. However we want to avoid
                        // adding an extra task schedule if it's unnecessary (i.e., the completion is already
                        // async).
                        //
                        // You can bypass the 'always asynchronous' feature by putting the synchronous:true
                        // flag on your component configuration when you register it.
                        subscribable.notifySubscribers(definition);
                    });
                }
            }
        },

        register: (componentName, config) => {
            if (!config) {
                throw new Error('Invalid configuration for ' + componentName);
            }

            if (defaultConfigRegistry[componentName]) {
                throw new Error('Component ' + componentName + ' is already registered');
            }

            defaultConfigRegistry[componentName] = config;
        }
    };

    // The default loader is responsible for two things:
    // 1. Maintaining the default in-memory registry of component configuration objects
    //    (i.e., the thing you're writing to when you call ko.components.register(someName, ...))
    // 2. Answering requests for components by fetching configuration objects
    //    from that default in-memory registry and resolving them into standard
    //    component definition objects (of the form { createViewModel: ..., template: ... })
    // Custom loaders may override either of these facilities, i.e.,
    // 1. To supply configuration objects from some other source (e.g., conventions)
    // 2. Or, to resolve configuration objects by loading viewmodels/templates via arbitrary logic.

    var defaultConfigRegistry = Object.create(null),
        createViewModelKey = 'createViewModel',
        throwError = (componentName, message) => { throw new Error(`Component '${componentName}': ${message}`) },

        // Takes a config object of the form { template: ..., viewModel: ... }, and asynchronously convert it
        // into the standard component definition format:
        //    { template: <ArrayOfDomNodes>, createViewModel: function(params, componentInfo) { ... } }.
        // Since both template and viewModel may need to be resolved asynchronously, both tasks are performed
        // in parallel, and the results joined when both are ready. We don't depend on any promises infrastructure,
        // so this is implemented manually below.
        loadComponent = (componentName, callback) => {
            // Try the candidates
            var result = {},
                config = defaultConfigRegistry[componentName] || {},
                templateConfig = config['template'],
                viewModelConfig = config['viewModel'];

            if (templateConfig) {
                if (!templateConfig['element']) {
                    throwError(componentName, 'Unknown template value: ' + templateConfig);
                }
                // Element ID - find it, then copy its child nodes
                var element = templateConfig['element'];
                var elemInstance = document.getElementById(element);
                if (!elemInstance) {
                    throwError(componentName, 'Cannot find element with ID ' + element);
                }
                if (!elemInstance.matches('TEMPLATE')) {
                    throwError(componentName, 'Template Source Element not a <template>');
                }
                // For browsers with proper <template> element support (i.e., where the .content property
                // gives a document fragment), use that document fragment.
                result['template'] = ko.utils.cloneNodes(elemInstance.content.childNodes);
            }

            if (viewModelConfig) {
                if (typeof viewModelConfig[createViewModelKey] !== 'function') {
                    throwError(componentName, 'Unknown viewModel value: ' + viewModelConfig);
                }
                // Already a factory function - use it as-is
                result[createViewModelKey] = viewModelConfig[createViewModelKey];
            }

            // Did candidate return a value?
            var found = (result['template'] && result[createViewModelKey]);
            callback(found ? result : null);
        };

    ko.exportSymbol('components', ko.components);
    ko.exportSymbol('components.register', ko.components.register);
})();
