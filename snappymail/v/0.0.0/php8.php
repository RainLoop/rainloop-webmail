<?php

if (\PHP_VERSION_ID < 80000)
{
	interface Stringable
	{
		public function __toString() : string;
	}

	if (!class_exists('ValueError')) {
		class ValueError extends Error
		{
		}
	}

	if (!function_exists('str_contains')) {
		function str_contains(string $haystack, string $needle) : bool
		{
			return false !== strpos($haystack, $needle);
		}
	}

	if (!function_exists('str_starts_with')) {
		function str_starts_with(string $haystack, string $needle) : bool
		{
			return 0 === strncmp($haystack, $needle, strlen($needle));
		}
	}

	if (!function_exists('str_ends_with')) {
		function str_ends_with(string $haystack, string $needle) : bool
		{
			$length = strlen($needle);
			return $length ? substr($haystack, -$length) === $needle : true;
		}
	}
}
