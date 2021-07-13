<?php

namespace RainLoop\Providers\Filters\Enumerations;

class ConditionType
{
	const
		EQUAL_TO = 'EqualTo',
		NOT_EQUAL_TO = 'NotEqualTo',
		CONTAINS = 'Contains',
		NOT_CONTAINS = 'NotContains',
		REGEX = 'Regex',
		OVER = 'Over',
		UNDER = 'Under',
		TEXT = 'Text',
		RAW = 'Raw';
}
