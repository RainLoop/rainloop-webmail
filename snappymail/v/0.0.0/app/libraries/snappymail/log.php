<?php

namespace SnappyMail;

abstract class Log
{
	// Same as RFC 5424 section 6.2.1 decimal Severity level indicator
	// http://tools.ietf.org/html/rfc5424#section-6.2.1

	public static function debug    (string $prefix, string $msg) { self::log(\LOG_DEBUG, $prefix, $msg); }

	public static function info     (string $prefix, string $msg) { self::log(\LOG_INFO, $prefix, $msg); }

	public static function notice   (string $prefix, string $msg) { self::log(\LOG_NOTICE, $prefix, $msg); }

	public static function warning  (string $prefix, string $msg) { self::log(\LOG_WARNING, $prefix, $msg); }

	public static function error    (string $prefix, string $msg)  { self::log(\LOG_ERR, $prefix, $msg); }

	public static function critical (string $prefix, string $msg)  { self::log(\LOG_CRIT, $prefix, $msg); }

	public static function alert    (string $prefix, string $msg)  { self::log(\LOG_ALERT, $prefix, $msg); }

	public static function emergency(string $prefix, string $msg)  { self::log(\LOG_EMERG, $prefix, $msg); }

	private static
		$levels = [
			\LOG_EMERG   => 'EMERGENCY',
			\LOG_ALERT   => 'ALERT',
			\LOG_CRIT    => 'CRITICAL',
			\LOG_ERR     => 'ERROR',
			\LOG_WARNING => 'WARNING',
			\LOG_NOTICE  => 'NOTICE',
			\LOG_INFO    => 'INFO',
			\LOG_DEBUG   => 'DEBUG',
		];

	protected static function log(int $level, string $prefix, string $msg)
	{
		if (\RainLoop\Api::Logger()->IsEnabled()) {
			\RainLoop\Api::Logger()->Write($msg, $level, $prefix);
		} else {
/*
			static $log_level;
			// Default to level 4, 0 = LOG_EMERG, 7 = LOG_DEBUG
			if (!$log_level) {
				$log_level = \max(3, \RainLoop\Api::Config()->Get('logs', 'level', \LOG_WARNING));
			}
			if ($level <= $log_level) {
				if (\RainLoop\Api::Config()->Get('logs', 'syslog') && \openlog('snappymail', \LOG_ODELAY, \LOG_USER)) {
					\syslog($level, "{$prefix} {$msg}");
					\closelog();
				}

				if (\filter_var(\ini_get('log_errors'), FILTER_VALIDATE_BOOLEAN)
				&& (($level < \LOG_WARNING && \error_reporting() & \E_ERROR)
				|| ($level == \LOG_WARNING && \error_reporting() & \E_WARNING)
				|| ($level > \LOG_WARNING && \error_reporting() & \E_NOTICE)
				)) {
					\error_log($prefix . ' ' . static::$levels[$level] . ': ' . $msg);
//					\error_log($prefix . ' ' . static::$levels[$level] . ': ' . $msg, 3, 'filename');
				}
			}

			if (\class_exists('OC')) {
//				\OCP\Log\logger('snappymail')->log(\intval($level), $msg);
				\OCP\Log\logger('snappymail')->{static::$levels[$level]}($msg);
			}
*/
		}
	}
}
