<?php

$lang = (empty($_GET['lang']) || !preg_match('/^[a-z]{2}(-[A-Z]{2})?$/D',$_GET['lang'])) ? '' : $_GET['lang'];

function toJSON($data)
{
	foreach ($data as $section => $values) {
		if (is_array($values)) {
			foreach ($values as $key => $value) {
				$data[$section][$key] = preg_replace('/\\R/', "\n", trim($value));
			}
		} else if ('LANG_DIR' === $section) {
			$data[$section] = $values;
		}
	}
	return str_replace('    ', "\t", json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

if ('POST' === $_SERVER['REQUEST_METHOD']) {
	try {
		$file = tempnam(sys_get_temp_dir(), '');
		$zip = new ZipArchive();
		if (!$zip->open($file, ZIPARCHIVE::CREATE)) {
			exit("Failed to create zip");
		}
		if (!$lang) {
			$lang = (empty($_POST['lang']) || !preg_match('/^[a-z]{2}(-[A-Z]{2})?$/D',$_POST['lang']))
				? 'new' : $_POST['lang'];
		}
		$zip->addFromString("{$lang}/admin.json", toJSON($_POST['admin']));
		$zip->addFromString("{$lang}/user.json", toJSON($_POST['user']));
		$zip->close();
		header('Content-Type: application/zip');
		header('Content-disposition: attachment; filename="snappymail-'.$lang.'.zip"');
		header('Content-Length: ' . filesize($file));
		readfile($file);
	} catch (\Throwable $e) {
		echo $e->getMessage();
	}
	unlink($file);
	exit;
}

// /home/rainloop/public_html/snappymail/v/0.0.0/static/js
$_ENV['SNAPPYMAIL_INCLUDE_AS_API'] = true;
require 'demo/index.php';

$root = APP_VERSION_ROOT_PATH . 'app/localization';

$en = [
	'user' => '',
	'admin' => '',
//	'static' => '',
];
foreach ($en as $name => $data) {
	$en[$name] = json_decode(file_get_contents("{$root}/en/{$name}.json"), true);
}

$languages = ['<option></option>'];
foreach (glob("{$root}/*", GLOB_ONLYDIR) as $dir) {
	$name = basename($dir);
	if ('en' !== $name) {
		$languages[] = "<option value='{$name}'".($lang == $name ? ' selected' : '').">{$name}</option>";
	}
}

//print_r($languages);

echo '<!DOCTYPE html>
<html><head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width">
	<title>Translate</title>
	<style>
	table {
		width:100%;
	}
	th {
		background-color:#000;
		color:#fff;
		font-size:2em;
		width:50%;
	}
	tr.section td {
		background-color:#ddd;
	}
	tr:not(.section) td:first-child {
		padding-left:1em;
	}
	tr.untranslated {
		background:#FC5;
	}
	textarea {
		width: 50vw;
	}
	#untranslated:checked + * tbody tr:not(.section):not(.untranslated):not(.file) {
		display:none;
	}
	</style>
</head><body>
<h1>Translate: <select onchange="location.href=\'?lang=\'+this.value">'.implode('',$languages).'</select></h1>
<form action="" method="post">
<input type="checkbox" id="untranslated"> Show untranslated only
<table>
<thead>
	<tr>
		<th>en</th>
		<th>'.($lang ?: '<input name="lang" required="" pattern="[a-z]{2}(-[A-Z]{2})?">').'</th>
	</tr>
</thead>';
foreach ($en as $name => $sections) {
	echo '<tbody><tr class="file"><th colspan="3">'.$name.'</th></tr>';
	$data = $sections;
	if ($lang && is_readable("{$root}/{$lang}/{$name}.json")) {
		$data = json_decode(file_get_contents("{$root}/{$lang}/{$name}.json"), true);
	}
	foreach ($sections as $section => $values) {
		if (is_array($values)) {
			echo '<tr class="section"><td colspan="3">'.$section.'</td><td></td></tr>';
			foreach ($values as $key => $value) {
				echo '<tr'.((empty($data[$section][$key]) || $value == $data[$section][$key]) ? ' class="untranslated"':'').'>';
//				echo '<td>'.$section.'/'.$key.'</td>';
				echo '<td>'.htmlspecialchars($value).'</td>';
				echo '<td><textarea name="'."{$name}[{$section}][{$key}]".'">'.htmlspecialchars($data[$section][$key] ?? '').'</textarea></td>';
				echo '</tr>';
			}
		} else if ('LANG_DIR' === $section) {
			echo '<tr>';
			echo '<td>Text direction</td>';
			echo '<td><select name="'."{$name}[{$section}]".'">
				<option value="ltr">Left to right</option>
				<option value="rtl"'.('rtl' === ($data[$section] ?? '') ? ' selected=""' : '').'>Right to left</option>
			</select></td>';
			echo '</tr>';
		}
	}
	echo '</tbody>';
}
echo '<tfoot><tr><td></td><td><button>Save</button></td></tr></tfoot></table>';
echo '</form></body></html>';

/*
<textarea onInput="this.parentNode.dataset.value = this.value">
*, *::before, *::after {
	box-sizing: border-box;
}
td + td {
	box-shadow: 4px 4px 0px #000;
	display: inline-grid;
	vertical-align: top;
	align-items: center;
	position: relative;
	border: solid 1px;
	padding: .5em;
	margin: 5px;
	align-items: stretch;
}
td + td::after, textarea {
	grid-area: 2 / 1;
}
td + td::after, textarea {
	width: auto;
	min-width: 1em;
	grid-area: 1 / 2;
	font: inherit;
	padding: 0.25em;
	margin: 0;
	resize: none;
	background: none;
	appearance: none;
	border: none;
}
td + td::after {
	content: attr(data-value) ' ';
	visibility: hidden;
	white-space: pre-wrap;
}
td + td:focus-within {
	outline: solid 1px blue;
	box-shadow: 4px 4px 0px blue;
}
textarea:focus {
	outline: none;
}
*/
