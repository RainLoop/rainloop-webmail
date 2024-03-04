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

	if (!function_exists('get_debug_type')) {
		function get_debug_type($value): string
		{
			$type = gettype($value);
			switch ($type) {
				case 'NULL': return 'null';
				case 'boolean': return 'bool';
				case 'double': return 'float';
				case 'integer': return 'int';
				case 'object':
//					if ($value instanceof __PHP_Incomplete_Class) return '__PHP_Incomplete_Class';
					$class = get_class($value);
					if (false === strpos($class, '@')) {
						return $class;
					}
					$parent = get_parent_class($class);
					if ($parent) {
						return $parent . '@anonymous';
					}
					$implements = class_implements($class);
					if ($implements) {
						return key($implements) . '@anonymous';
					}
					return 'class@anonymous';
				case 'resource':
					$type = get_resource_type($value);
					if (null === $type) {
						return 'unknown';
					}
					if ('Unknown' === $type) {
						$type = 'closed';
					}
					return "resource ($type)";
				default:
					return $type;
			}
		}
	}
}
