<?php

namespace RainLoop\Providers\Identities;

use RainLoop\Exceptions\Exception;
use RainLoop\Model\Account;
use RainLoop\Model\Identity;

class TestIdentities implements IIdentities
{
	/**
	 * @param Account $account
	 * @return Identity[]
	 */
	public function GetIdentities(Account $account): array
	{
		$oIdentity = new Identity('', $account->Email());
		$oIdentity->SetName("Test Name");

		return [$oIdentity];
	}

	/**
	 * @param Account $account
	 * @param Identity[] $identities
	 *
	 * @return void
	 * @throws Exception
	 */
	public function SetIdentities(Account $account, array $identities)
	{
		throw new Exception("Not implemented");
	}

	/**
	 * @return bool
	 */
	public function SupportsStore(): bool
	{
		return false;
	}

	public function Name(): string
	{
		return "Test";
	}
}