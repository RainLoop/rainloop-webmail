<?php

namespace RainLoop\Providers\Identities;

use RainLoop\Model\Account;
use RainLoop\Model\Identity;

interface IIdentities
{
	/**
	 * @param Account $account
	 *
	 * @return Identity[]
	 */
	public function GetIdentities(Account $account): array;

	/**
	 * @param Account $account
	 * @param Identity[] $identities
	 *
	 * @return void
	 */
	public function SetIdentities(Account $account, array $identities): void;

	/**
	 * @return bool
	 */
	public function SupportsStore(): bool;

	/**
	 * @return string
	 */
	public function Name(): string;
}
