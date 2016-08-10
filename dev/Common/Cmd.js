
// import window from 'window';
import $ from '$';
import _ from '_';
import {$body} from 'Common/Globals';

let
	opened = false,
	cmdDom = null;

/**
 * @returns {void}
 */
function init()
{
	if (null === cmdDom)
	{
		cmdDom = $('<div class="rl-cmd"></div>');
		cmdDom.appendTo($body);
	}
}

/**
 * @returns {void}
 */
export function toggle()
{
	init();

	opened = !opened;

	_.delay(() => {
		cmdDom.toggleClass('opened', opened);
	}, 50);
}
