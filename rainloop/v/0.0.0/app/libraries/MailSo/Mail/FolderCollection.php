<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2014 Usenko Timur
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

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
	public $Namespace;

	/**
	 * @var string
	 */
	public $FoldersHash;

	/**
	 * @var bool
	 */
	public $IsThreadsSupported;

	/**
	 * @var bool
	 */
	public $Optimized;

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

		$this->Namespace = '';
		$this->FoldersHash = '';
		$this->SystemFolders = array();
		$this->IsThreadsSupported = false;
		$this->Optimized = false;
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
	public function GetByFullNameRaw($sFullNameRaw)
	{
		$mResult = null;
		foreach ($this->aItems as /* @var $oFolder \MailSo\Mail\Folder */ $oFolder)
		{
			if ($oFolder->FullNameRaw() === $sFullNameRaw)
			{
				$mResult = $oFolder;
				break;
			}
			else if ($oFolder->HasSubFolders())
			{
				$mResult = $oFolder->SubFolders(true)->GetByFullNameRaw($sFullNameRaw);
				if ($mResult)
				{
					break;
				}
				else
				{
					$mResult = null;
				}
			}
		}

		return $mResult;
	}

	/**
	 * @return int
	 */
	public function CountRec()
	{
		$iResult = $this->Count();
		foreach ($this->aItems as /* @var $oFolder \MailSo\Mail\Folder */ $oFolder)
		{
			if ($oFolder)
			{
				$oSub = $oFolder->SubFolders();
				$iResult += $oSub ? $oSub->CountRec() : 0;
			}
		}

		return $iResult;
	}

	/**
	 * @return string
	 */
	public function GetNamespace()
	{
		return $this->Namespace;
	}

	/**
	 * @return string
	 */
	public function FindDelimiter()
	{
		$sDelimiter = '/';

		$oFolder = $this->GetByFullNameRaw('INBOX');
		if (!$oFolder)
		{
			$oFolder = $this->GetByIndex(0);
		}

		if ($oFolder)
		{
			$sDelimiter = $oFolder->Delimiter();
		}

		return $sDelimiter;
	}

	/**
	 * @param string $sNamespace
	 *
	 * @return \MailSo\Mail\FolderCollection
	 */
	public function SetNamespace($sNamespace)
	{
		$this->Namespace = $sNamespace;

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
						try
						{
							$aAddedFolders[$sNonExistenFolderFullNameRaw] =
								Folder::NewNonExistenInstance($sNonExistenFolderFullNameRaw, $sDelimiter);
						}
						catch (\Exception $oExc)
						{
							unset($oExc);
						}
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
