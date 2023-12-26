<?php

namespace SnappyMail;

abstract class Shutdown
{
	private static
		$actions = [],
		$running = false;

	final public static function run() : void
	{
		if (!static::$running && \count(static::$actions)) {
			static::$running = true;
			\ini_set('display_errors', 0);
			\ignore_user_abort(true);

			# Flush all output buffers
			if ($i = \ob_get_level()) {
				while ($i-- && \ob_end_flush());
			}
			\flush();

			if (\is_callable('fastcgi_finish_request')) {
				// Special FPM/FastCGI (fpm-fcgi) function to finish request and
				// flush all data while continuing to do something time-consuming.
				\fastcgi_finish_request();
			}

			foreach (static::$actions as $action) {
				try {
					\call_user_func_array($action[0], $action[1]);
				} catch (\Throwable $e) { } # skip
			}
		}
	}

	final public static function add(callable $function, array $args = []) : void
	{
		if (!\count(static::$actions)) {
			\register_shutdown_function('\\SnappyMail\\Shutdown::run');
		}
		static::$actions[] = [$function, $args];
	}

	final public static function count() : int
	{
		return \count(static::$actions);
	}
}
