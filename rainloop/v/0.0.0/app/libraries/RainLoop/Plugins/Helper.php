<?php

namespace RainLoop\Plugins;

class Helper
{
	/**
	 * @return void
	 */
	private function __construct()
	{
	}

	/**
	 * @param string $sString
	 * @param string $sWildcardValues
	 *
	 * @return bool
	 */
	static public function ValidateWildcardValues($sString, $sWildcardValues)
	{
		$sString = \trim($sString);
		if ('' === $sString)
		{
			return false;
		}

		$sWildcardValues = \trim($sWildcardValues);
		if ('' === $sWildcardValues || '*' === $sWildcardValues)
		{
			return true;
		}

		$sWildcardValues = \preg_replace('/[*]+/', '*', \preg_replace('/[\s,;]+/', ' ', $sWildcardValues));
		$aWildcardValues = \explode(' ', $sWildcardValues);

		foreach ($aWildcardValues as $sItem)
		{
			if (false === \strpos($sItem, '*'))
			{
				if ($sString === $sItem)
				{
					return true;
				}
			}
			else
			{
				$aItem = \explode('*', $sItem);
				$aItem = \array_map(function ($sItem) {
					return \preg_quote($sItem, '/');
				}, $aItem);

				if (\preg_match('/'.\implode('.*', $aItem).'/', $sString))
				{
					return true;
				}
			}
		}

		return false;
	}
}
