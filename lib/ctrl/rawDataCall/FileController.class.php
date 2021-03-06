<?php
namespace lib\ctrl\rawDataCall;

use \Exception;
use \RuntimeException;
use \ZipArchive;

/**
 * Provides access to the system's files.
 */
class FileController extends \lib\RawBackController {
	public function executeIndex(\lib\HTTPRequest $request) {
		$fileManager = $this->managers()->getManagerOf('file');
		$shareManager = $this->managers()->getManagerOf('sharedFile');
		$authManager = $this->managers()->getManagerOf('authorization');
		$user = $this->app()->user();

		if (!$request->getExists('path')) {
			$this->app->httpResponse()->addHeader('HTTP/1.0 400 Bad Request');
			throw new RuntimeException('No file specified');
		}

		$filePath = $fileManager->beautifyPath($request->getData('path'));

		//URL parameters
		$options = array(
			'download' => ($request->getExists('dl') && (int) $request->getData('dl')),
			'shareKey' => ($request->getExists('key')) ? $request->getData('key') : null
		);

		//Authorizations control
		$userAuths = array();

		if ($user->isLogged()) { //Get user's authorizations
			$userAuths = $authManager->getByUserId($user->id());
		}

		$sharedAccess = false;
		if (!empty($options['shareKey'])) {
			$sharedFile = $shareManager->getByKey($options['shareKey'], $fileManager->toInternalPath($filePath));

			if (!empty($sharedFile)) {
				$sharedAccess = true;
			}
		}

		if (!$sharedAccess) {
			try {
				$this->guardian->controlArgAuth('file.read', $filePath, $userAuths);
			} catch(Exception $e) {
				$this->app->httpResponse()->addHeader('HTTP/1.0 403 Forbidden');
				throw $e;
			}
		}

		//Check if the file exists
		if (!$fileManager->exists($filePath)) {
			$this->app->httpResponse()->addHeader('HTTP/1.0 404 Not Found');
			throw new RuntimeException('The specified file "'.$filePath.'" doesn\'t exist');
		}

		if ($fileManager->isDir($filePath) && !$options['download']) {
			$this->app->httpResponse()->addHeader('HTTP/1.0 406 Not Acceptable');
			throw new RuntimeException('The specified file "'.$filePath.'" is a directory');
		}

		$outputFile = $filePath;
		$filename = $fileManager->basename($filePath);

		//If the file is a directory, zip it
		if ($fileManager->isDir($filePath) && $options['download']) {
			if (strpos($filePath, '/home/') !== 0) {
				$this->app->httpResponse()->addHeader('HTTP/1.0 403 Forbidden');
				throw new RuntimeException('Downloading files which are not in your home directory is not allowed');
			}

			if (!class_exists('\ZipArchive')) {
				$this->app->httpResponse()->addHeader('HTTP/1.0 501 Not Implemented');
				throw new RuntimeException('Downloading directories is not available on this system');
			}

			$filesInDir = $fileManager->readDir($filePath, true); //Read recursively the directory
			$tmpFilePath = $fileManager->tmpfile();
			$zip = new ZipArchive();
			$zip->open($fileManager->toInternalPath($tmpFilePath), ZipArchive::CREATE);

			foreach($filesInDir as $filename => $filepath) {
				if ($fileManager->isDir($filepath)) {
					$added = $zip->addEmptyDir($filename);
				} else {
					$added = $zip->addFile($fileManager->toInternalPath($filepath), $filename);
				}

				if ($added === false) {
					$this->app->httpResponse()->addHeader('HTTP/1.0 500 Internal Server Error');
					throw new RuntimeException('Unable to add "'.$filepath.'" to zip file');
				}
			}

			$zip->close();

			$outputFile = $tmpFilePath;
			$filename = $fileManager->basename($filePath) . '.zip';
		}

		//Send response
		$httpResponse = $this->app->httpResponse();
		$httpResponse->addHeader('Content-Type: '.$fileManager->mimetype($outputFile));

		if ($options['download']) {
			$httpResponse->addHeader('Content-Description: File Transfer');
			$httpResponse->addHeader('Content-Disposition: attachment; filename="' . $filename . '"');
			$httpResponse->addHeader('Content-Transfer-Encoding: binary');
		}

		$outputMtime = $fileManager->mtime($outputFile);
		if (isset($_SERVER['HTTP_IF_MODIFIED_SINCE']) && strtotime($_SERVER['HTTP_IF_MODIFIED_SINCE']) >= $outputMtime) {
			$httpResponse->addHeader('HTTP/1.0 304 Not Modified');
			return;
		}

		$httpResponse->addHeader('Last-Modified: ' . gmdate('D, d M Y H:i:s T', $outputMtime));

		$out = $fileManager->read($outputFile);
		$httpResponse->addHeader('Content-Length: ' . strlen($out));

		$this->responseContent->setValue($out);
	}
}