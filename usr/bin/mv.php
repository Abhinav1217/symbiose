<?php
$authManager = $this->managers()->getManagerOf('authorization');
$fileManager = $this->managers()->getManagerOf('file');
$params = $this->cmd->params();
$optionsNames = array_keys($this->cmd->options());

if (count($params) == 0) {
	throw new \InvalidArgumentException('No source file specified');
}
if (count($params) == 1) {
	throw new \InvalidArgumentException('No destination file specified');
}

$source = $this->terminal->absoluteLocation($params[0]);
$dest = $this->terminal->absoluteLocation($params[1]);

//Authorizations
$processAuths = $authManager->getByPid($this->cmd['id']);
$this->guardian->controlArgAuth('file.write', $source, $processAuths);
$this->guardian->controlArgAuth('file.write', $dest, $processAuths);

$fileManager->move($source, $dest);