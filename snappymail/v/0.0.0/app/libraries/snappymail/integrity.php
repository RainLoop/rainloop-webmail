<?php

namespace SnappyMail;

abstract class Integrity
{

	/**
	 * Called by https://webmail.tld/?/Test
	 */
	public static function test()
	{
		$result = static::phpVersion();
		if ($result) {
			echo '<p style="color: red">' . $result . '</p>';
			return;
		}

		$result = static::phpExtensions();
		if ($result) {
			echo '<p>The following PHP extensions are not available in your PHP configuration!</p>';
			echo '<ul><li>' . \implode('</li>li><li>', $result) . '</li></ul>';
		}

/*
		echo '<div>'.APP_VERSION_ROOT_PATH.'static directory permissions: ' . substr(sprintf('%o', fileperms(APP_VERSION_ROOT_PATH . 'static')), -4) . '</div>';
		echo '<div>'.APP_VERSION_ROOT_PATH.'themes directory permissions: ' . substr(sprintf('%o', fileperms(APP_VERSION_ROOT_PATH . 'themes')), -4) . '</div>';
*/

		$uri = (isset($_SERVER['HTTPS']) ? 'https' : 'http') . '://' . $_SERVER['HTTP_HOST']
			. \RainLoop\Utils::WebVersionPath();
		$HTTP = \SnappyMail\HTTP\Request::factory();
		$files = [
//			'static/css/app.css',
//			'static/js/libs.js',
//			'static/js/app.js',
//			'static/js/openpgp.js',
			'static/css/app.min.css',
			'static/js/min/libs.min.js',
			'static/js/min/app.min.js',
			'static/js/min/openpgp.min.js'
		];
		foreach ($files as $file) {
			echo "<h2>{$uri}{$file}</h2>";
			$response = $HTTP->doRequest('HEAD', $uri . $file);
			echo '<details><summary>Status: ' . $response->status . '</summary><pre>' . \print_r($response->headers, 1) . '</pre></details>';
			$size = \filesize(APP_VERSION_ROOT_PATH.$file);
			if ($size == intval($response->getHeader('content-length'))) {
				echo '<div>content-length matches size ' . $size . '</div>';
			} else {
				echo '<div style="color: red">content-length mismatch, should be: ' . $size . '</div>';
			}
/*
			echo "<h3>encoding</h3>";
			$response = $HTTP->doRequest('GET', $uri . $file, null, ['Accept-Encoding' => 'gzip, deflate, br']);
			echo '<details><summary>Status: ' . $response->status . '</summary><pre>' . \print_r($response->headers, 1) . '</pre></details>';
*/
			echo "<h3>gzip encoded</h3>";
			$response = $HTTP->doRequest('HEAD', $uri . $file . '.gz');
			echo '<details><summary>Status: ' . $response->status . '</summary><pre>' . \print_r($response->headers, 1) . '</pre></details>';
			$size = \filesize(APP_VERSION_ROOT_PATH.$file . '.gz');
			if ($size == intval($response->getHeader('content-length'))) {
				echo '<div>content-length matches size ' . $size . '</div>';
			} else {
				echo '<div style="color: red">content-length mismatch, should be: ' . $size . '</div>';
			}
			if ('gzip' == $response->getHeader('content-encoding')) {
				echo '<div>content-encoding matches</div>';
			} else {
				echo '<div style="color: red">content-encoding mismatch, should be: gzip</div>';
			}

			echo "<h3>brotli encoded</h3>";
			$response = $HTTP->doRequest('HEAD', $uri . $file . '.br');
			echo '<details><summary>Status: ' . $response->status . '</summary><pre>' . \print_r($response->headers, 1) . '</pre></details>';
			$size = \filesize(APP_VERSION_ROOT_PATH.$file . '.br');
			if ($size == intval($response->getHeader('content-length'))) {
				echo '<div>content-length matches size ' . $size . '</div>';
			} else {
				echo '<div style="color: red">content-length mismatch, should be: ' . $size . '</div>';
			}
			if ('br' == $response->getHeader('content-encoding')) {
				echo '<div>content-encoding matches</div>';
			} else {
				echo '<div style="color: red">content-encoding mismatch, should be: br</div>';
			}
		}
	}

	public static function phpVersion()
	{
		if (PHP_VERSION_ID < 70400) {
			return 'Your PHP version ('.PHP_VERSION.') is lower than the minimal required 7.4.0!';
		}
	}

	public static function phpExtensions()
	{
		$aRequirements = array(
			'mbstring' => extension_loaded('mbstring'),
			'Zlib'     => extension_loaded('zlib'),
			// enabled by default:
			'ctype'    => extension_loaded('ctype'),
			'json'     => function_exists('json_decode'),
			'libxml'   => function_exists('libxml_use_internal_errors'),
			'dom'      => class_exists('DOMDocument'),
			// https://github.com/the-djmaze/snappymail/issues/1392
			'fileinfo' => extension_loaded('fileinfo')
			// https://github.com/the-djmaze/snappymail/issues/392
		//	'phar'     => class_exists('PharData')
		);

		$aMissing = [];
		if (in_array(false, $aRequirements)) {
			foreach ($aRequirements as $sKey => $bValue) {
				if (!$bValue) {
					$aMissing[] = $sKey;
				}
			}
		}
		return $aMissing;
	}

}
