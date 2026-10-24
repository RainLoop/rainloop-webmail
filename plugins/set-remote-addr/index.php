<?php
/**
 * Can be used for proxies, like Nginx  with:
 *     proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
 * It's an alternative to application.ini http_client_ip_check_proxy
 */

class SetRemoteAddrPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME = 'Set REMOTE_ADDR',
		VERSION = '2.0',
		DESCRIPTION = 'Sets the $_SERVER[\'REMOTE_ADDR\'] value from HTTP_CLIENT_IP/HTTP_X_FORWARDED_FOR';

	public function Init() : void
	{
		if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
			$_SERVER['REMOTE_ADDR'] = $_SERVER['HTTP_CLIENT_IP'];
		} else if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
			$_SERVER['REMOTE_ADDR'] = $_SERVER['HTTP_X_FORWARDED_FOR'];
		}
	}
}
