<?php

namespace RainLoop\Plugins;

class Helper
{
	static public function ValidateWildcardValues(string $sString, string $sWildcardValues, string &$sFoundValue = null) : bool
	{
		$sFoundValue = '';

		$sString = \trim($sString);
		if ('' === $sString) {
			return false;
		}

		$sWildcardValues = \trim($sWildcardValues);
		if ('' === $sWildcardValues) {
			return true;
		}

		if ('*' === $sWildcardValues) {
			$sFoundValue = '*';
			return true;
		}

		$aWildcardValues = \preg_split('/[\\s,;]+/', \preg_replace('/\\*+/', '*', $sWildcardValues));

		foreach ($aWildcardValues as $sItem) {
			if (false === \strpos($sItem, '*')) {
				if ($sString === $sItem) {
					$sFoundValue = $sItem;
					return true;
				}
			} else {
				$aItem = \explode('*', $sItem);
				$aItem = \array_map(function ($sItem) {
					return \preg_quote($sItem, '/');
				}, $aItem);

				if (\preg_match('/'.\implode('.*', $aItem).'/', $sString)) {
					$sFoundValue = $sItem;
					return true;
				}
			}
		}

		return false;
	}
}
