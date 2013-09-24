<?php

if (!function_exists('ctype_digit'))
{
	function ctype_digit($text)
	{
		if (is_string($text))
		{
			if ('' === $text)
			{
				return false;
			}
			
			return !!preg_match('/^[\d]+$/', $text);
		}
		
		return false;
	}
}

if (!function_exists('ctype_space'))
{
	function ctype_space($text)
	{
		if ('' === $text)
		{
			return false;
		}

		return !!preg_match('/^[\s]+$/m', $text);
	}
}