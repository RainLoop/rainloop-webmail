<?php

if (\PHP_VERSION_ID < 80000)
{
	interface Stringable
	{
		public function __toString() : string;
	}

	class ValueError extends Error
	{
	}

	function str_contains(string $haystack, string $needle) : bool
	{
		return false !== strpos($haystack, $needle);
	}

	function str_starts_with(string $haystack, string $needle) : bool
	{
		return 0 === strncmp($haystack, $needle, strlen($needle));
	}

	function str_ends_with(string $haystack, string $needle) : bool
	{
		$length = strlen($needle);
		return $length ? substr($haystack, -$length) === $needle : true;
	}
}
