<?php

namespace RainLoop\Model;

class Template implements \JsonSerializable
{
	/**
	 * @var string
	 */
	private $sId;

	/**
	 * @var string
	 */
	private $sName;

	/**
	 * @var string
	 */
	private $sBody;

	/**
	 * @var bool
	 */
	private $bPopulateAlways;

	function __construct(string $sId = '', string $sName = '', string $sBody = '')
	{
		$this->sId = $sId;
		$this->sName = $sName;
		$this->sBody = $sBody;
		$this->bPopulateAlways = false;
	}

	public function Id() : string
	{
		return $this->sId;
	}

	public function Name() : string
	{
		return $this->sName;
	}

	public function Body() : string
	{
		return $this->sBody;
	}

	public function SetPopulateAlways(bool $bPopulateAlways)
	{
		$this->bPopulateAlways = $bPopulateAlways;
	}

	public function FromJSON(array $aData, bool $bAjax = false) : bool
	{
		if (isset($aData['ID'], $aData['Name'], $aData['Body']))
		{
			$this->sId = $aData['ID'];
			$this->sName = $aData['Name'];
			$this->sBody = $aData['Body'];

			return true;
		}

		return false;
	}

	public function ToSimpleJSON() : array
	{
		return array(
			'ID' => $this->Id(),
			'Name' => $this->Name(),
			'Body' => $this->Body()
		);
	}

	public function jsonSerialize()
	{
		$sBody = $this->Body();
		$bPopulated = true;
		if ($bPopulated && !$this->bPopulateAlways) {
			if (1024 * 5 < \strlen($sBody) || true) {
				$bPopulated = false;
				$sBody = '';
			}
		}
		return array(
//			'@Object' => 'Object/Template',
			'ID' => $this->Id(),
			'Name' => $this->Name(),
			'Body' => $sBody,
			'Populated' => $bPopulated
		);
	}

	public function GenerateID() : bool
	{
		return $this->sId = \MailSo\Base\Utils::Md5Rand();
	}

	public function Validate() : bool
	{
		return 0 < \strlen($this->sBody);
	}
}
