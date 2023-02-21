<?php
/**
 * Controls the content_security_policy
 */

namespace SnappyMail\HTTP;

class CSP
{
	public
		$base = ["'self'"],
		$default = ["'self'", 'data:'],
		// Knockout.js requires eval() for observable binding purposes
		// Safari < 15.4 does not support strict-dynamic
//		$script  = ["'strict-dynamic'", "'unsafe-eval'"],
		$script  = ["'self'", "'unsafe-eval'"],
		// Knockout.js requires unsafe-inline?
//		$script  = ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
		$img     = ["'self'", 'data:'],
		$style   = ["'self'", "'unsafe-inline'"],
		$frame   = [],
		$frame_ancestors = [],

		$report = false,
		$report_to = [],
		$report_only = false;

	function __construct(string $default = '')
	{
		if ($default) {
			foreach (\explode(';', $default) as $directive) {
				$values = \preg_split('/\\s+/', $directive);
				$name = \str_replace('-', '_', \preg_replace('/-(src|uri)$/D', '', \trim(\array_shift($values))));
				$this->$name = \array_unique(\array_merge($this->$name, $values));
			}
		}
	}

	function __toString() : string
	{
		$params = [
			'base-uri ' . \implode(' ', \array_unique($this->base)),
			'default-src ' . \implode(' ', \array_unique($this->default))
		];
		if ($this->script) {
			$params[] = 'script-src ' . \implode(' ', \array_unique($this->script));
		}
		if ($this->img) {
			$params[] = 'img-src ' . \implode(' ', \array_unique($this->img));
		}
		if ($this->style) {
			$params[] = 'style-src ' . \implode(' ', \array_unique($this->style));
		}
		if ($this->frame) {
			$params[] = 'frame-src ' . \implode(' ', \array_unique($this->frame));
		}
		if ($this->frame_ancestors) {
			$params[] = 'frame-ancestors ' . \implode(' ', \array_unique($this->frame_ancestors));
		}

		// Deprecated
		if ($this->report) {
			$params[] = 'report-uri ./?/CspReport';
		}

		return \implode('; ', $params);
	}

	public function setHeaders() : void
	{
		if ($this->report_only) {
			\header('Content-Security-Policy-Report-Only: ' . $this);
		} else {
			\header('Content-Security-Policy: ' . $this);
		}
		if (!$this->frame_ancestors) {
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
