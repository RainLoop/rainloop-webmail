<?php

namespace RainLoop\Providers\Contacts\Classes;

class Db
{
	/**
	 * @return int
	 */
	static public function Version()
	{
		return 1;
	}

	/**
	 * @return array
	 */
	static public function Strucure()
	{
		return array(
			'rlContactsUsers' => array(
				'IdUser'		=> 'INTEGER PRIMARY KEY',
				'Email'			=> 'TEXT'
			),
			'rlContactsItems' => array(
				'IdContact'		=> 'INTEGER PRIMARY KEY',
				'IdUser'		=> 'INTEGER',
				'Type'			=> 'INTEGER',
				'Frec'			=> 'INTEGER',
				'ImageHash'		=> 'TEXT',
				'ListName'		=> 'TEXT',
				'Name'			=> 'TEXT',
				'Emails'		=> 'TEXT',
				'Data'			=> 'TEXT'
			)
		);
	}
}
