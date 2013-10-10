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

if (!function_exists('ctype_alnum'))
{
	function ctype_alnum($sVar)
	{
		return !!preg_match('/^[a-zA-Z0-9]+$/', $sVar);
	}
}