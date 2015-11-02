<?php

namespace SabreForRainLoop\DAV\Auth\Backend;

use SabreForRainLoop\DAV;

/**
 * This is an authentication backend that uses a file to manage passwords.
 *
 * The backend file must conform to Apache's htdigest format
 *
 * @copyright Copyright (C) 2007-2013 fruux GmbH (https://fruux.com/).
 * @author Evert Pot (http://evertpot.com/)
 * @license http://code.google.com/p/sabredav/wiki/License Modified BSD License
 */
class File extends AbstractDigest {

    /**
     * List of users
     *
     * @var array
     */
    protected $users = array();

    /**
     * Creates the backend object.
     *
     * If the filename argument is passed in, it will parse out the specified file fist.
     *
     * @param string|null $filename
     */
    public function __construct($filename=null) {

        if (!is_null($filename))
            $this->loadFile($filename);

    }

    /**
     * Loads an htdigest-formatted file. This method can be called multiple times if
     * more than 1 file is used.
     *
     * @param string $filename
     * @return void
     */
    public function loadFile($filename) {

        foreach(file($filename,FILE_IGNORE_NEW_LINES) as $line) {

            if (substr_count($line, ":") !== 2)
                throw new DAV\Exception('Malformed htdigest file. Every line should contain 2 colons');

            list($username,$realm,$A1) = explode(':',$line);

            if (!preg_match('/^[a-zA-Z0-9]{32}$/', $A1))
                throw new DAV\Exception('Malformed htdigest file. Invalid md5 hash');

            $this->users[$realm . ':' . $username] = $A1;

        }

    }

    /**
     * Returns a users' information
     *
     * @param string $realm
     * @param string $username
     * @return string
     */
    public function getDigestHash($realm, $username) {

        return isset($this->users[$realm . ':' . $username])?$this->users[$realm . ':' . $username]:false;

    }

}
