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
	 * @param string $sFoundedValue = ''
	 *
	 * @return bool
	 */
	static public function ValidateWildcardValues($sString, $sWildcardValues, &$sFoundedValue = '')
	{
		$sFoundedValue = '';
		
		$sString = \trim($sString);
		if ('' === $sString)
		{
			return false;
		}

		$sWildcardValues = \trim($sWildcardValues);
		if ('' === $sWildcardValues)
		{
			return true;
		}

		if ('*' === $sWildcardValues)
		{
			$sFoundedValue = '*';
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
					$sFoundedValue = $sItem;
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
					$sFoundedValue = $sItem;
					return true;
				}
			}
		}

		return false;
	}
}
