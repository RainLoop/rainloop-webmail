(rl => {

    rl && addEventListener('rl-view-model', e => {
        const id = e.detail.viewModelTemplateID;
        if (e.detail && ('Login' === id)) {
	    let
		auto_login = window.rl.pluginSettingsGet('proxy-auth', 'auto_login');
            ;

            const
                ForwardProxyAuth = () => {
		    if (auto_login) {
                        var xhr = new XMLHttpRequest();
                        xhr.open("GET", "/?UserHeaderSet", true);

                        xhr.onreadystatechange = function () {
                            if (xhr.readyState == 4 && xhr.status == 200) {
                                window.location.href = "/?ProxyAuth";
                            }
                        };

                        xhr.send();
                    }
                };

            window.ForwardProxyAuth = ForwardProxyAuth;

            ForwardProxyAuth();
        }
    });
})(window.rl);

