<?php

namespace SnappyMail\HTTP;

/**
 * Can be used with JavaScript AbstractFetchRemote.streamPerLine(fCallback, sGetAdd, postData)
 *
 * Apache mod_fastcgi needs the -flush option
 * Apache mod_proxy_fcgi needs 'flushpackets' like in <Proxy "fcgi://...." flushpackets=on></Proxy>
 * We can't control them in PHP
 * We can control ending the response with \fastcgi_finish_request(), but that makes it a background process
 */

abstract class Stream
{
	public static function start(bool $binary = false)
	{
		\set_time_limit(0);
		\ob_implicit_flush();
		\ini_set('implicit_flush', '1');
		\ini_set('output_buffering', '0');
		\ini_set('display_errors', '0');
		if ($i = \ob_get_level()) {
			# Clear buffers:
			while ($i-- && \ob_end_clean());
//			\ob_get_level() || \header('Content-Encoding: ');
		}
		// https://www.w3.org/TR/edge-arch/
		// We just fake Drupal https://www.drupal.org/docs/8/core/modules/big-pipe/bigpipe-environment-requirements
		\header('Surrogate-Control: no-store, content="BigPipe/1.0"');
		// Explicitly disable caching so Varnish and other upstreams won't cache.
		\header('Cache-Control: no-store');
		\header('Pragma: no-cache');

		// Nginx: disable fastcgi_buffering and disable gzip for this request.
		\header('X-Accel-Buffering: no');

		if (!$binary) {
			\header('Content-Type: text/plain');
		}
	}

	public static function JSON($data)
	{
		echo \RainLoop\Utils::jsonEncode($data) . "\n";
//		\ob_flush();
		\flush();
	}
}
