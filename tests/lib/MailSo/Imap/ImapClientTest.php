<?php

namespace MailSoTests;

class ImapClientTest extends \PHPUnit_Framework_TestCase
{
	const CRLF = "\r\n";

	public function testNamespace()
	{
		$rConnect = \MailSo\Base\StreamWrappers\Test::CreateStream(
			'* NAMESPACE (("" "/")) NIL NIL'.self::CRLF.
			'TAG1 OK Success'.self::CRLF
		);

		$oImapClient = \MailSo\Imap\ImapClient::NewInstance()->TestSetValues($rConnect, array('NAMESPACE'));
		$oResult = $oImapClient->GetNamespace();

		$this->assertTrue($oResult instanceof \MailSo\Imap\NamespaceResult);
	}

	public function testQuota()
	{
		$rConnect = \MailSo\Base\StreamWrappers\Test::CreateStream(
			'* QUOTAROOT "INBOX" ""'.self::CRLF.
			'* QUOTA "" (STORAGE 55163 10511217)'.self::CRLF.
			'TAG1 OK Success'.self::CRLF
		);

		$oImapClient = \MailSo\Imap\ImapClient::NewInstance()->TestSetValues($rConnect, array('QUOTA'));

		$aResult = $oImapClient->Quota();
		$this->assertTrue(is_array($aResult));
		$this->assertEquals(4, count($aResult));
		$this->assertEquals(55163, $aResult[0]);
		$this->assertEquals(10511217, $aResult[1]);
	}

	public function testFolderList()
	{
		$rConnect = \MailSo\Base\StreamWrappers\Test::CreateStream(
'* LIST (\Noselect) "/" 0'.self::CRLF.
'* LIST (\UnMarked) "/" 0/1'.self::CRLF.
'* LIST (\Noselect) "/" 1'.self::CRLF.
'* LIST (\Noselect) "/" 1/2'.self::CRLF.
'* LIST (\UnMarked) "/" 1/2/3'.self::CRLF.
'* LIST (\UnMarked \Inbox) "/" INBOX'.self::CRLF.
'* LIST (\UnMarked) "/" "INBOX/XXX XXX"'.self::CRLF.
'* LIST (\UnMarked) "/" &-BT,MAQBDoEM'.self::CRLF.
'* LIST (\UnMarked) "NIL" NILDelimiteFolder'.self::CRLF.
'* LIST (\UnMarked) "" EmptyDelimiteFolder'.self::CRLF.
'TAG1 OK Success'.self::CRLF
		);

		$oImapClient = \MailSo\Imap\ImapClient::NewInstance()->TestSetValues($rConnect);

		$aResult = $oImapClient->FolderList();
		$this->assertTrue(is_array($aResult) && 0 < count($aResult));
		$this->assertTrue($aResult[0] instanceof \MailSo\Imap\Folder);

		$this->assertEquals('0', $aResult[0]->FullNameRaw());
		$this->assertEquals('0', $aResult[0]->NameRaw());
		$this->assertEquals('0/1', $aResult[1]->FullNameRaw());
		$this->assertEquals('1', $aResult[1]->NameRaw());
		$this->assertEquals('1', $aResult[2]->FullNameRaw());
		$this->assertEquals('1/2', $aResult[3]->FullNameRaw());
		$this->assertEquals('1/2/3', $aResult[4]->FullNameRaw());
		$this->assertEquals('3', $aResult[4]->NameRaw());
		$this->assertEquals('INBOX', $aResult[5]->FullNameRaw());
		$this->assertEquals('INBOX/XXX XXX', $aResult[6]->FullNameRaw());
		$this->assertEquals('XXX XXX', $aResult[6]->NameRaw());
		$this->assertEquals('&-BT,MAQBDoEM', $aResult[7]->FullNameRaw());

		$this->assertTrue($aResult[5] instanceof \MailSo\Imap\Folder);
		$this->assertEquals('/', $aResult[5]->Delimiter());
		$this->assertEquals(2, count($aResult[5]->FlagsLowerCase()));
		$this->assertTrue(in_array('\inbox', $aResult[5]->FlagsLowerCase()));

		$this->assertTrue($aResult[8] instanceof \MailSo\Imap\Folder);
		$this->assertEquals('.', $aResult[8]->Delimiter());

		$this->assertTrue($aResult[9] instanceof \MailSo\Imap\Folder);
		$this->assertEquals('.', $aResult[8]->Delimiter());
	}
}
