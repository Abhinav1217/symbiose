Webos.require('/usr/lib/apt/apt.js', function() {
	Webos.Confiture = {};
	Webos.Observable.build(Webos.Confiture);

	/**
	 * Webos.Confiture.Package represente un paquet.
	 * @param name Le nom du paquet.
	 * @param data Les donnees sur le paquet.
	 * @return Webos.Confiture.Package Le paquet.
	 */
	Webos.Confiture.Package = function (data) {
		this._running = false;
		Webos.Package.call(this, data);
	};

	Webos.Confiture.Package.prototype = {
		/**
		 * Recuperer le nom du paquet.
		 * @return string Le nom du paquet.
		 */
		codename: function() {
			return this._get('name');
		},
		installable: function() {
			return true;
		},
		runnable: function() {
			return false;
		},
		/**
		 * Installer le paquet.
		 * @param Webos.Callback callback
		 */
		install: function(callback) {
			callback = Webos.Callback.toCallback(callback);
			var that = this;

			if (!this.get('installable')) {
				operation.setCompleted(Webos.Callback.Result.error('This app cannot be installed'));
				return;
			}

			this._running = true;
			
			this.trigger('installstart');
			Webos.Package.trigger('installstart', { 'package': this });
			
			return new W.ServerCall({
				'class': 'ConfitureRepositoryController',
				'method': 'install',
				arguments: {
					'pkgName': this.get('name'),
					//'repository': this.get('repository') //Do not specify the repository (prevent from installing from the local repository)
				}
			}).load([function(res) {
				that._running = false;
				that._hydrate({
					'installed': true,
					'installDate': Math.round(+new Date() / 1000)
				});

				callback.success();

				that.trigger('install installcomplete installsuccess');
				Webos.Package.trigger('install installcomplete installsuccess', { 'package': that });
			}, function(res) {
				that._running = false;

				callback.error(res);

				that.trigger('installcomplete installerror');
				Webos.Package.trigger('installcomplete installerror', { 'package': that });
			}]);
		},
		/**
		 * Supprimer le paquet.
		 * @param Webos.Callback callback
		 */
		remove: function(callback) {
			callback = Webos.Callback.toCallback(callback);
			var that = this;

			if (!this.get('installed')) {
				callback.error(Webos.Callback.Result.error('This app is not installed'));
				return;
			}

			this._running = true;
			
			this.trigger('removestart');
			Webos.Package.trigger('removestart', { 'package': this });
			
			return new W.ServerCall({
				'class': 'ConfitureRepositoryController',
				'method': 'remove',
				arguments: {
					'pkgName': this.get('name')
				}
			}).load([function(res) {
				that._running = false;
				that._hydrate({
					'installed': false,
					'installDate': null
				});
				
				callback.success();
				
				that.trigger('remove removecomplete removesuccess');
				Webos.Package.trigger('remove removecomplete removesuccess', { 'package': that });
			}, function(res) {
				that._running = false;

				callback.error(res);
				
				that.trigger('removecomplete removeerror');
				Webos.Package.trigger('removecomplete removeerror', { 'package': that });
			}]);
		},
		isRunning: function() {
			return this._running;
		},
		set: function() {
			return false;
		}
	};
	Webos.inherit(Webos.Confiture.Package, Webos.Package);

	Webos.Confiture.buildPkg = function (data) {
		return new Webos.Confiture.Package(data);
	};
	Webos.Confiture._parsePackagesList = function(objects) {
		var pkgs = [];

		for(var i in objects) {
			pkgs.push(Webos.Confiture.buildPkg(objects[i]));
		}

		return pkgs;
	};

	/**
	 * @todo
	 */
	Webos.Confiture.featuredPackages = function (params, callback) {
		callback = W.Callback.toCallback(callback);

		var op = new Webos.Operation();
		op.addCallbacks(callback);

		setTimeout(function() {
			op.setCompleted([]);
		}, 0);

		return op;
	};

	Webos.Confiture.searchPackages = function(params, callback) {
		callback = W.Callback.toCallback(callback);

		return new W.ServerCall({
			'class': 'ConfitureRepositoryController',
			'method': 'search',
			'arguments': {
				'options': params
			}
		}).load([function(res) {
			callback.success(Webos.Confiture._parsePackagesList(res.getData()));
		}, callback.error]);
	};

	Webos.Confiture.lastPackages = function(params, callback) {
		params = $.extend({}, params, {
			sort: 'created'
		});

		return Webos.Confiture.searchPackages(params, callback);
	};

	/**
	 * @todo
	 */
	Webos.Confiture.categories = function(callback) {
		callback = W.Callback.toCallback(callback);

		var op = new Webos.Operation();
		op.addCallbacks(callback);

		setTimeout(function() {
			op.setCompleted([]);
		}, 0);

		return op;
	};

	/**
	 * Recuperer tous les paquets disponibles.
	 * @param Webos.Callback callback
	 */
	Webos.Confiture.Package.getAvailable = function(callback) {
		callback = Webos.Callback.toCallback(callback);
		
		return new W.ServerCall({
			'class': 'ConfitureRepositoryController',
			'method': 'listAll'
		}).load([function(response) {
			callback.success(Webos.Confiture.Package._objectToPackageList(response.getData()));
		}, function(response) {
			callback.error(response);
		}]);
	};

	/**
	 * Recuperer un paquet.
	 * @param string name Le nom du paquet.
	 * @param Webos.Callback callback
	 */
	Webos.Confiture.Package.get = function(name, callback) {
		callback = Webos.Callback.toCallback(callback);
		
		return new W.ServerCall({
			'class': 'ConfitureRepositoryController',
			'method': 'getByName',
			'arguments': {
				'pkgName': name
			}
		}).load([function(response) {
			var pkg = new Webos.Confiture.Package(response.getData());
			callback.success(pkg);
		}, function(response) {
			callback.error(response);
		}]);
	};

	/**
	 * Recuperer tous les paquets d'une categorie.
	 * @param string name Le nom de la categorie.
	 * @param Webos.Callback callback
	 */
	Webos.Confiture.Package.getFromCategory = function(name, callback) {
		callback = Webos.Callback.toCallback(callback);
		
		new W.ServerCall({
			'class': 'ConfitureRepositoryController',
			'method': 'getFromCategory',
			'arguments': {
				'category': name
			}
		}).load(new Webos.Callback(function(response) {
			callback.success(Webos.Confiture.Package._objectToPackageList(response.getData()));
		}, function(response) {
			callback.error(response);
		}));
	};

	/**
	 * Recuperer les derniers paquets parus.
	 * @param int limit Le nombre de paquets a renvoyer.
	 * @param Webos.Callback callback
	 */
	Webos.Confiture.Package.getLastPackages = function(limit, callback) {
		callback = Webos.Callback.toCallback(callback);
		
		new W.ServerCall({
			'class': 'ConfitureRepositoryController',
			'method': 'getLastPackages',
			'arguments': {
				'limit': limit
			}
		}).load(new Webos.Callback(function(response) {
			callback.success(Webos.Confiture.Package._objectToPackageList(response.getData()));
		}, function(response) {
			callback.error(response);
		}));
	};

	/**
	 * Recuperer les paquets installes.
	 * @param Webos.Callback callback
	 */
	Webos.Confiture.Package.getInstalled = function(callback) {
		callback = Webos.Callback.toCallback(callback);
		
		new W.ServerCall({
			'class': 'ConfitureRepositoryController',
			'method': 'getInstalled'
		}).load(new Webos.Callback(function(response) {
			callback.success(Webos.Confiture.Package._objectToPackageList(response.getData()));
		}, function(response) {
			callback.error(response);
		}));
	};

	Webos.Confiture.Package.getLastInstalled = function(limit, callback) {
		callback = Webos.Callback.toCallback(callback);
		
		new W.ServerCall({
			'class': 'ConfitureRepositoryController',
			'method': 'getLastInstalled',
			arguments: {
				limit: limit
			}
		}).load(new Webos.Callback(function(response) {
			callback.success(Webos.Confiture.Package._objectToPackageList(response.getData()));
		}, function(response) {
			callback.error(response);
		}));
	};

	Webos.Confiture.Package.searchPackages = function(search, callback) {
		callback = Webos.Callback.toCallback(callback);
		
		new W.ServerCall({
			'class': 'ConfitureRepositoryController',
			'method': 'searchPackages',
			arguments: {
				search: search
			}
		}).load(new Webos.Callback(function(response) {
			callback.success(Webos.Confiture.Package._objectToPackageList(response.getData()));
		}, function(response) {
			callback.error(response);
		}));
	};

	/**
	 * Recuperer les mises a jour disponibles.
	 * @param Webos.Callback callback Le callback.
	 */
	Webos.Confiture.Package.getUpdates = function(callback) {
		callback = Webos.Callback.toCallback(callback);
		
		new W.ServerCall({
			'class': 'ConfitureRepositoryController',
			'method': 'getUpdates'
		}).load(new Webos.Callback(function(response) {
			callback.success(Webos.Confiture.Package._objectToPackageList(response.getData()));
		}, function(response) {
			callback.error(response);
		}));
	};

	/**
	 * Recharger le cache.
	 * @param Webos.Callback callback Le callback.
	 */
	Webos.Confiture.Package.updateCache = function(callback) {
		callback = Webos.Callback.toCallback(callback);
		
		return new W.ServerCall({
			'class': 'ConfitureRepositoryController',
			'method': 'updateCache'
		}).load([function(res) {
			var result = res.getData();

			var updated = [];
			for (var i in result.updated) {
				updated.push(result.updated[i]);
			}
			result.updated = updated;

			callback.success(result);
		}, callback.error]);
	};

	/**
	 * Installer les mises a jour.
	 * @param Webos.Callback callback Le callback.
	 */
	Webos.Confiture.Package.upgrade = function(callback) {
		callback = Webos.Callback.toCallback(callback);
		
		Webos.Confiture.Package.notify('upgradestart');
		
		new W.ServerCall({
			'class': 'ConfitureRepositoryController',
			'method': 'upgrade'
		}).load(new Webos.Callback(function(response) {
			callback.success(response);
			
			Webos.Confiture.Package.notify('upgrade');
			Webos.Confiture.Package.notify('upgradesuccess');
			Webos.Confiture.Package.notify('upgradecomplete');
		}, function(response) {
			callback.error(response);
			
			Webos.Confiture.Package.notify('upgradeerror');
			Webos.Confiture.Package.notify('upgradecomplete');
		}));
	};

	/**
	 * Convertir un objet en liste de paquets.
	 * @param data L'objet a convertir.
	 * @return object Un objet contenant les paquets.
	 */
	Webos.Confiture.Package._objectToPackageList = function(data) {
		var list = [];
		for (var key in data) {
			list.push(new Webos.Confiture.Package(data[key], key));
		}
		return list;
	};

	//Objet contenant le nom de code des categories et leur titre associe
	Webos.Confiture.Package._categories = {
		accessories: 'Accessoires',
		office: 'Bureautique',
		graphics: 'Graphisme',
		internet: 'Internet',
		games: 'Jeux',
		soundandvideo: 'Son et vid&eacute;o',
		system: 'Syst&egrave;me'
	};
	Webos.Confiture.Package.categories = function(callback) {
		callback = Webos.Callback.toCallback(callback);
		
		callback.success(Webos.Confiture.Package._categories);
		
		return Webos.Confiture.Package._categories;
	};

	// REPOSITORIES

	Webos.Confiture.Package.listRepositories = function(callback) {
		callback = Webos.Callback.toCallback(callback);
		
		return new W.ServerCall({
			'class': 'ConfitureRepositoryController',
			'method': 'listRepositories'
		}).load([function(res) {
			callback.success(res.getData());
		}, callback.error]);
	};

	Webos.Confiture.Package.insertRepository = function(repoData, callback) {
		callback = Webos.Callback.toCallback(callback);
		
		return new W.ServerCall({
			'class': 'ConfitureRepositoryController',
			'method': 'insertRepository',
			'arguments': {
				'data': repoData
			}
		}).load([function(res) {
			callback.success(res.getData());
		}, callback.error]);
	};

	Webos.Confiture.Package.deleteRepository = function(repoName, callback) {
		callback = Webos.Callback.toCallback(callback);
		
		return new W.ServerCall({
			'class': 'ConfitureRepositoryController',
			'method': 'deleteRepository',
			'arguments': {
				'name': repoName
			}
		}).load([function() {
			callback.success();
		}, callback.error]);
	};

	if (!Webos.Package.typeExists('confiture')) {
		Webos.Package.addType('confiture', Webos.Confiture);
		Webos.Package.addSource('confiture', 'confiture');
	}
});