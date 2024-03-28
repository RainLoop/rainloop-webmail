<?php

if (!function_exists('ctype_digit')) {
	function ctype_digit(string $text): bool
	{
		$l = \strlen($text);
		return $l && $l === \strspn($text, '0123456789');
	}
}

if (!function_exists('ctype_alpha')) {
	function ctype_alpha(string $text): bool
	{
		$l = \strlen($text);
		return $l && $l === \strspn($text, 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz');
	}
}
