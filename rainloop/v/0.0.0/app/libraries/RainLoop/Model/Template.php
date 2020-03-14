<?php

namespace RainLoop\Model;

class Template
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

	protected function __construct($sId = '', $sName = '', $sBody = '')
	{
		$this->sId = $sId;
		$this->sName = $sName;
		$this->sBody = $sBody;
		$this->bPopulateAlways = false;
	}

	/**
	 *
	 * @return \RainLoop\Model\Template
	 */
	public static function NewInstance(string $sId = '', string $sName = '', string $sBody = '')
	{
		return new self($sId, $sBody);
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
		$this->bPopulateAlways = !!$bPopulateAlways;
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

	public function ToSimpleJSON(bool $bAjax = false) : array
	{
		$sBody = $this->Body();
		$bPopulated = true;

		if ($bAjax && $bPopulated && !$this->bPopulateAlways)
		{
			if (1024 * 5 < \strlen($sBody) || true)
			{
				$bPopulated = false;
				$sBody = '';
			}
		}

		$aResult = array(
			'ID' => $this->Id(),
			'Name' => $this->Name(),
			'Body' => $sBody
		);

		if ($bAjax)
		{
			$aResult['Populated'] = $bPopulated;
		}

		return $aResult;
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
