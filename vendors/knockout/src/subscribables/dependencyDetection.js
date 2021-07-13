
ko.dependencyDetection = (() => {
    var outerFrames = [],
        currentFrame,
        lastId = 0,

        begin = options => {
            outerFrames.push(currentFrame);
            currentFrame = options;
        },

        end = () => currentFrame = outerFrames.pop();

    return {
        begin: begin,

        end: end,

        registerDependency: subscribable => {
            if (currentFrame) {
                if (!ko.isSubscribable(subscribable))
                    throw new Error("Only subscribable things can act as dependencies");
                currentFrame.callback.call(currentFrame.callbackTarget, subscribable,
                    subscribable._id || (subscribable._id = ++lastId));
            }
        },

        ignore: (callback, callbackTarget, callbackArgs) => {
            try {
                begin();
                return callback.apply(callbackTarget, callbackArgs || []);
            } finally {
                end();
            }
        },

        getDependenciesCount: () => {
            return currentFrame && currentFrame.computed.getDependenciesCount();
        },

        isInitial: () => {
            return currentFrame && currentFrame.isInitial;
        },

        computed: () => {
            return currentFrame && currentFrame.computed;
        }
    };
})();
