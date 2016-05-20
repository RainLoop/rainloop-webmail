<?php

namespace MailSoTests;

class HtmlUtilsTest extends \PHPUnit_Framework_TestCase
{
	public function testCommon()
    {
		$this->assertTrue(true);
		$this->assertTrue(class_exists('\\RainLoop\\Api'));
		$this->assertTrue(class_exists('\\MailSo\\Base\\HtmlUtils'));
	}

	public function testClearHtml()
    {
		$i = 0;
		while (++$i < 3)
		{
			$this->assertEquals(file_get_contents(TEST_DATA_FOLDER."/html/{$i}-ok.html"),
				\MailSo\Base\HtmlUtils::ClearHtmlSimple(file_get_contents(TEST_DATA_FOLDER."/html/{$i}.html"), false, false, false));
		}
	}
}
