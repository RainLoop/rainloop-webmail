<?php

class CKEditorPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME = 'CKEditor',
		VERSION = '2.1',
		RELEASE = '2021-04-19',
		REQUIRED = '2.5.0',
		DESCRIPTION = 'Use CKEditor instead of Squire as WYSIWYG';

	public function Init() : void
	{
		$path = APP_VERSION_ROOT_PATH . 'static/ckeditor';

		// Apache AH00037: Symbolic link not allowed or link target not accessible
		// That's why we clone the source
		if (!\is_dir($path)/* && !\is_link($path)*/) {
			// $active = \symlink(__DIR__ . '/src', $path);
			\mkdir($path, 0755);
			$iterator = new \RecursiveIteratorIterator(
				new \RecursiveDirectoryIterator(__DIR__ . '/src', \RecursiveDirectoryIterator::SKIP_DOTS),
				\RecursiveIteratorIterator::SELF_FIRST
			);
			foreach ($iterator as $item) {
				if ($item->isDir()) {
					\mkdir($path . DIRECTORY_SEPARATOR . $iterator->getSubPathName());
				} else {
					\copy($item, $path . DIRECTORY_SEPARATOR . $iterator->getSubPathName());
				}
			}
		}

		if (\is_file("{$path}/ckeditor.js")) {
			$this->addCss('ckeditor.less');
			$this->addJs('ckeditor.js');
		}
	}
}
