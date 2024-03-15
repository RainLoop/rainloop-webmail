<?php
/**
 * Controls the content_security_policy
 */

namespace SnappyMail\HTTP;

class CSP implements \Stringable
{
	public
		$report = false,
		$report_to = [],
		$report_only = false;

	/**
	 * https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy#directives
	 */
	private $directives = [
		'base-uri' => ["'self'"],
		'default-src' => ["'self'", 'data:'],
		// Knockout.js requires eval() for observable binding purposes
		// Safari < 15.4 does not support strict-dynamic
//		'script-src' => ["'strict-dynamic'", "'unsafe-eval'"],
		'script-src' => ["'self'", "'unsafe-eval'"],
		// Knockout.js requires unsafe-inline?
//		'script-src' => ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
		'img-src' => ["'self'", 'data:'],
		'media-src' => ["'self'", 'data:'],
		'style-src' => ["'self'", "'unsafe-inline'"],
		'connect-src' => ["'self'", 'data:', "keys.openpgp.org"]
	];

	function __construct(string $default = '')
	{
		if ($default) {
			foreach (\explode(';', $default) as $directive) {
				$sources = \preg_split('/\\s+/', \trim($directive));
				$directive = \array_shift($sources);
				if (!isset($this->directives[$directive])) {
					$this->directives[$directive] = [];
				}
				$this->directives[$directive] = \array_merge($this->directives[$directive], $sources);
			}
		}
	}

	function __toString() : string
	{
		// report-uri deprecated
		unset($this->directives['report-uri']);
		if ($this->report || $this->report_only) {
			$this->directives['report-uri'] = [\RainLoop\Utils::WebPath() . '?/CspReport'];
		}
		$params = [];
		foreach ($this->directives as $directive => $sources) {
			$params[] = $directive . ' ' . \implode(' ', \array_unique($sources));
		}
//		if (empty($this->directives['frame-ancestors'])) {
//			$params[] = "frame-ancestors 'none';";
//		}
		return \implode('; ', $params);
	}

	public function add(string $directive, string $source) : void
	{
		if (!isset($this->directives[$directive])) {
			$this->directives[$directive] = [];
		}
		$this->directives[$directive][] = $source;
	}

	public function get(string $directive) : array
	{
		return isset($this->directives[$directive])
			? $this->directives[$directive]
			: [];
	}

	public function setHeaders() : void
	{
		if ($this->report_only) {
			\header('Content-Security-Policy-Report-Only: ' . $this);
		} else {
			\header('Content-Security-Policy: ' . $this);
		}
		if (empty($this->directives['frame-ancestors']) || \in_array('none', $this->directives['frame-ancestors'])) {
			\header('X-Frame-Options: DENY');
		} else {
//			\header('X-Frame-Options: SAMEORIGIN');
		}
	}

	public static function logReport() : void
	{
		\http_response_code(204);
		$json = \file_get_contents('php://input');
		$report = \json_decode($json, true);
		// Useless to log 'moz-extension' as there's no clue which extension violates
		if ($json && $report && 'moz-extension' !== $report['csp-report']['source-file']) {
			\SnappyMail\Log::error('CSP', $json);
		}
		exit;
	}
}
