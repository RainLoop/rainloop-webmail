<?php

namespace SnappyMail\HTTP;

class Exception extends \Exception
{

	# Status Codes https://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html
	const CODES = array(

		// Redirection 3xx
		300 => 'Multiple Choices',
		301 => 'Moved Permanently',
		302 => 'Found',
		303 => 'See Other',
		304 => 'Not Modified',
		305 => 'Use Proxy',
//		306 => 'Switch Proxy',        # obsolete
		307 => 'Temporary Redirect',

		// Client Error 4xx
		400 => 'Bad Request',
		401 => 'Unauthorized',
		402 => 'Payment Required',    # reserved for future use
		403 => 'Forbidden',
		404 => 'Not Found',
		405 => 'Method Not Allowed',
		406 => 'Not Acceptable',
		407 => 'Proxy Authentication Required',
		408 => 'Request Timeout',
		409 => 'Conflict',
		410 => 'Gone',
		411 => 'Length Required',
		412 => 'Precondition Failed',
		413 => 'Request Entity Too Large',
		414 => 'Request-URI Too Long',
		415 => 'Unsupported Media Type',
		416 => 'Requested Range Not Satisfiable',
		417 => 'Expectation Failed',
		// https://tools.ietf.org/html/rfc7540#section-9.1.2
		421 => 'Misdirected Request',
		// https://tools.ietf.org/html/rfc4918
		422 => 'Unprocessable Entity',
		423 => 'Locked',
		424 => 'Failed Dependency',
		// http://tools.ietf.org/html/rfc2817
		426 => 'Upgrade Required',
		// http://tools.ietf.org/html/rfc6585
		428 => 'Precondition Required',
		429 => 'Too Many Requests',
		431 => 'Request Header Fields Too Large',
		451 => 'Unavailable For Legal Reasons',

		// Server Error 5xx
		500 => 'Internal Server Error',
		501 => 'Not Implemented',
		502 => 'Bad Gateway',
		503 => 'Service Unavailable', # may have Retry-After header
		504 => 'Gateway Timeout',
		505 => 'HTTP Version Not Supported',
//		506 => 'Variant Also Negotiates',
//		507 => 'Insufficient Storage',
//		508 => 'Loop Detected',
//		509 => 'Bandwidth Limit Exceeded',
//		510 => 'Not Extended',
		511 => 'Network Authentication Required',
	);

	function __construct(string $message = "", int $code = 0, Response $response = null)
	{
		if ($response) {
			if (\in_array($code, array(301, 302, 303, 307))) {
				$message = \trim("{$response->getRedirectLocation()}\n{$message}");
			} else if (405 === $code && ($allow = $response->getHeader('allow'))) {
				$message = \trim((\is_array($allow) ? $allow[0] : $allow) . "\n{$message}");
			}
			$message = \trim("{$message}\n{$response->body}");
		}
		if (isset(static::CODES[$code])) {
			$message = "{$code} " . static::CODES[$code] . ($message ? ": {$message}" : '');
		}
		parent::__construct($message, $code);
	}

}
