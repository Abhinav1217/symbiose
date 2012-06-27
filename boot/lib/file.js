/**
 * Cr�e une instance de Webos.File.
 * @param {Object} data Les donn�es sur le fichier.
 * @since 1.0 alpha 1
 * @constructor
 */
Webos.File = function WFile(data) {
	data.path = Webos.File.cleanPath(data.path); //On nettoie le chemin re�u
	if (!data.dirname) { //On d�finit automatiquement le dossier p�rent si non pr�sent
		data.dirname = data.path.replace(/\/[^\/]*\/?$/, '');
	}
	if (!data.realpath) { //On d�finit automatiquement le chemin r�el si non pr�sent
		data.realpath = 'sbin/filecall.php?file='+data.path;
	}
	if (!data.basename) { //On d�finit automatiquement le nom du fichier si non pr�sent
		data.basename = data.path.replace(/^.*[\/\\]/g, '');
	}
	
	Webos.Model.call(this, data); //On appelle la classe parente
};
Webos.File.prototype = {
	/**
	 * Charge les informations sur les fichiers.
	 * @param {Webos.Callback} callback La fonction de rappel qui sera appel�e une fois que les informations seront charg�es.
	 */
	load: function(callback) {
		var that = this;
		callback = Webos.Callback.toCallback(callback);
		
		Webos.File.clearCache(that.get('path'));
		Webos.File.load(that.get('path'), new Webos.Callback(function(file) {
			var updatedData = {};
			for (var key in file.data()) {
				if (that.get(key) !== file.data()[key]) {
					updatedData[key] = file.data()[key];
				}
			}
			that.hydrate(updatedData);
			callback.success(that);
			for (var key in updatedData) {
				that.notify('update', { key: key, value: updatedData[key] });
			}
		}, function(response) {
			callback.error(response, that);
		}));
	},
	/**
	 * Renomme le fichier.
	 * @param {String} newName Le nouveau nom.
	 * @param {Webos.Callback} callback La fonction de rappel qui sera appel�e une fois que le fichier sera renomm�.
	 */
	rename: function(newName, callback) {
		var that = this;
		callback = Webos.Callback.toCallback(callback);
		
		new Webos.ServerCall({
			'class': 'FileController',
			method: 'rename',
			arguments: {
				file: that.get('path'),
				newName: newName
			}
		}).load([function() {
			that.hydrate({
				path: that.get('dirname')+'/'+newName
			});
			that.load([function() {
				callback.success(that);
			}, function(response) {
				callback.error(response, that);
			}]);
		}, function(response) {
			callback.error(response, that);
		}]);
	},
	/**
	 * D�placer le fichier.
	 * @param {String} dest La destination du fichier.
	 * @param {Webos.Callback} callback La fonction de rappel qui sera appel�e une fois que le fichier sera d�plac�.
	 */
	move: function(dest, callback) {
		var that = this;
		callback = Webos.Callback.toCallback(callback);
		
		new Webos.ServerCall({
			'class': 'FileController',
			method: 'move',
			arguments: {
				file: that.get('path'),
				dest: dest.get('path')
			}
		}).load(new Webos.Callback(function() {
			that._remove();
			callback.success(dest);
		}, function(response) {
			callback.error(response, that);
		}));
	},
	/**
	 * Supprimer le fichier.
	 * @param {Webos.Callback} callback La fonction de rappel qui sera appel�e une fois que le fichier sera d�plac�.
	 */
	remove: function(callback) {
		var that = this;
		callback = Webos.Callback.toCallback(callback);
		
		new Webos.ServerCall({
			'class': 'FileController',
			method: 'delete',
			arguments: {
				file: that.get('path')
			}
		}).load(new Webos.Callback(function() {
			that._remove();
			callback.success();
		}, function(response) {
			callback.error(response, that);
		}));
	},
	_remove: function() {
		this.notify('remove');
		Webos.File.notify('remove', { file: this });
		
		Webos.File.clearCache(this.get('path'));
		delete this;
	},
	/**
	 * R�cup�rer le contenu du fichier.
	 * @param {Webos.Callback} callback La fonction de rappel qui sera appel�e avec en argument le contenu du fichier. Si c'est un dossier, un tableau de fichiers sera fournit.
	 */
	contents: function(callback) {
		var that = this;
		callback = Webos.Callback.toCallback(callback);
		
		if (this.get('is_dir')) {
			new Webos.ServerCall({
				'class': 'FileController',
				method: 'getContents',
				arguments: {
					dir: this.get('path')
				}
			}).load(new Webos.Callback(function(response) {
				var data = response.getData();
				var list = [];
				for(var key in data) {
					var file = new Webos.File(data[key]);
					if (Webos.File._cache[file.get('path')]) {
						Webos.File._cache[file.get('path')].hydrate(file.data());
						file = Webos.File._cache[file.get('path')];
						Webos.File.notify('load', { file: file });
					} else {
						Webos.File._cache[file.get('path')] = file;
					}
					list.push(file);
				}
				callback.success(list);
			}, function(response) {
				callback.error(response);
			}));
		} else {
			new Webos.ServerCall({
				'class': 'FileController',
				method: 'getContents',
				arguments: {
					file: that.get('path')
				}
			}).load(new Webos.Callback(function(response) {
				callback.success(response.getStandardChannel(), that);
			}, function(response) {
				callback.error(response, that);
			}));
		}
	},
	/**
	 * R�cup�rer le contenu du fichier.
	 * @deprecated Depuis la version 1.0 alpha 3, il faut utiliser Webos.File#contents().
	 */
	getContents: function(callback) {
		return this.contents(callback);
	},
	/**
	 * D�finir le contenu du fichier.
	 * @param {String} contents Le contenu.
	 * @param {Webos.Callback} callback La fonction de rappel qui sera appel�e une fois que le fichier sera modifi�.
	 */
	setContents: function(contents, callback) {
		var that = this;
		callback = Webos.Callback.toCallback(callback);
		
		new Webos.ServerCall({
			'class': 'FileController',
			method: 'setContents',
			arguments: {
				file: that.get('path'),
				contents: contents
			}
		}).load(new Webos.Callback(function() {
			callback.success();
		}, function(response) {
			callback.error(response);
		}));
	},
	toString: function() {
		return this.get('path');
	}
};
Webos.inherit(Webos.File, Webos.Model); //H�ritage de Webos.Model

Webos.Observable.build(Webos.File); //On construit un objet observable depuis Webos.File

/**
 * Cache des fichiers.
 * @private
 */
Webos.File._cache = {};
/**
 * R�cup�rer un fichier.
 * @param file Le chemin vers le fichier.
 * @param {Object} [data] Les donn�es sur le fichier.
 */
Webos.File.get = function(file, data) {
	path = String(file);
	
	if (Webos.File._cache[path]) { //Si le fichier est dans le cache, on le retourne
		return Webos.File._cache[path];
	} else if (file instanceof Webos.File) { //Si c'est d�j� un objet Webos.File, on le retourne directement
		return file;
	} else { //Sinon, on cr�e un nouvel objet
		return new Webos.File($.extend({}, data, {
			path: path
		}));
	}
};
/**
 * Charger les donn�es sur un fichier.
 * @param {String} path Le chemin vers le fichier.
 * @param {Webos.Callback} callback La fonction de rappel qui sera appel�e avec en argument le fichier.
 */
Webos.File.load = function(path, callback) {
	path = String(path);
	callback = Webos.Callback.toCallback(callback);
	
	if (typeof Webos.File._cache[path] != 'undefined') { //Si le fichier est d�j� dans le cache, on le retourne
		callback.success(Webos.File._cache[path]);
	} else { //Sinon, on le charge
		new Webos.ServerCall({
			'class': 'FileController',
			method: 'getData',
			arguments: {
				file: path
			}
		}).load(new Webos.Callback(function(response) {
			var file = new Webos.File(response.getData()); //On construit notre objet
			
			//On le stocke dans le cache
			if (typeof Webos.File._cache[file.getAttribute('path')] != 'undefined') {
				Webos.File._cache[file.getAttribute('path')].hydrate(file.data());
				file = Webos.File._cache[file.getAttribute('path')];
				Webos.File.notify('load', { file: file });
			} else {
				Webos.File._cache[file.getAttribute('path')] = file;
			}
			
			callback.success(file);
		}, callback.error));
	}
};
/**
 * Lister le contenu d'un dossier.
 * @param path Le chemin vers le dossier.
 * @param {Webos.Callback} callback La fonction de rappel qui sera appel�e avec en argument le contenu du dossier.
 */
Webos.File.listDir = function(path, callback) {
	callback = Webos.Callback.toCallback(callback);
	
	var file = Webos.File.get(path, { is_dir: true }); //On construit notre objet

	//Puis on r�cup�re son contenu
	file.contents([function(list) {
		callback.success(list);
	}, callback.error]);
};
/**
 * Cr�er un fichier vide.
 * @param path Le chemin vers le nouveau fichier.
 * @param {Webos.Callback} callback La fonction de rappel qui sera appel�e une fois que le fichier sera cr��.
 */
Webos.File.createFile = function(path, callback) {
	callback = Webos.Callback.toCallback(callback);
	
	new Webos.ServerCall({
		'class': 'FileController',
		method: 'createFile',
		arguments: {
			file: path
		}
	}).load(new Webos.Callback(function(response) {
		var file = new Webos.File(response.getData());
		Webos.File._cache[file.getAttribute('path')] = file;
		Webos.File.notify('create', { file: file });
		callback.success(file);
	}, function(response) {
		callback.error(response);
	}));
};
/**
 * Cr�er un nouveau dossier.
 * @param path Le chemin vers le nouveau dossier.
 * @param {Webos.Callback} callback La fonction de rappel qui sera appel�e une fois que le dossier sera cr��.
 */
Webos.File.createFolder = function(path, callback) {
	callback = Webos.Callback.toCallback(callback);
	
	new Webos.ServerCall({
		'class': 'FileController',
		method: 'createFolder',
		arguments: {
			file: path
		}
	}).load(new Webos.Callback(function(response) {
		var file = new Webos.File(response.getData());
		Webos.File._cache[file.getAttribute('path')] = file;
		Webos.File.notify('create', { file: file });
		callback.success(file);
	}, function(response) {
		callback.error(response);
	}));
};
/**
 * Vider le cache interne de la biblioth�que des fichiers.
 * @param {String} [path] Si sp�cifi�, seul le cache du fichier ayant ce chemin sera vid�.
 */
Webos.File.clearCache = function(path) {
	if (typeof path == 'undefined') {
		Webos.File._cache = {};
	} else {
		delete Webos.File._cache[path];
	}
};
/**
 * Nettoyer un chemin.
 * @param {String} path Le chemin � nettoyer.
 * @returns {String} Le chemin nettoy�.
 */
Webos.File.cleanPath = function(path) {
	return path
		.replace(/\/+/, '/')
		.replace('/./', '/')
		.replace(/\/\.$/, '/')
		.replace(/(.+)\/$/, '$1');
};
/**
 * Convertir une taille en octets vers une taille lisible par un �tre humain (ex : 1024 -> 1 Kio).
 * @param {Number} bytes La taille en octets � convertir.
 * @returns {String} La taille convertie, suivie de l'unit�.
 */
Webos.File.bytesToSize = function(bytes) {
	var sizes = [ 'octets', 'Kio', 'Mio', 'Gio', 'Tio', 'Pio', 'Eio', 'Zio', 'Yio' ];
	if (bytes <= 1)
		return bytes+' octet';
	var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
	return ((i == 0) ? (bytes / Math.pow(1024, i))
			: (bytes / Math.pow(1024, i)).toFixed(1))
			+ ' ' + sizes[i];
};

//Lorsque l'utilisateur quitte sa session, on vide le cache
Webos.User.bind('logout', function() {
	Webos.File.clearCache();
});