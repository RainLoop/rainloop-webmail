<?php

namespace RainLoop\Providers\Filters\Enumerations;

class ConditionType
{
	const EQUAL_TO = 'EqualTo';
	const NOT_EQUAL_TO = 'NotEqualTo';
	const CONTAINS = 'Contains';
	const NOT_CONTAINS = 'NotContains';
	const REGEX = 'Regex';
	const OVER = 'Over';
	const UNDER = 'Under';
}
