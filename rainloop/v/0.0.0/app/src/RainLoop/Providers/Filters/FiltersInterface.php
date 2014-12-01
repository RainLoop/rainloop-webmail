<?php

namespace RainLoop\Providers\Filters;

interface FiltersInterface
{
	/**
	 * @return array
	 */
	public function Load();

	/**
	 * @param array $aFilters
	 *
	 * @return bool
	 */
	public function Save($aFilters);
}
