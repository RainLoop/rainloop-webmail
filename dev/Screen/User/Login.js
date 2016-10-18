
import $ from '$';
import _ from '_';

import {$win} from 'Common/Globals';

import {AbstractScreen} from 'Knoin/AbstractScreen';

import {LoginUserView} from 'View/User/Login';

import {getApp} from 'Helper/Apps/User';

class LoginUserScreen extends AbstractScreen
{
	constructor() {
		super('login', [LoginUserView]);
	}

	onShow() {
		getApp().setWindowTitle('');
		this.initFunBackgroud();
	}

	getHeightAndWidth() {
		const
			height = $win.height(),
			width = $win.width();

		return {height, width};
	}

	initFunBackgroud() {

		const
			$bg = $('#rl-bg'),
			movementStrength = 25,
			winHeight = $win.height(),
			winWidth = $win.width(),
			height = movementStrength / winHeight,
			width = movementStrength / winWidth,
			winHeightHalf = winHeight / 2,
			winWidthHalf = winWidth / 2;

		$('#rl-app').on('mousemove', _.throttle((e) => {
			$bg.css({
				top: height * (e.pageY - winHeightHalf) * -1 - movementStrength,
				left: width * (e.pageX - winWidthHalf) * -1 - movementStrength
			});
		}, 1));
	}
}

export {LoginUserScreen, LoginUserScreen as default};
