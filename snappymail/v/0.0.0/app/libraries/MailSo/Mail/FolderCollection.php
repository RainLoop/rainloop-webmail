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
	 * @var bool
	 */
	public $Optimized = false;

	public $TotalCount = 0;

	public function append($oFolder, bool $bToTop = false) : void
	{
		assert($oFolder instanceof Folder);
		parent::append($oFolder, $bToTop);
	}

	public function GetByFullName(string $sFullName) : ?Folder
	{
		foreach ($this as $oFolder) {
			if ($oFolder->FullName() === $sFullName) {
				return $oFolder;
			}

			if ($oFolder->HasSubFolders()) {
				$mResult = $oFolder->SubFolders(true)->GetByFullName($sFullName);
				if ($mResult) {
					return $mResult;
				}
			}
		}

		return null;
	}

	public function FindDelimiter() : string
	{
		$sDelimiter = '/';

		$oFolder = $this->GetByFullName('INBOX');
		if (!$oFolder && isset($this[0]))
		{
			$oFolder = $this[0];
		}

		return $oFolder ? $oFolder->Delimiter() : '/';
	}

	public function AddWithPositionSearch(Folder $oMailFolder) : void
	{
		foreach ($this as $oItemFolder)
		{
			if (\str_starts_with($oMailFolder->FullName(), $oItemFolder->FullName().$oItemFolder->Delimiter()))
			{
				$oItemFolder->SubFolders(true)->AddWithPositionSearch($oMailFolder);
				return;
			}
		}

		$this->append($oMailFolder);
	}
}
