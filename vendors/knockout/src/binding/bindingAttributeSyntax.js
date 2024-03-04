
// Hide or don't minify context properties, see https://github.com/knockout/knockout/issues/2294
const contextSubscribable = Symbol('_subscribable'),
    contextAncestorBindingInfo = Symbol('_ancestorBindingInfo'),
    contextDataDependency = Symbol('_dataDependency'),

    inheritParentVm = {},

    boundElementDomDataKey = ko.utils.domData.nextKey();

ko.bindingHandlers = {};

// The ko.bindingContext constructor is only called directly to create the root context. For child
// contexts, use bindingContext.createChildContext or bindingContext.extend.
ko.bindingContext = class {
    constructor(dataItemOrAccessor, parentContext, extendCallback, options)
    {
        var self = this,
            shouldInheritData = dataItemOrAccessor === inheritParentVm,
            realDataItemOrAccessor = shouldInheritData ? undefined : dataItemOrAccessor,
            isFunc = typeof(realDataItemOrAccessor) == "function" && !ko.isObservable(realDataItemOrAccessor),
            subscribable,
            dataDependency = options?.['dataDependency'],

        // The binding context object includes static properties for the current, parent, and root view models.
        // If a view model is actually stored in an observable, the corresponding binding context object, and
        // any child contexts, must be updated when the view model is changed.
        updateContext = () => {
            // Most of the time, the context will directly get a view model object, but if a function is given,
            // we call the function to retrieve the view model. If the function accesses any observables or returns
            // an observable, the dependency is tracked, and those observables can later cause the binding
            // context to be updated.
            var dataItemOrObservable = isFunc ? realDataItemOrAccessor() : realDataItemOrAccessor,
                dataItem = ko.utils.unwrapObservable(dataItemOrObservable);

            if (parentContext) {
                // Copy $root and any custom properties from the parent context
                ko.utils.extend(self, parentContext);

                // Copy Symbol properties
                if (contextAncestorBindingInfo in parentContext) {
                    self[contextAncestorBindingInfo] = parentContext[contextAncestorBindingInfo];
                }
            } else {
                self['$root'] = dataItem;

                // Export 'ko' in the binding context so it will be available in bindings and templates
                // even if 'ko' isn't exported as a global, such as when using an AMD loader.
                // See https://github.com/SteveSanderson/knockout/issues/490
                self['ko'] = ko;
            }

            self[contextSubscribable] = subscribable;

            if (shouldInheritData) {
                dataItem = self['$data'];
            } else {
                self['$data'] = dataItem;
            }

            // The extendCallback function is provided when creating a child context or extending a context.
            // It handles the specific actions needed to finish setting up the binding context. Actions in this
            // function could also add dependencies to this binding context.
            extendCallback?.(self, parentContext, dataItem);

            // When a "parent" context is given and we don't already have a dependency on its context, register a dependency on it.
            // Thus whenever the parent context is updated, this context will also be updated.
            if (parentContext?.[contextSubscribable] && !ko.dependencyDetection.computed().hasAncestorDependency(parentContext[contextSubscribable])) {
                parentContext[contextSubscribable]();
            }

            if (dataDependency) {
                self[contextDataDependency] = dataDependency;
            }

            return self['$data'];
        };

        if (options?.['exportDependencies']) {
            // The "exportDependencies" option means that the calling code will track any dependencies and re-create
            // the binding context when they change.
            updateContext();
        } else {
            subscribable = ko.pureComputed(updateContext);
            subscribable.peek();

            // At this point, the binding context has been initialized, and the "subscribable" computed observable is
            // subscribed to any observables that were accessed in the process. If there is nothing to track, the
            // computed will be inactive, and we can safely throw it away. If it's active, the computed is stored in
            // the context object.
            if (subscribable.isActive()) {
                // Always notify because even if the model ($data) hasn't changed, other context properties might have changed
                subscribable.equalityComparer = null;
            } else {
                self[contextSubscribable] = undefined;
            }
        }
    }

    // Extend the binding context hierarchy with a new view model object. If the parent context is watching
    // any observables, the new child context will automatically get a dependency on the parent context.
    // But this does not mean that the $data value of the child context will also get updated. If the child
    // view model also depends on the parent view model, you must provide a function that returns the correct
    // view model on each update.
   'createChildContext'(dataItemOrAccessor, options) {
        return new ko.bindingContext(dataItemOrAccessor, this, (self, parentContext) => {
            // Extend the context hierarchy by setting the appropriate pointers
            self['$parent'] = parentContext['$data'];
            options['extend']?.(self);
        }, options);
    }

    // Extend the binding context with new custom properties. This doesn't change the context hierarchy.
    // Similarly to "child" contexts, provide a function here to make sure that the correct values are set
    // when an observable view model is updated.
    'extend'(properties, options) {
        return new ko.bindingContext(inheritParentVm, this, self =>
            ko.utils.extend(self, typeof(properties) == "function" ? properties(self) : properties)
        , options);
    }
};

function asyncContextDispose(node) {
    var bindingInfo = ko.utils.domData.get(node, boundElementDomDataKey),
        asyncContext = bindingInfo?.asyncContext;
    if (asyncContext) {
        bindingInfo.asyncContext = null;
        asyncContext.notifyAncestor();
    }
}

class AsyncCompleteContext {
    constructor(node, bindingInfo, ancestorBindingInfo) {
        this.node = node;
        this.bindingInfo = bindingInfo;
        this.asyncDescendants = new Set;
        this.childrenComplete = false;

        bindingInfo.asyncContext || ko.utils.domNodeDisposal['addDisposeCallback'](node, asyncContextDispose);

        if (ancestorBindingInfo?.asyncContext) {
            ancestorBindingInfo.asyncContext.asyncDescendants.add(node);
            this.ancestorBindingInfo = ancestorBindingInfo;
        }
    }
    notifyAncestor() {
        this.ancestorBindingInfo?.asyncContext?.descendantComplete(this.node);
    }
    descendantComplete(node) {
        this.asyncDescendants.delete(node);
        this.asyncDescendants.size || this.completeChildren?.();
    }
    completeChildren() {
        this.childrenComplete = true;
        if (this.bindingInfo.asyncContext && !this.asyncDescendants.size) {
            this.bindingInfo.asyncContext = null;
            ko.utils.domNodeDisposal.removeDisposeCallback(this.node, asyncContextDispose);
            ko.bindingEvent.notify(this.node, ko.bindingEvent.descendantsComplete);
            this.notifyAncestor();
        }
    }
}

ko.bindingEvent = {
    childrenComplete: "childrenComplete",
    descendantsComplete : "descendantsComplete",

    subscribe: (node, event, callback, context, options) => {
        var bindingInfo = ko.utils.domData.getOrSet(node, boundElementDomDataKey, {});
        if (!bindingInfo.eventSubscribable) {
            bindingInfo.eventSubscribable = new ko.subscribable;
        }
        if (options?.['notifyImmediately'] && bindingInfo.notifiedEvents[event]) {
            ko.dependencyDetection.ignore(callback, context, [node]);
        }
        return bindingInfo.eventSubscribable['subscribe'](callback, context, event);
    },

    notify: (node, event) => {
        var bindingInfo = ko.utils.domData.get(node, boundElementDomDataKey);
        if (bindingInfo) {
            bindingInfo.notifiedEvents[event] = true;
            bindingInfo.eventSubscribable?.notifySubscribers(node, event);
            if (event == ko.bindingEvent.childrenComplete) {
                if (bindingInfo.asyncContext) {
                    bindingInfo.asyncContext.completeChildren();
                } else if (bindingInfo.asyncContext === undefined && bindingInfo.eventSubscribable?.hasSubscriptionsForEvent(ko.bindingEvent.descendantsComplete)) {
                    // It's currently an error to register a descendantsComplete handler for a node that was never registered as completing asynchronously.
                    // That's because without the asyncContext, we don't have a way to know that all descendants have completed.
                    throw Error("descendantsComplete event not supported for bindings on this node");
                }
            }
        }
    },

    startPossiblyAsyncContentBinding: (node, bindingContext) => {
        var bindingInfo = ko.utils.domData.getOrSet(node, boundElementDomDataKey, {});

        if (!bindingInfo.asyncContext) {
            bindingInfo.asyncContext = new AsyncCompleteContext(node, bindingInfo, bindingContext[contextAncestorBindingInfo]);
        }

        // If the provided context was already extended with this node's binding info, just return the extended context
        if (bindingContext[contextAncestorBindingInfo] == bindingInfo) {
            return bindingContext;
        }

        return bindingContext['extend'](ctx => {
            ctx[contextAncestorBindingInfo] = bindingInfo;
        });
    }
};

function applyBindingsToDescendantsInternal(bindingContext, elementOrVirtualElement) {
    var currentChild, nextInQueue = ko.virtualElements.firstChild(elementOrVirtualElement);

    while (currentChild = nextInQueue) {
        // Keep a record of the next child *before* applying bindings, in case the binding removes the current child from its position
        nextInQueue = ko.virtualElements.nextSibling(currentChild);
        applyBindingsToNodeAndDescendantsInternal(bindingContext, currentChild);
    }
    ko.bindingEvent.notify(elementOrVirtualElement, ko.bindingEvent.childrenComplete);
}

function applyBindingsToNodeAndDescendantsInternal(bindingContext, nodeVerified) {
    var bindingContextForDescendants = bindingContext;

    var isElement = (nodeVerified.nodeType === 1);

    // Perf optimisation: Apply bindings only if...
    // (1) We need to store the binding info for the node (all element nodes)
    // (2) It might have bindings (e.g., it has a data-bind attribute, or it's a marker for a containerless template)
    if (isElement || ko.bindingProvider.nodeHasBindings(nodeVerified))
        bindingContextForDescendants = applyBindingsToNodeInternal(nodeVerified, null, bindingContext);

    // Don't want bindings that operate on text nodes to mutate <script> and <textarea> contents,
    // because it's unexpected and a potential XSS issue.
    // Also bindings should not operate on <template> elements since this breaks in Internet Explorer
    // and because such elements' contents are always intended to be bound in a different context
    // from where they appear in the document.
    if (bindingContextForDescendants && !nodeVerified.matches?.('SCRIPT,TEXTAREA,TEMPLATE')) {
        applyBindingsToDescendantsInternal(bindingContextForDescendants, nodeVerified);
    }
}

function topologicalSortBindings(bindings) {
    // Depth-first sort
    var result = [],                // The list of key/handler pairs that we will return
        bindingsConsidered = {},    // A temporary record of which bindings are already in 'result'
        cyclicDependencyStack = []; // Keeps track of a depth-search so that, if there's a cycle, we know which bindings caused it
    ko.utils.objectForEach(bindings, function pushBinding(bindingKey) {
        if (!bindingsConsidered[bindingKey]) {
            var binding = ko.bindingHandlers[bindingKey];
            if (binding) {
                // First add dependencies (if any) of the current binding
                if (binding['after']) {
                    cyclicDependencyStack.push(bindingKey);
                    binding['after'].forEach(bindingDependencyKey => {
                        if (bindings[bindingDependencyKey]) {
                            if (cyclicDependencyStack.includes(bindingDependencyKey)) {
                                throw Error("Cannot combine the following bindings, because they have a cyclic dependency: " + cyclicDependencyStack.join(", "));
                            }
                            pushBinding(bindingDependencyKey);
                        }
                    });
                    cyclicDependencyStack.length--;
                }
                // Next add the current binding
                result.push({ key: bindingKey, handler: binding });
            }
            bindingsConsidered[bindingKey] = true;
        }
    });

    return result;
}

function applyBindingsToNodeInternal(node, sourceBindings, bindingContext) {
    var bindingInfo = ko.utils.domData.getOrSet(node, boundElementDomDataKey, {});

    // Prevent multiple applyBindings calls for the same node, except when a binding value is specified
    var alreadyBound = bindingInfo.alreadyBound;
    if (!sourceBindings) {
        if (alreadyBound) {
            throw Error("You cannot apply bindings multiple times to the same element.");
        }
        bindingInfo.alreadyBound = true;
    }
    if (!alreadyBound) {
        bindingInfo.context = bindingContext;
    }
    if (!bindingInfo.notifiedEvents) {
        bindingInfo.notifiedEvents = {};
    }

    // Use bindings if given, otherwise fall back on asking the bindings provider to give us some bindings
    var bindings;
    if (sourceBindings && typeof sourceBindings !== 'function') {
        bindings = sourceBindings;
    } else {
        // Get the binding from the provider within a computed observable so that we can update the bindings whenever
        // the binding context is updated or if the binding provider accesses observables.
        var bindingsUpdater = ko.computed(
            () => {
                bindings = sourceBindings ? sourceBindings(bindingContext, node) : ko.bindingProvider.getBindingAccessors(node, bindingContext);
                // Register a dependency on the binding context to support observable view models.
                if (bindings) {
                    bindingContext[contextSubscribable]?.();
                    bindingContext[contextDataDependency]?.();
                }
                return bindings;
            },
            { disposeWhenNodeIsRemoved: node }
        );

        if (!bindings || !bindingsUpdater.isActive())
            bindingsUpdater = null;
    }

    var contextToExtend = bindingContext;
    var bindingHandlerThatControlsDescendantBindings;
    if (bindings) {
        // Return the value accessor for a given binding. When bindings are static (won't be updated because of a binding
        // context update), just return the value accessor from the binding. Otherwise, return a function that always gets
        // the latest binding value and registers a dependency on the binding updater.
        var getValueAccessor = bindingsUpdater
            ? bindingKey => () => bindingsUpdater()[bindingKey]()
            : bindingKey => bindings[bindingKey];

        // Use of allBindings as a function is deprecated and removed
        // The following is the 3.x allBindings API
        var allBindings = {
            'get': key => bindings[key] && getValueAccessor(key)(),
            'has': key => key in bindings
        };

        if (ko.bindingEvent.childrenComplete in bindings) {
            ko.bindingEvent.subscribe(node, ko.bindingEvent.childrenComplete, () => {
                var callback = bindings[ko.bindingEvent.childrenComplete]();
                if (callback) {
                    var nodes = ko.virtualElements.childNodes(node);
                    nodes.length && callback(nodes, ko['dataFor'](nodes[0]));
                }
            });
        }

        if (ko.bindingEvent.descendantsComplete in bindings) {
            contextToExtend = ko.bindingEvent.startPossiblyAsyncContentBinding(node, bindingContext);
            ko.bindingEvent.subscribe(node, ko.bindingEvent.descendantsComplete, () => {
                var callback = bindings[ko.bindingEvent.descendantsComplete]();
                if (callback && ko.virtualElements.firstChild(node)) {
                    callback(node);
                }
            });
        }

        // First put the bindings into the right order
        // Go through the sorted bindings, calling init and update for each
        topologicalSortBindings(bindings).forEach(bindingKeyAndHandler => {
            // Note that topologicalSortBindings has already filtered out any nonexistent binding handlers,
            // so bindingKeyAndHandler.handler will always be nonnull.
            var handlerInitFn = bindingKeyAndHandler.handler["init"],
                handlerUpdateFn = bindingKeyAndHandler.handler["update"],
                bindingKey = bindingKeyAndHandler.key;

            // COMMENT_NODE
            if (node.nodeType === 8 && !ko.virtualElements.allowedBindings[bindingKey]) {
                throw Error("The binding '" + bindingKey + "' cannot be used with comment nodes");
            }

            try {
                // Run init, ignoring any dependencies
                if (typeof handlerInitFn == "function") {
                    ko.dependencyDetection.ignore(() => {
                        var initResult = handlerInitFn(node, getValueAccessor(bindingKey), allBindings, contextToExtend['$data'], contextToExtend);

                        // If this binding handler claims to control descendant bindings, make a note of this
                        if (initResult && initResult['controlsDescendantBindings']) {
                            if (bindingHandlerThatControlsDescendantBindings !== undefined)
                                throw Error("Multiple bindings (" + bindingHandlerThatControlsDescendantBindings + " and " + bindingKey + ") are trying to control descendant bindings of the same element. You cannot use these bindings together on the same element.");
                            bindingHandlerThatControlsDescendantBindings = bindingKey;
                        }
                    });
                }

                // Run update in its own computed wrapper
                if (typeof handlerUpdateFn == "function") {
                    ko.computed(
                        () => handlerUpdateFn(node, getValueAccessor(bindingKey), allBindings, contextToExtend['$data'], contextToExtend),
                        { disposeWhenNodeIsRemoved: node }
                    );
                }
            } catch (ex) {
                ex.message = "Unable to process binding \"" + bindingKey + ": " + bindings[bindingKey] + "\"\nMessage: " + ex.message;
                throw ex;
            }
        });
    }

    return bindingHandlerThatControlsDescendantBindings === undefined && contextToExtend;
}

ko.storedBindingContextForNode = node => {
    var bindingInfo = ko.utils.domData.get(node, boundElementDomDataKey);
    return bindingInfo && bindingInfo.context;
}

function getBindingContext(viewModelOrBindingContext, extendContextCallback) {
    return viewModelOrBindingContext && (viewModelOrBindingContext instanceof ko.bindingContext)
        ? viewModelOrBindingContext
        : new ko.bindingContext(viewModelOrBindingContext, null, extendContextCallback);
}

ko['applyBindingAccessorsToNode'] = (node, bindings, viewModelOrBindingContext) =>
    applyBindingsToNodeInternal(node, bindings, getBindingContext(viewModelOrBindingContext));

ko.applyBindingsToDescendants = (viewModelOrBindingContext, rootNode) => {
    if (rootNode.nodeType === 1 || rootNode.nodeType === 8)
        applyBindingsToDescendantsInternal(getBindingContext(viewModelOrBindingContext), rootNode);
};

ko.applyBindings = function (viewModelOrBindingContext, rootNode, extendContextCallback) {
    if (arguments.length < 2) {
        rootNode = document.body;
        if (!rootNode) {
            throw Error("ko.applyBindings: could not find document.body; has the document been loaded?");
        }
    } else if (!rootNode || (rootNode.nodeType !== 1 && rootNode.nodeType !== 8)) {
        throw Error("ko.applyBindings: first parameter should be your view model; second parameter should be a DOM node");
    }

    applyBindingsToNodeAndDescendantsInternal(getBindingContext(viewModelOrBindingContext, extendContextCallback), rootNode);
};

// Retrieving binding context from arbitrary nodes
ko['dataFor'] = node => {
    // We can only do something meaningful for elements and comment nodes (in particular, not text nodes, as IE can't store domdata for them)
    var context = node && [1,8].includes(node.nodeType) && ko.storedBindingContextForNode(node);
    return context ? context['$data'] : undefined;
};

ko.exportSymbol('bindingHandlers', ko.bindingHandlers);
ko.exportSymbol('applyBindings', ko.applyBindings);
