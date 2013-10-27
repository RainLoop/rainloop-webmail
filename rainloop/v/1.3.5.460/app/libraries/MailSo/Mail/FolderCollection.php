<?php

namespace MailSo\Mail;

/**
 * @category MailSo
 * @package Mail
 */
class FolderCollection extends \MailSo\Base\Collection
{
	/**
	 * @var string
	 */
	private $sNamespace;

	/**
	 * @var string
	 */
	public $FoldersHash;

	/**
	 * @var bool
	 */
	public $IsThreadsSupported;

	/**
	 * @var array
	 */
	public $SystemFolders;

	/**
	 * @access protected
	 */
	protected function __construct()
	{
		parent::__construct();

		$this->sNamespace = '';
		$this->FoldersHash = '';
		$this->SystemFolders = array();
		$this->IsThreadsSupported = false;
	}

	/**
	 * @return \MailSo\Mail\FolderCollection
	 */
	public static function NewInstance()
	{
		return new self();
	}

	/**
	 * @param string $sFullNameRaw
	 *
	 * @return \MailSo\Mail\Folder|null
	 */
	public function &GetByFullNameRaw($sFullNameRaw)
	{
		$mResult = null;
		foreach ($this->aItems as /* @var $oFolder \MailSo\Mail\Folder */ $oFolder)
		{
			if ($oFolder->FullNameRaw() === $sFullNameRaw)
			{
				$mResult = $oFolder;
				break;
			}
		}

		return $mResult;
	}

	/**
	 * @return string
	 */
	public function GetNamespace()
	{
		return $this->sNamespace;
	}

	/**
	 * @param string $sNamespace
	 *
	 * @return \MailSo\Mail\FolderCollection
	 */
	public function SetNamespace($sNamespace)
	{
		$this->sNamespace = $sNamespace;

		return $this;
	}
	
	/**
	 * @param array $aUnsortedMailFolders
	 *
	 * @return void
	 */
	public function InitByUnsortedMailFolderArray($aUnsortedMailFolders)
	{
		$this->Clear();

		$aSortedByLenImapFolders = array();
		foreach ($aUnsortedMailFolders as /* @var $oMailFolder \MailSo\Mail\Folder */ &$oMailFolder)
		{
			$aSortedByLenImapFolders[$oMailFolder->FullNameRaw()] =& $oMailFolder;
			unset($oMailFolder);
		}
		unset($aUnsortedMailFolders);

		$aAddedFolders = array();
		foreach ($aSortedByLenImapFolders as /* @var $oMailFolder \MailSo\Mail\Folder */ $oMailFolder)
		{
			$sDelimiter = $oMailFolder->Delimiter();
			$aFolderExplode = \explode($sDelimiter, $oMailFolder->FullNameRaw());

			if (1 < \count($aFolderExplode))
			{
				\array_pop($aFolderExplode);

				$sNonExistenFolderFullNameRaw = '';
				foreach ($aFolderExplode as $sFolderExplodeItem)
				{
					$sNonExistenFolderFullNameRaw .= (0 < \strlen($sNonExistenFolderFullNameRaw))
						? $sDelimiter.$sFolderExplodeItem : $sFolderExplodeItem;

					if (!isset($aSortedByLenImapFolders[$sNonExistenFolderFullNameRaw]))
					{
						$aAddedFolders[$sNonExistenFolderFullNameRaw] =
							Folder::NewNonExistenInstance($sNonExistenFolderFullNameRaw, $sDelimiter);
					}
				}
			}
		}

		$aSortedByLenImapFolders = \array_merge($aSortedByLenImapFolders, $aAddedFolders);
		unset($aAddedFolders);

		\uasort($aSortedByLenImapFolders, function ($oFolderA, $oFolderB) {
			return \strnatcmp($oFolderA->FullNameRaw(), $oFolderB->FullNameRaw());
		});

		foreach ($aSortedByLenImapFolders as /* @var $oMailFolder \MailSo\Mail\Folder */ &$oMailFolder)
		{
			$this->AddWithPositionSearch($oMailFolder);
			unset($oMailFolder);
		}

		unset($aSortedByLenImapFolders);
	}

	/**
	 * @param \MailSo\Mail\Folder $oMailFolder
	 *
	 * @return bool
	 */
	public function AddWithPositionSearch($oMailFolder)
	{
		$oItemFolder = null;
		$bIsAdded = false;
		$aList =& $this->GetAsArray();

		foreach ($aList as /* @var $oItemFolder \MailSo\Mail\Folder */ $oItemFolder)
		{
			if ($oMailFolder instanceof \MailSo\Mail\Folder &&
				0 === \strpos($oMailFolder->FullNameRaw(), $oItemFolder->FullNameRaw().$oItemFolder->Delimiter()))
			{
				if ($oItemFolder->SubFolders(true)->AddWithPositionSearch($oMailFolder))
				{
					$bIsAdded = true;
				}

				break;
			}
		}

		if (!$bIsAdded && $oMailFolder instanceof \MailSo\Mail\Folder)
		{
			$bIsAdded = true;
			$this->Add($oMailFolder);
		}

		return $bIsAdded;
	}

	/**
	 * @param callable $fCallback
	 *
	 * @return void
	 */
	public function SortByCallback($fCallback)
	{
		if (\is_callable($fCallback))
		{
			$aList =& $this->GetAsArray();

			\usort($aList, $fCallback);

			foreach ($aList as &$oItemFolder)
			{
				if ($oItemFolder->HasSubFolders())
				{
					$oItemFolder->SubFolders()->SortByCallback($fCallback);
				}
			}
		}
	}
}
