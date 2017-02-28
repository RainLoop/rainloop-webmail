<?php
/**
 * Copyright 2014 Facebook, Inc.
 *
 * You are hereby granted a non-exclusive, worldwide, royalty-free license to
 * use, copy, modify, and distribute this software in source code or binary
 * form for use in connection with the web services and APIs provided by
 * Facebook.
 *
 * As with any software that integrates with the Facebook platform, your use
 * of this software is subject to the Facebook Developer Principles and
 * Policies [http://developers.facebook.com/policy/]. This copyright notice
 * shall be included in all copies or substantial portions of the software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 *
 */
namespace Facebook\FileUpload;

use Facebook\Exceptions\FacebookSDKException;

/**
 * Class FacebookFile
 *
 * @package Facebook
 */
class FacebookFile
{
    /**
     * @var string The path to the file on the system.
     */
    protected $path;

    /**
     * @var resource The stream pointing to the file.
     */
    protected $stream;

    /**
     * Creates a new FacebookFile entity.
     *
     * @param string $filePath
     *
     * @throws FacebookSDKException
     */
    public function __construct($filePath)
    {
        $this->path = $filePath;
        $this->open();
    }

    /**
     * Closes the stream when destructed.
     */
    public function __destruct()
    {
        $this->close();
    }

    /**
     * Opens a stream for the file.
     *
     * @throws FacebookSDKException
     */
    public function open()
    {
        if (!$this->isRemoteFile($this->path) && !is_readable($this->path)) {
            throw new FacebookSDKException('Failed to create FacebookFile entity. Unable to read resource: ' . $this->path . '.');
        }

        $this->stream = fopen($this->path, 'r');

        if (!$this->stream) {
            throw new FacebookSDKException('Failed to create FacebookFile entity. Unable to open resource: ' . $this->path . '.');
        }
    }

    /**
     * Stops the file stream.
     */
    public function close()
    {
        if (is_resource($this->stream)) {
            fclose($this->stream);
        }
    }

    /**
     * Return the contents of the file.
     *
     * @return string
     */
    public function getContents()
    {
        return stream_get_contents($this->stream);
    }

    /**
     * Return the name of the file.
     *
     * @return string
     */
    public function getFileName()
    {
        return basename($this->path);
    }

    /**
     * Return the mimetype of the file.
     *
     * @return string
     */
    public function getMimetype()
    {
        return Mimetypes::getInstance()->fromFilename($this->path) ?: 'text/plain';
    }

    /**
     * Returns true if the path to the file is remote.
     *
     * @param string $pathToFile
     *
     * @return boolean
     */
    protected function isRemoteFile($pathToFile)
    {
        return preg_match('/^(https?|ftp):\/\/.*/', $pathToFile) === 1;
    }
}
