
if (!/iphone|ipod|ipad|android/i.test(navigator.userAgent))
{
	if (window.snowFall && window.rl)
	{
		let body = document.body;
		addEventListener('sm-show-screen', e => {
			if ('login' == e.detail) {
				window.snowFall.snow(body, {
					shadow: true, round: true,  minSize: 2, maxSize: 5
				});
			} else if (body.snow) {
				body.snow.clear();
			}
		});
	}
}
