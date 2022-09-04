/*
 * Copyright © 2019 Denis Vadimov aka BloodyAltair
 */
(function () {
    const updateRate = window.rl.pluginSettingsGet('unsplash-bg-updater', 'UpdateRate');
    if(updateRate < 10) {
        console.log("[Settings] Update rate is mandatory positive integer!");
        return -1;
    }
    // noinspection JSUnresolvedVariable,NodeModulesDependencies,ES6ModulesDependencies
    window.unsplashBgUpdater.init(updateRate,"rl-bg","id",function () {
        return new Promise(function(resolve, reject) {
            window.rl.pluginRemoteRequest(function (sResult, oData) {
                if(window.rl.Enums.StorageResultType.Success !== sResult) {
                    reject(sResult)
                }
                // noinspection JSUnresolvedVariable
                resolve(oData.Result);
            }, 'getNewImage');
        })
    });
    console.log("Unsplash background updater loaded!");
}());
