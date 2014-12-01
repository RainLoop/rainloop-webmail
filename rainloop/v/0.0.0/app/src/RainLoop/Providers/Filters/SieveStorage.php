<?php

namespace RainLoop\Providers\Filters;

class SieveStorage implements \RainLoop\Providers\Filters\FiltersInterface
{
	/**
	 * @return void
	 */
	public function __construct()
	{
	}

	/**
	 * @return array
	 */
	public function Load()
	{
		// TODO
		return $this->fileStringToCollection(@\file_get_contents('e:/sieve.txt'));
	}

	/**
	 * @param array $aFilters
	 *
	 * @return bool
	 */
	public function Save($aFilters)
	{
		return @\file_put_contents('e:/sieve.txt', $this->collectionToFileString($aFilters));
	}

	/**
	 * @param array $aFilters
	 *
	 * @return string
	 */
	private function collectionToFileString($aFilters)
	{
		$aParts = array();

		foreach ($aFilters as /* @var $oItem \RainLoop\Providers\Filters\Classes\Filter */ $oItem)
		{
			$sItem = $oItem->serializeToJson();
			$sItem = \chunk_split(\base64_encode($sItem), 74, "\n");

			$aParts[] = $sItem;
		}

		return \implode("\n", $aParts);
	}

	/**
	 * @param string $sFileString
	 *
	 * @return array
	 */
	private function fileStringToCollection($sFileString)
	{
		if (!empty($sFileString))
		{

		}

		return array();
	}
}
