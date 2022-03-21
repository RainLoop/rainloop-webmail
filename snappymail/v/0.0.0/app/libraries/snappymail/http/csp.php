<?php
/**
 * Controls the content_security_policy
 */

namespace SnappyMail\HTTP;

class CSP
{
	public
		$default = ["'self'"],
		// Knockout.js requires unsafe-inline?
		// Knockout.js requires eval() for observable binding purposes
		$script  = ["'self'", "'unsafe-eval'"/*, "'unsafe-inline'"*/],
		$img     = ["'self'", 'data:'],
		$style   = ["'self'", "'unsafe-inline'"],
		$frame   = [],

		$report = false,
		$report_to = [],
		$report_only = false;

	function __construct(string $default = '')
	{
		if ($default) {
			foreach (\explode(';', $default) as $directive) {
				$values = \explode(' ', $directive);
				$name = \preg_replace('/-.+/', '', \trim(\array_shift($values)));
				$this->$name = $values;
			}
		}
	}

	function __toString() : string
	{
		$params = [
			'default-src ' . \implode(' ', $this->default)
		];
		if ($this->script) {
			$params[] = 'script-src ' . \implode(' ', $this->script);
		}
		if ($this->img) {
			$params[] = 'img-src ' . \implode(' ', $this->img);
		}
		if ($this->style) {
			$params[] = 'style-src ' . \implode(' ', $this->style);
		}
		if ($this->frame) {
			$params[] = 'frame-src ' . \implode(' ', $this->frame);
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
