W.ScriptFile.load(
	'/usr/lib/jquery.filedrop.js',
	'/usr/lib/fileuploader.js',
	'/usr/lib/webos/applications.js'
);

(function($) {
	$.fn.setCursorPosition = function(pos1, pos2) {
		this.each(function(index, elem) {
			if (elem.setSelectionRange) {
				elem.setSelectionRange(pos1, pos2);
			} else if (elem.createTextRange) {
				var range = elem.createTextRange();
				range.collapse(true);
				range.moveEnd('character', pos1);
				range.moveStart('character', pos2);
				range.select();
			}
		});
		return this;
	};
})(jQuery);

var nautilusProperties = $.webos.extend($.webos.properties.get('container'), {
	_name: 'nautilus',
	options: {
		directory: '~',
		multipleWindows: false,
		uploads: [],
		display: 'icons',
		showHiddenFiles: false
	},
	_translationsName: 'nautilus',
	_create: function() {
		var that = this;
		var t = this.translations();
		
		this.element.scrollPane({
			autoReload: true
		});
		this.options._components.container = this.element.scrollPane('content');
		
		if (this.options.display == 'icons') {
			this.options._content = $('<ul></ul>').addClass('icons').appendTo(this.options._components.container);
			
			that.content().mousedown(function(e) {
				if(e.button != 0) {
					return;
				}
				
				if (that.content().is(e.target)) {
					var offset = $(this).offset();
					var dimentions = {
						width: $(this).width(),
						height: $(this).height()
					};
					var diff = [offset.left, offset.top];
					var pos = [e.pageX - diff[0], e.pageY - diff[1]];
					
					var helper = $('<div></div>')
						.addClass('ui-selectable-helper')
						.css('top', pos[1])
						.css('left', pos[0])
						.css('width', 0)
						.css('height', 0)
						.css('position','absolute')
						.appendTo(that.content());
					
					$(document).bind('mousemove.'+that.id()+'.nautilus.widget.webos', function(e) {
						var x1 = pos[0], y1 = pos[1], x2 = e.pageX - diff[0], y2 = e.pageY - diff[1];
						if (x1 > x2) { var tmp = x2; x2 = x1; x1 = tmp; }
						if (y1 > y2) { var tmp = y2; y2 = y1; y1 = tmp; }
						if (x1 < 0) { x1 = 0; }
						if (y1 < 0) { y1 = 0; }
						if (x2 > dimentions.width) { x2 = dimentions.width; }
						if (y2 > dimentions.height) { y2 = dimentions.height; }
						helper.css({left: x1, top: y1, width: x2-x1, height: y2-y1});
						
						that.items().each(function() {
							var elPos = $(this).position();
							var elPos1 = { left: elPos.left, top: elPos.top };
							var elPos2 = { left: elPos1.left + $(this).outerWidth(), top: elPos1.top + $(this).outerHeight() };
							var hit = ( !(elPos1.left > x2 || elPos2.left < x1 || elPos1.top > y2 || elPos2.top < y1) );
							if (hit) {
								$(this).addClass('active');
							} else if($(this).is('.active')) {
								$(this).removeClass('active');
							}
						});
						
						e.preventDefault();
					});
					
					$(document).one('mouseup', function(e) {
						$(document).unbind('mousemove.'+that.id()+'.nautilus.widget.webos');
						helper.fadeOut('fast', function() {
							$(this).remove();
						});
						e.preventDefault();
					});
				}
				
				e.preventDefault();
				
				if ($(this).is(e.target)) {
					that.getSelection().removeClass('active');
					$(this).trigger('click');
				}
			});
		}

		if (this.options.display == 'list') {
			this.options._content = $.w.list([t.get('Name'), t.get('Size'), t.get('Type')]).appendTo(this.options._components.container);
		}

		this.content().click(function(event) {
			var item;
			if ($(event.target).is('li, tr')) {
				item = $(event.target);
			} else if ($(event.target).parents('li, tr').length > 0) {
				item = $(event.target).parents('li, tr').first();
			} else {
				that.getSelection().removeClass('active').trigger('unselect');
				return;
			}
			
			if ($.webos.keyboard.pressed('ctrl')) {
				item.addClass('active').trigger('select');
			} else {
				that.getSelection().trigger('unselect').removeClass('active');
				item.addClass('active').trigger('select');
			}
		});
		
		$.webos.keyboard.bind(this.element, 'enter', function(e) {
			if (e.isFocused) {
				return;
			}
			
			that.getSelection().each(function() {
				$(this).data('nautilus').open();
			});
		});
		$.webos.keyboard.bind(this.element, 'del', function(e) {
			if (e.isFocused) {
				return;
			}
			
			that.getSelection().each(function() {
				$(this).data('nautilus').remove();
			});
		});
		
		$.webos.keyboard.bind(this.element, 'right', function(e) {
			if (e.isFocused) {
				return;
			}
			
			var selectedElements = that.getSelection().trigger('unselect').removeClass('active');
			var elementToSelect = selectedElements.last().next(':visible');
			if (elementToSelect.length > 0) {
				elementToSelect.addClass('active').trigger('select');
			}
		});
		$.webos.keyboard.bind(this.element, 'left', function(e) {
			if (e.isFocused) {
				return;
			}
			
			var selectedElements = that.getSelection().trigger('unselect').removeClass('active');
			var elementToSelect = selectedElements.last().prev(':visible');
			if (elementToSelect.length > 0) {
				elementToSelect.addClass('active').trigger('select');
			}
		});
		
		this.readDir(this.options.directory);
	},
	items: function() {
		if (this.options.display == 'icons') {
			return this.content().children('li').filter(':visible');
		}
		if (this.options.display == 'list') {
			return this.content().list('content').children('tr').filter(':visible');
		}
	},
	readDir: function(dir, userCallback) {
		var that = this, t = this.translations();
		
		if (typeof this.options._components.contextmenu != 'undefined') {
			this.options._components.contextmenu.contextMenu('destroy');
		}
		
		dir = W.File.cleanPath(dir);
		
		userCallback = W.Callback.toCallback(userCallback, new W.Callback(function() {}, function(response) {
			response.triggerError(t.get('Can\'t find « ${dir} ».', { dir: dir }));
		}));
		
		var callback = new W.Callback(function(files) {
			that.options.directory = dir;
			
			var contextmenu;
			
			that.options._components.contextmenu = contextmenu = $.w.contextMenu(that.element);
			
			$.webos.menuItem(t.get('Create a new folder')).click(function() {
				that.createFile(t.get('New folder'), true);
			}).appendTo(contextmenu);
			$.webos.menuItem(t.get('Create a new file')).click(function() {
				that.createFile(t.get('New file'));
			}).appendTo(contextmenu);
			$.webos.menuItem(t.get('Download'), true).click(function() {
				W.File.load(dir, new W.Callback(function(file) {
					that._download(file);
				}));
			}).appendTo(contextmenu);
			$.webos.menuItem(t.get('Upload a file')).click(function() {
				that.openUploadWindow();
			}).appendTo(contextmenu);
			$.webos.menuItem(t.get('Refresh'), true).click(function() {
				that.refresh();
			}).appendTo(contextmenu);
			$.webos.menuItem(t.get('Properties'), true).click(function() {
				W.File.load(that.options.directory, new W.Callback(function(file) {
					that._openProperties(file);
				}));
			}).appendTo(contextmenu);
			
			var serverCall = new W.ServerCall({
				'class': 'FileController',
				method: 'upload',
				arguments: {
					dest: dir
				}
			});
			
			var uploadsIds = {};
			that.element.filedrop({
				url: serverCall.url,
				paramname: 'file',
				data: serverCall.data,
				error: function(event, data) {
					switch(data.error) {
						case 'BrowserNotSupported':
							W.Error.trigger(t.get('Your browser does not allow drag and drop. Please upload your files by using classical form.'));
							break;
						case 'TooManyFiles':
							W.Error.trigger(t.get('Too many files sent'));
							break;
						case 'FileTooLarge':
							W.Error.trigger(t.get('The size of the file "${name}" is too large (file size : ${fileSize}, maximum size : ${maxSize})', { name: data.file.name, fileSize: W.File.bytesToSize(data.file.size), maxSize: W.File.bytesToSize(that.element.filedrop('option', 'maxfilesize') * 1024 * 1024) }));
							break;
						default:
							W.Error.trigger(t.get('An error occurred while uploading the file : ${error}', { error: data.error }));
							break;
					}
				},
				maxfiles: 25,
				maxfilesize: 20,
				uploadstarted: function(event, data) {
					uploadsIds[data.index] = $.w.nautilus.progresses.add(0, t.get('Uploading ${name}', { name: data.file.name }));
				},
				uploadfinished: function(event, data) {
					var success = true;
					if (!data.response.isSuccess()) {
						W.Error.trigger(t.get('Can\'t upload the file "${name}"', { name: data.file.name }), data.response.getAllChannels());
						success = false;
					} else if (!data.response.getData().success) {
						W.Error.trigger(t.get('Can\'t upload the file "${name}"', { name: data.file.name }), data.response.getData().msg);
						success = false;
					}
					
					var msg;
					if (success) {
						msg = t.get('Upload completed.');
					} else {
						msg = t.get('Error while uploading.');
					}
					$.w.nautilus.progresses.update(uploadsIds[data.index], 100, msg);
					
					if (success) {
						var newFile = new W.File(response.getData().file);
						var newItem = that._renderItem(newFile);
						if (that.location() == newFile.get('dirname')) {
							that._insertItem(newItem);
						}
						
						$.w.notification({
							title: t.get('File uploaded'),
							message: t.get('The file ${name} has been sent', { name: newFile.get('basename') }),
							icon: that._getFileIcon(newFile),
							widgets: [$.w.button(t.get('Open the parent folder')).click(function() { W.Cmd.execute('nautilus "'+newFile.get('dirname')+'"'); }),
							          $.w.button(t.get('Open')).click(function() { newItem.data('nautilus').open(); })]
						});
					}
				},
				progressupdated: function(event, data) {
					$.w.nautilus.progresses.update(uploadsIds[data.index], data.progress);
				},
				speedupdated: function(event, data) {
					$.w.nautilus.progresses.update(uploadsIds[data.index], undefined, t.get('Uploading at ${speed} Kio/s...', { speed: data.speed }));
				}
			});
			
			//BUG : appel du droppable meme si des elements (comme des fenetres) sont au-dessus
			/*that.element.droppable({
				accept: '*',
				scope: 'webos',
				drop: function(event, ui) {
					if (typeof ui.draggable.data('file') == 'undefined') {
						return;
					}
					if (ui.draggable.parent().is(that.element)) {
						return;
					}
					
					W.File.load(dir, new W.Callback(function(file) {
						if (file.get('path') == ui.draggable.data('file')().getAttribute('dirname')) {
							return;
						}
						
						ui.draggable.data('file')().move(file, new W.Callback(function() {		
							ui.draggable.remove();
							that.reload();
						}));
					}));
					return false;
				}
			});*/
			
			that._render(files);
			
			that._trigger('readcomplete', {}, { location: that.location() });
			that._trigger('readsuccess', {}, { location: that.location() });
			
			userCallback.success(that);
		}, function(response) {
			var files = [];
			
			for (var path in that.options._files) {
				var file = that.options._files[path];
				files.push(file);
			}
			
			that._render(files);
			
			that._trigger('readcomplete', {}, { location: that.location() });
			that._trigger('readerror', {}, { location: that.location() });
			
			userCallback.error(response);
		});
		
		this._trigger('readstart', {}, { location: dir });
		
		W.File.listDir(dir, callback);
	},
	_render: function(files) {
		var that = this;
		
		this.options._files = {};
		
		if (this.options.display == 'icons') {
			this.content().empty();
		}
		if (this.options.display == 'list') {
			this.content().list('content').empty();
		}
		
		for (var i = 0; i < files.length; i++) {
			(function(file) {
				var item = that._renderItem(file);
				that._insertItem(item);
			})(files[i]);
		}
		
		this.element.scrollPane('reload');
		
		var createFileCallbackId = Webos.File.bind('create', function(data) {
			var newFile = data.file;
			
			if (newFile.get('dirname') != that.location()) {
				return;
			}
			
			that.options._files[newFile.get('path')] = newFile;
			var newItem = that._renderItem(newFile);
			that._insertItem(newItem);
			that.element.scrollPane('reload');
		});
		var umountCallbackId = Webos.File.bind('umount', function(data) {
			if (that.location().indexOf(data.local) != 0) {
				return;
			}
			
			that.readDir('~');
		});
		this.element.one('nautilusreadstart', function() {
			Webos.File.unbind(createFileCallbackId);
			Webos.File.unbind(umountCallbackId);
		});
	},
	_renderItem: function(file) {
		this.options._files[file.get('path')] = file;
		
		var that = this, t = this.translations(), filepath = file.get('path'), item, icon, iconPath = this._getFileIcon(file);
		
		if (that.options.display == 'icons') {
			item = $('<li></li>');
			
			icon = $('<img />', { src: iconPath, alt: '' }).addClass('icon');
			icon.appendTo(item);
			
			item.append('<br />');
			
			$('<span></span>').addClass('filename').text(file.get('basename')).appendTo(item);
		} else if (that.options.display == 'list') {
			item = $.w.listItem();
			
			var content = $('<span></span>');
			item.listItem('addColumn', content);
			
			icon = $('<img />', { src: iconPath, alt: '' }).addClass('icon').appendTo(content);
			
			$('<span></span>').addClass('filename').text(file.get('basename')).appendTo(content);
			
			var size;
			if (file.get('is_dir')) {
				size = t.get('${nbr} element${nbr|s}', { nbr: file.get('size') });
			} else {
				size = W.File.bytesToSize(file.get('size'));
			}
			item.listItem('addColumn', size);
			
			var type;
			if (file.get('is_dir')) {
				type = t.get('Folder');
			} else {
				type = t.get('${extension} file', { extension: file.get('extension') });
			}
			item.listItem('addColumn', type);
		} else {
			return;
		}
		
		item.data('file', function() {
			return that.options._files[filepath];
		});
		item.data('nautilus', {
			open: function() {
				var event = jQuery.Event('open');
				item.trigger(event);
				if (!event.isDefaultPrevented()) {
					var file = item.data('file')();
					that._openFile(file);
				}
			},
			openWith: function() {
				var event = jQuery.Event('open');
				item.trigger(event);
				if (!event.isDefaultPrevented()) {
					var file = item.data('file')();
					that.openFileWindow(file);
				}
			},
			download: function() {
				that._download(item.data('file')());
				item.trigger('download');
			},
			rename: function() {
				var file = item.data('file')();
				
				var renameFn = function() {
					var name = input.val();
					input.remove();
					item.find('.filename').show();
					
					if (name == file.get('basename')) { return; }
					
					file.rename(name);
				};
				
				var onDocClickFn = function(event) {
					if (!input.parents().filter(event.target).length == 0) {
						$(document).unbind('click', onDocClickFn);
						renameFn();
					}
				};
				
				setTimeout(function() { // Delay for Mozilla
					$(document).click(onDocClickFn);
				}, 0);
				
				var input = $('<input />', { type: 'text' }).keydown(function(e) {
					if (e.keyCode == 13) {
						$(document).unbind('click', onDocClickFn);
						renameFn();
						e.preventDefault();
					}
				});
				item.find('.filename').hide().after(input);
				
				var pos = file.get('basename').length - ((file.get('extension')) ? (file.get('extension').length + 1) : 0);
				input.val(file.get('basename')).focus().setCursorPosition(0, pos);
			},
			remove: function() {
				item.data('file')().remove();
			},
			openProperties: function() {
				that._openProperties(item.data('file')());
			}
		});
		
		item.dblclick(function() {
			$(this).data('nautilus').open();
		});
		
		var contextmenu = $.w.contextMenu(item);
		
		$.webos.menuItem(t.get('Open')).click(function() {
			var files = (that.getSelection().length == 0) ? item : that.getSelection();
			files.each(function() {
				$(this).data('nautilus').open();
			});
		}).appendTo(contextmenu);
		$.webos.menuItem(t.get('Open with...')).click(function() {
			var files = (that.getSelection().length == 0) ? item : that.getSelection();
			files.each(function() {
				$(this).data('nautilus').openWith();
			});
		}).appendTo(contextmenu);
		$.webos.menuItem(t.get('Download')).click(function() {
			var files = (that.getSelection().length == 0) ? item : that.getSelection();
			files.each(function() {
				$(this).data('nautilus').download();
			});
		}).appendTo(contextmenu);
		$.webos.menuItem(t.get('Rename...'), true).click(function() {
			item.data('nautilus').rename();
		}).appendTo(contextmenu);
		$.webos.menuItem(t.get('Delete')).click(function() {
			var files = (that.getSelection().length == 0) ? item : that.getSelection();
			files.each(function() {
				$(this).data('nautilus').remove();
			});
		}).appendTo(contextmenu);
		$.webos.menuItem(t.get('Properties'), true).click(function() {
			var files = (that.getSelection().length == 0) ? item : that.getSelection();
			files.each(function() {
				$(this).data('nautilus').openProperties();
			});
		}).appendTo(contextmenu);
		
		contextmenu.bind('contextmenuopen', function() {
			if (!item.is('.active')) {
				that.getSelection().removeClass('active').trigger('unselect');
				item.addClass('active');
			}
		});
		
		if (file.get('is_dir')) {
			var overIcon = that._getFileIcon(file, 'dropover');
			item.droppable({
				drop: function(event, ui) {
					if (overIcon != iconPath) {
						icon.attr('src', iconPath);
					}
					
					if (typeof ui.draggable.data('file') == 'undefined') {
						return;
					}
					
					ui.draggable.data('file')().move(item.data('file')(), new W.Callback(function() {
						ui.draggable.remove();
					}));
					return false;
				},
				over: function() {
					if (overIcon != iconPath) {
						icon.attr('src', overIcon);
					}
				},
				out: function() {
					if (overIcon != iconPath) {
						icon.attr('src', iconPath);
					}
				}
			});
		}
		
		item.draggable({
			sourceFile: file
		});
		
		if (/^\./.test(file.get('basename'))) { //C'est un fichier cache, on ne l'affiche pas
			item.addClass('hidden');
			if (!this.options.showHiddenFiles) {
				item.hide();
			}
		}
		
		var updateCallbackId = file.bind('update', function(data) {
			if (filepath != file.get('path')) {
				delete that.options._files[filepath];
				filepath = file.get('path');
			}
			that.options._files[filepath] = file;
			
			var newItem = that._renderItem(file);
			item.replaceWith(newItem);
			item = newItem;
		});
		var removeCallbackId = file.bind('remove', function() {
			item.remove();
		});
		
		this.element.one('nautilusreadcomplete', function() {
			file.unbind('update', updateCallbackId);
			file.unbind('remove', removeCallbackId);
		});
		
		return item;
	},
	_insertItem: function(item) {
		if (this.options.display == 'icons') {
			this.content().append(item);
		}
		if (this.options.display == 'list') {
			this.content().list('content').append(item);
		}
	},
	_openProperties: function(file) {
		var t = this.translations(), that = this;
		
		var propertiesWindow = $.w.window({
			title: t.get('Properties of ${name}', { name: file.get('basename') }),
			icon: this._getFileIcon(file),
			resizable: false,
			width: 400,
			stylesheet: 'usr/share/css/nautilus/properties.css'
		});

		var displayPropertiesFn = function displayPropertiesFn(file) {
			var mtime = new Date(file.get('mtime') * 1000), atime = new Date(file.get('atime') * 1000);
			var data = [t.get('Name : ${name}', { name: file.get('basename') }),
			            (file.get('is_dir')) ? t.get('Type : folder', { extension: file.get('extension') }) : t.get('Type : ${extension} file', { extension: file.get('extension') }),
			            t.get('Location : ${location}', { location: file.get('dirname') }),
			            t.get('Last modification : ${date}', { date: Webos.Locale.current().completeDate(mtime) }),
			            t.get('Last access : ${date}', { date: Webos.Locale.current().completeDate(atime) }),
			            ((file.get('is_dir')) ? t.get('Contents : ${size} file${size|s}', { size: file.get('size') }) : t.get('Size : ${size}', { size: W.File.bytesToSize(file.get('size')) }))];
			propertiesWindow.window('content').append('<img src="'+that._getFileIcon(file)+'" alt="" class="image"/><ul><li>'+data.join('</li><li>')+'</li></ul>');
			var buttons = $.w.buttonContainer().appendTo(propertiesWindow.window('content'));
			$.w.button(t.get('Close')).appendTo(buttons).click(function() {
				propertiesWindow.window('close');
			});
		};

		if (file.exists('atime')) {
			displayPropertiesFn(file);
		} else {
			propertiesWindow.window('loading', true);

			file.load([function(file) {
				propertiesWindow.window('loading', false);

				displayPropertiesFn(file);
			}, function(response) {
				propertiesWindow.window('close');
				response.triggerError();
			}]);
		}
		
		propertiesWindow.window('open');
	},
	_download: function(file) {
		var serverCall = new W.ServerCall({
			'class': 'FileController',
			method: 'download',
			arguments: {
				file: file.get('path')
			}
		});
		var form = $('<form></form>')
			.attr('action', serverCall.url)
			.attr('method', serverCall.type)
			.attr('target', '_blank')
			.appendTo('body');
		for (var key in serverCall.data) {
			form.append($('<input />', { type: 'hidden', name: key, value: serverCall.data[key] }));
		}
		
		form.submit().remove();
	},
	openUploadWindow: function() {
		var that = this;
		var t = this.translations();
		
		if (typeof this.options._components.uploadWindow != 'undefined') {
			this.options._components.uploadWindow.window('hideOrShowOrToForeground');
			return;
		}
		
		var uploadWindow = this.options._components.uploadWindow = $.w.window({
			title: t.get('Upload files to ${location}', { location: that.location() }),
			width: 370,
			resizable: false,
			stylesheet: 'usr/share/css/nautilus/upload.css',
			icon: new W.Icon('actions/document-save', 24)
		});
		
		uploadWindow.bind('windowclose', function() {
			delete that.options._components.uploadWindow;
		});
		
		var content = uploadWindow.window('content');
		
		$('<img />', { src: new W.Icon('actions/document-save') }).addClass('upload-icon').appendTo(content);
		$.w.label(t.get('Drag and drop files from your computer or select a file to upload :')).appendTo(content);
		
		var uploadButton = $.w.button(t.get('Upload a file')).appendTo(content);
		
		var serverCall = new W.ServerCall({
			'class': 'FileController',
			method: 'upload',
			arguments: {
				dest: that.options.directory
			}
		});
		var uploadsIds = {};
		new qq.FileUploaderBasic({
			action: serverCall.url,
			params: serverCall.data,
			button: uploadButton[0],
			onSubmit: function(id, fileName){
				uploadsIds[id] = $.w.nautilus.progresses.add(0, 'Envoi de '+fileName);
			},
			onProgress: function(id, fileName, loaded, total){
				$.w.nautilus.progresses.update(uploadsIds[id], Math.round(loaded / total * 100));
			},
			onComplete: function(id, fileName, responseJSON){
				var response = new W.ServerCall.Response(responseJSON);
				var success = true;
				if (!response.isSuccess()) {
					W.Error.trigger('Impossible d\'envoyer le fichier "'+fileName+'"', response.getAllChannels());
					success = false;
				} else if (!response.getData().success) {
					W.Error.trigger('Impossible d\'envoyer le fichier "'+fileName+'"', response.getData().msg);
					success = false;
				}
				
				var msg;
				if (success) {
					msg = 'Envoi termin&eacute;.';
				} else {
					msg = 'Erreur lors de l\'envoi.';
				}
				$.w.nautilus.progresses.update(uploadsIds[id], 100, msg);
				
				if (success) {
					var newFile = new W.File(response.getData().file);
					var newItem = that._renderItem(newFile);
					if (that.location() == newFile.get('dirname')) {
						that._insertItem(newItem);
					}
					
					$.w.notification({
						title: 'Fichier envoy&eacute;',
						message: 'Le fichier '+newFile.get('basename')+' a &eacute;t&eacute; envoy&eacute;.',
						icon: that._getFileIcon(newFile),
						widgets: [$.w.button('Ouvrir le dossier parent').click(function() { W.Cmd.execute('nautilus "'+newFile.get('dirname')+'"'); }),
						          $.w.button('Ouvrir').click(function() { newItem.data('nautilus').open(); })]
					});
				}
			},
			onCancel: function(id, fileName){
				$.w.nautilus.progresses.update(uploadsIds[id], 100, t.get('Upload canceled.'));
			},
			// messages                
			messages: {
				typeError: "Le type du fichier <em>{file}</em> est incorrect. Seules les extensions {extensions} sont autoris&eacute;es.",
				sizeError: "Le fichier <em>{file}</em> est trop gros, la taille maximum est {sizeLimit}.",
				minSizeError: "Le fichier <em>{file}</em> est trop petit, la taille minimum est {minSizeLimit}.",
				emptyError: "Le fichier <em>{file}</em> est vide, veuillez r&eacute;essayer.",
				onLeave: t.get('Files are being uploaded, if you leave this page now, they will be canceled.')
			},
			showMessage: function(message){
				W.Error.trigger(message);
			}
        });
		
		var buttonContainer = $.w.buttonContainer().appendTo(content);
		
		$.w.button(t.get('Close')).click(function() {
			uploadWindow.window('close');
		}).appendTo(buttonContainer);
		
		uploadWindow.window('open');
	},
	refresh: function(callback) {
		this.readDir(this.options.directory, callback);
	},
	location: function() {
		return this.options.directory;
	},
	_getFileIcon: function(file, state) {
		var t = this.translations();
		
		var iconName = 'mimes/unknown';
		
		var exts = ['png', 'gif', 'jpeg', 'jpg', 'bmp', 'ico', 'js', 'mp3', 'ogv', 'tiff', 'php', 'ogg', 'mp4', 'html', 'zip', 'txt'];
		for(var i = 0; i < exts.length; i++) {
			if (exts[i] == file.get('extension')) {
				iconName = 'mimes/'+file.get('extension');
				break;
			}
		}
		
		if (file.get('is_dir')) {
			iconName = 'mimes/folder';
			
			if (state == 'dropover') {
				iconName = 'mimes/folder-open';
			}
			
			var mountedDevices = Webos.File.mountedDevices();
			if (mountedDevices[file.get('path')]) {
				var mountData = Webos.File.getMountData(file.get('path'));
				var driverData = Webos.File.getDriverData(mountData.get('driver'));
				iconName = driverData.icon;
			}
		}
		
		if (file.get('path') == '~') {
			iconName = 'places/folder-home';
		}
		
		switch (file.get('path')) {
			case '~':
				iconName = 'places/folder-home';
				break;
			case '~/'+t.get('Documents'):
				iconName = 'places/folder-documents';
				break;
			case '~/'+t.get('Desktop'):
				iconName = 'places/folder-desktop';
				break;
			case '~/'+t.get('Pictures'):
				iconName = 'places/folder-pictures';
				break;
			case '~/'+t.get('Music'):
				iconName = 'places/folder-music';
				break;
			case '~/'+t.get('Videos'):
				iconName = 'places/folder-videos';
				break;
			case '~/'+t.get('Downloads'):
				iconName = 'places/folder-downloads';
				break;
		}
		
		var size = 22;
		if (this.options.display == 'icons') {
			size = 48;
		} else if (this.options.display == 'list') {
			size = 22;
		}
		
		return new W.Icon(iconName, size);
	},
	_openFile: function(file) {
		if (file.get('is_dir')) {
			if (this.options.multipleWindows) {
				W.Cmd.execute('nautilus "'+file.get('path')+'"');
			} else {
				this.readDir(file.get('path'));
			}
		} else {
			var that = this, t = this.translations();
			
			var runOpenerFn = function() {
				Webos.Application.listOpeners(file.get('extension'), function(openers) {
					if (openers.length > 0) {
						W.Cmd.execute(openers[0].get('command')+' "'+file.get('path')+'"');
					} else {
						that.openFileWindow(file);
					}
				});
			};
			
			if (file.get('extension') == 'js') {
				var exeWindow = $.w.window.dialog({
					title: t.get('File opening'),
					icon: this._getFileIcon(file),
					resizable: false,
					hideable: false,
					width: 550
				});
				
				var form = $.w.entryContainer().appendTo(exeWindow.window('content'));
				
				$.w.image(new W.Icon('actions/help')).css('float', 'left').appendTo(form);
				$('<strong></strong>').html(t.get('Do you want to execute « ${name} » or to display his contents ?', { name: file.get('basename') })).appendTo(form);
				form.after('<p>'+t.get('« ${name} » is an executable text file.', { name: file.get('basename') })+'</p>');
				
				var buttonContainer = $.w.buttonContainer().css('clear', 'both').appendTo(form);
				$.w.button(t.get('Run in a terminal')).click(function() {
					exeWindow.window('close');
					W.Cmd.execute('gnome-terminal "'+file.get('path')+'"');
				}).appendTo(buttonContainer);
				$.w.button(t.get('Display')).click(function() {
					exeWindow.window('close');
					runOpenerFn();
				}).appendTo(buttonContainer);
				$.w.button(t.get('Cancel')).click(function() {
					exeWindow.window('close');
				}).appendTo(buttonContainer);
				$.w.button(t.get('Run'), true).appendTo(buttonContainer);
				
				form.submit(function() {
					exeWindow.window('close');
					W.Cmd.execute('"'+file.get('path')+'"');
				});
				
				exeWindow.window('open');
			} else {
				runOpenerFn();
			}
		}
	},
	openFileWindow: function(file) {
		var that = this, t = this.translations();
		
		var openFileWindowFn = function(apps) {
			var fileOpenerWindow = $.w.window.dialog({
				title: t.get('Opening of ${name}', { name: file.get('basename') }),
				icon: that._getFileIcon(file),
				width: 400,
				resizable: false
			});
			
			var chosenCmd = '';
			
			var content = $.w.entryContainer().submit(function() {
				if (!chosenCmd) {
					return;
				}
				
				fileOpenerWindow.window('close');
				W.Cmd.execute(chosenCmd+' "'+file.get('path')+'"');
			}).appendTo(fileOpenerWindow.window('content'));
			
			content.append('<strong>'+t.get('Select an application to open ${name}', { name: file.get('basename') })+'</strong>');
			
			var list = $.w.list().appendTo(content);
			
			for (var i = 0; i < apps.length; i++) {
				(function(app) {
					$.w.listItem([app.get('title')]).appendTo(list.list('content')).bind('listitemselect', function() {
						chosenCmd = app.get('command');
					}).bind('listitemunselect', function() {
						chosenCmd = '';
					});
				})(apps[i]);
			}
			
			var buttonContainer = $.w.buttonContainer().appendTo(content);
			$.w.button(t.get('Cancel')).click(function() {
				fileOpenerWindow.window('close');
			}).appendTo(buttonContainer);
			$.w.button(t.get('Select'), true).appendTo(buttonContainer);
			
			fileOpenerWindow.window('open');
		};
		
		Webos.Application.listOpeners(file.get('extension'), function(openers) {
			if (openers.length > 0) {
				openFileWindowFn(openers);
			} else {
				Webos.Application.list(function(apps) {
					var openers = [];
					
					for (var key in apps) {
						if (apps[key].get('open').length == 0) {
							continue;
						}
						
						openers.push(apps[key]);
					}
					
					openFileWindowFn(openers);
				});
			}
		});
	},
	createFile: function(name, is_dir) {
		var originalName = name, exists = false, i = 2, ext = null, filename = name;
		
		if (!is_dir) {
			var nameArray = name.split('.');
			ext = (nameArray.length > 1) ? nameArray.pop() : null;
			filename = nameArray.join('.');
		}
		
		do {
			for (var path in this.options._files) {
				var file = this.options._files[path];
				if (file.get('basename') == name) {
					exists = true;
					if (is_dir && ext) {
						name = filename+' ('+i+').'+ext;
					} else {
						name = originalName+' ('+i+')';
					}
					i++;
				} else {
					exists = false;
				}
			}
		} while (exists);
		
		var path = this.options.directory+'/'+name;
		
		if (is_dir) {
			W.File.createFolder(path);
		} else {
			W.File.createFile(path);
		}
	},
	getSelection: function() {
		return this.items().filter('.active');
	},
	getFilesSelection: function() {
		var selection = this.getSelection();
		var selectedFiles = [];
		selection.each(function() {
			selectedFiles.push($(this).data('file')());
		});
		return selectedFiles;
	}
});
$.webos.widget('nautilus', nautilusProperties);

$.webos.nautilus = function(options) {
	return $('<div></div>').nautilus(options);
};

$.w.nautilus.progresses = []; //Liste contenant les operations en cours
$.w.nautilus.progresses.add = function(value, action, details) { //Ajouter une operation en cours
	var id = $.w.nautilus.progresses.push({ //On ajoute les informations
		action: action,
		value: value,
		details: (details) ? details : ''
	}) - 1;
	$.w.nautilus.progresses.update(id); //On met a jour l'operation
	return id; //On retourmne l'id de l'operation
};
$.w.nautilus.progresses.defineWindow = function() {
	$.w.nautilus.progresses.window = $.w.window.dialog({ //Fenetre de progression des operations sur les fichiers
		title: 'File operations',
		width: 300,
		resizable: false
	});
	
	Webos.Translation.load(function (t) {
		$.w.nautilus.progresses.window.window('title', t.get('File operations'));
	}, 'nautilus');
};
$.w.nautilus.progresses.update = function(id, value, details) { //Mettre a jour une operation en cours
	if (typeof $.w.nautilus.progresses[id] == 'undefined') { //Si l'operation n'existe pas
		return;
	}
	
	if (typeof $.w.nautilus.progresses.window == 'undefined') {
		$.w.nautilus.progresses.defineWindow();
	}
	
	if (typeof value != 'undefined') {
		$.w.nautilus.progresses[id].value = value; //On met a jour la valeur si elle est specifiee
	} else {
		value = $.w.nautilus.progresses[id].value;
	}
	
	if (typeof $.w.nautilus.progresses[id]._components == 'undefined') { //Si l'item dans la fenetre n'existe pas, on le cree
		$.w.nautilus.progresses[id]._components = {};
		var element = $.w.nautilus.progresses[id]._components.element = $.w.label().appendTo($.w.nautilus.progresses.window.window('content'));
		$.w.label($.w.nautilus.progresses[id].action).css('font-weight', 'bold').appendTo(element);
		$.w.nautilus.progresses[id]._components.details = $.w.label($.w.nautilus.progresses[id].details).css('font-size', 'small').appendTo(element);
		$.w.nautilus.progresses[id]._components.progressbar = $.w.progressbar(value).appendTo(element);
	} else { //Sinon, on le met a jour
		if ($.w.nautilus.progresses[id]._components.progressbar.progressbar('value') != value) {
			$.w.nautilus.progresses[id]._components.progressbar.progressbar('value', value);
		}
		if ($.w.nautilus.progresses[id]._components.details.html() != details && typeof details != 'undefined') {
			$.w.nautilus.progresses[id]._components.details.html(details);
		}
	}
	
	// Si la valeur est egale a cent, c'est que l'operation est terminee, on la retire
	if ($.w.nautilus.progresses[id]._components.progressbar.progressbar('value') == 100) {
		$.w.nautilus.progresses[id]._components.element.empty().remove();
		delete $.w.nautilus.progresses[id];
	}
	
	var countNbrProgressesFn = function() {
		//On compte le nombre d'operations restantes
		var nbrProgresses = 0;
		for (var i = 0; i < $.w.nautilus.progresses.length; i++) {
			if (typeof $.w.nautilus.progresses[i] == 'undefined') {
				continue;
			}
			nbrProgresses++;
		}
		return nbrProgresses;
	};
	
	var nbrProgresses = countNbrProgressesFn();
	
	//Si la fenetre n'est pas affichee et que plus d'une operation sont en cours
	if (nbrProgresses > 0 && !$.w.nautilus.progresses.window.closest('html').length && typeof $.w.nautilus.progresses.windowOpenTimeout == 'undefined') {
		$.w.nautilus.progresses.windowOpenTimeout = setTimeout(function() { //On affiche la fenetre au bout de deux secondes, si les operations ne se sont pas terminees avant
			if (countNbrProgressesFn() > 0 && !$.w.nautilus.progresses.window.closest('html').length) {
				$.w.nautilus.progresses.window.window('open');
			}
			delete $.w.nautilus.progresses.windowOpenTimeout;
		}, 000);
	}
	//Si il n'y a aucune operation en cours et que la fenetre est ouverte, on la ferme
	if (nbrProgresses == 0 && $.w.nautilus.progresses.window.window('is', 'opened')) {
		$.w.nautilus.progresses.window.window('close');
	}
};

var nautilusFileSelectorProperties = $.webos.extend($.webos.properties.get('container'), {
	_name: 'nautilusfileselector',
	options: {
		selectDirs: false,
		selectMultiple: false,
		exists: true,
		extensions: null
	},
	_translationsName: 'nautilus',
	_create: function() {
		var that = this, t = this.translations();
		
		var form = $.w.entryContainer().submit(function() {
			that._select();
		}).appendTo(this.element);
		
		this.options._components.nautilus = $.w.nautilus({
			display: 'list'
		}).appendTo(form);
		
		if (!this.options.exists) {
			this.options._components.filename = $.w.textEntry(t.get('File name :')).prependTo(form);
			var autoFill = '';
			this.options._components.nautilus.bind('select', function(e) {
				if (that.options._components.filename.textEntry('value') == '') {
					var filename = $(e.target).data('file')().getAttribute('basename');
					that.options._components.filename.textEntry('value', filename);
					autoFill = filename;
				}
			});
			this.options._components.nautilus.bind('nautilusreadstart', function() {
				if (that.options._components.filename.textEntry('value') == autoFill) {
					that.options._components.filename.textEntry('value', '');
					autoFill = '';
				}
			});
		}
		
		this.options._components.nautilus.bind('open', function(e) {
			if (!$(e.target).data('file')().getAttribute('is_dir')) {
				that._select();
				e.preventDefault();
			}
		});
		
		this.options._components.buttons = {};
		var buttonContainer = $.w.buttonContainer().appendTo(form);
		this.options._components.buttons.cancel = $.w.button(t.get('Cancel')).click(function() {
			that._trigger('cancel');
		}).appendTo(buttonContainer);
		this.options._components.buttons.submit = $.w.button(t.get('Open'), true).appendTo(buttonContainer);
	},
	_select: function() {
		var that = this;
		
		var selectFn = function(selection) {
			if (!that.options.selectDirs) {
				for (var i = 0; i < selection.length; i++) {
					var file = W.File.get(selection[i]);
					if (file.get('is_dir')) {
						that.options._components.nautilus.nautilus('readDir', file.get('path'));
						return;
					}
				}
			}
			
			if (that.options.extensions && that.options.extensions.length > 0) {
				var checkExtsFn = function(file) {
					file = W.File.get(file);
					
					for (var i = 0; i < that.options.extensions.length; i++) {
						if (that.options.extensions[i] == file.get('extension')) {
							return true;
						}
					}
					
					return false;
				};

				for (var i = 0; i < selection.length; i++) {
					if (!checkExtsFn(selection[i])) {
						return;
					}
				}
			}
			
			that._trigger('select', { type: 'select' }, { selection: selection, parentDir: that.options._components.nautilus.nautilus('location') });
		};
		
		var selection = this.options._components.nautilus.nautilus('getFilesSelection');
		
		if (!this.options.exists) {
			var filename = that.options._components.filename.textEntry('content').val();
			
			if (!filename) {
				return;
			}
			
			var selected = false;
			this.options._components.nautilus.nautilus('items').each(function() {
				if (selected) {
					return;
				}
				
				if ($(this).data('file')().get('basename') == filename) {
					selectFn([$(this).data('file')()]);
				}
			});
			if (selected) {
				return;
			}
			
			var path = that.options._components.nautilus.nautilus('location')+'/'+filename;
			selectFn([path]);
		} else {
			selectFn(selection);
		}
	},
	nautilus: function() {
		return this.options._components.nautilus;
	}
});
$.webos.widget('nautilusFileSelector', nautilusFileSelectorProperties);

$.webos.nautilusFileSelector = function(options) {
	return $('<div></div>').nautilusFileSelector(options);
};

var nautilusFileEntryProperties = $.webos.extend($.webos.properties.get('entry'), {
	_name: 'nautilusfileentry',
	options: {
		fileSelector: {}
	},
	_create: function() {
		var that = this;
		
		this.options._content = $('<input />', { type: 'text' }).appendTo(this.element);
		this.options._components.browseButton = $.w.button('Choisir').click(function() {
			new NautilusFileSelectorWindow(that.options.fileSelector, function(path) {
				if (path) {
					that.value(path);
				}
			});
		}).appendTo(this.element);
		
		this.value(this.options.value);
	}
});
$.webos.widget('nautilusFileEntry', nautilusFileEntryProperties);

$.webos.nautilusFileEntry = function(label, options) {
	return $('<div></div>').nautilusFileEntry($.extend({}, options, {
		label: label
	}));
};

var nautilusShortcutsProperties = $.webos.extend($.webos.properties.get('container'), {
	_name: 'nautilusshortcuts',
	options: {
		open: function() {}
	},
	_translationsName: 'nautilus',
	_create: function() {
		var that = this, t = this.translations();
		
		var thisProcess = W.Process.current(), canReadUserFiles = true, canReadSystemFiles = true;
		if (thisProcess) {
			canReadUserFiles = thisProcess.getAuthorizations().can('file.user.read');
			canReadSystemFiles = thisProcess.getAuthorizations().can('file.system.read');
		}
		
		this.options._content = $.w.list(['Raccourcis']).appendTo(this.element);
		var listContent = this.options._content.list('content');
		
		if (canReadUserFiles) {
			$.w.listItem(['<img src="'+new W.Icon('places/folder-home', 22)+'" alt=""/> '+t.get('Private folder')]).bind('listitemselect', function() {
				that.options.open('~');
			}).appendTo(listContent);
			
			$.w.listItem(['<img src="'+new W.Icon('places/folder-desktop', 22)+'" alt=""/> '+t.get('Desktop')]).bind('listitemselect', function() {
				that.options.open('~/'+t.get('Desktop'));
			}).appendTo(listContent);
			
			$.w.listItem(['<img src="'+new W.Icon('places/folder-documents', 22)+'" alt=""/> '+t.get('Documents')]).bind('listitemselect', function() {
				that.options.open('~/'+t.get('Documents'));
			}).appendTo(listContent);
			
			$.w.listItem(['<img src="'+new W.Icon('places/folder-pictures', 22)+'" alt=""/> '+t.get('Pictures')]).bind('listitemselect', function() {
				that.options.open('~/'+t.get('Pictures'));
			}).appendTo(listContent);
			
			$.w.listItem(['<img src="'+new W.Icon('places/folder-music', 22)+'" alt=""/> '+t.get('Music')]).bind('listitemselect', function() {
				that.options.open('~/'+t.get('Music'));
			}).appendTo(listContent);
			
			$.w.listItem(['<img src="'+new W.Icon('places/folder-videos', 22)+'" alt=""/> '+t.get('Videos')]).bind('listitemselect', function() {
				that.options.open('~/'+t.get('Videos'));
			}).appendTo(listContent);
			
			$.w.listItem(['<img src="'+new W.Icon('places/folder-downloads', 22)+'" alt=""/> '+t.get('Downloads')]).bind('listitemselect', function() {
				that.options.open('~/'+t.get('Downloads'));
			}).appendTo(listContent);
		}
		
		if (canReadSystemFiles) {
			$.w.listItem(['<img src="'+new W.Icon('devices/harddisk', 22)+'" alt=""/> '+t.get('File system')]).bind('listitemselect', function() {
				that.options.open('/');
			}).appendTo(listContent);
		}
		
		this._refreshDevices();
		
		this.options._mountCallback = Webos.File.bind('mount', function() {
			that._refreshDevices();
		});
		this.options._umountCallback = Webos.File.bind('umount', function() {
			that._refreshDevices();
		});
	},
	_refreshDevices: function() {
		var that = this, t = this.translations();
		
		if (this.options._devices) {
			this.options._devices.remove();
		}
		
		var mountedDevices = Webos.File.mountedDevices();
		var devicesShortcuts = $.w.list(['Volumes']);
		var i = 0;
		
		for (var local in mountedDevices) {
			(function(local, point) {
				var driverData = Webos.File.getDriverData(point.get('driver'));
				var item = $.w.listItem(['<img src="'+new W.Icon(driverData.icon, 22)+'" alt=""/> ' + t.get('${driver} on ${local}', { driver: driverData.title, local: local })]).bind('listitemselect', function() {
					$(this).listItem('option', 'active', false);
				}).click(function(e) {
					if ($(e.target).is('.umount')) {
						if (Webos.File.umount(local) === false) {
							Webos.Error.trigger(t.get('Can\'t unmount "${driver}" on "${local}"', { driver: driverData.title, local: local }));
						}
						return;
					}
					
					that.options.open(local);
				});
				$('<img />', { src: new W.Icon('actions/umount', 16), alt: '', title: t.get('Unmount volume') }).addClass('umount').prependTo(item.listItem('column', 0));
				
				item.appendTo(devicesShortcuts.list('content'));
			})(local, mountedDevices[local]);
			i++;
		}
		
		if (i > 0) {
			this.options._devices = devicesShortcuts.appendTo(this.element);
		}
	},
	destroy: function() {
		Webos.File.unbind(this.options._mountCallback);
		Webos.File.unbind(this.options._umountCallback);
	}
});
$.webos.widget('nautilusShortcuts', nautilusShortcutsProperties);

$.webos.nautilusShortcuts = function(fn) {
	return $('<div></div>').nautilusShortcuts({
		open: fn
	});
};

var nautilusFileSelectorShortcutsProperties = $.webos.extend($.webos.properties.get('nautilusShortcuts'), {
	_name: 'nautilusshortcuts',
	options: {
		exists: true,
		select: function() {},
		selectMultiple: false
	},
	_create: function() {
		var that = this, t = this.translations();
		
		if (Webos.LocalFile.support) {
			if (this.options.exists) {
				var item = $.w.listItem();
				
				var content = $('<div></div>').css('position', 'relative').appendTo(item.listItem('column', 0));
				
				content.append('<img src="'+new W.Icon('devices/display', 22)+'" alt=""/> '+t.get('Computer'));
				
				var input = $('<input />', {
					type: 'file'
				}).change(function() {
					var files = this.files;
					
					if (!files || files.length == 0) {
						return;
					}
					
					var list = [];
					for (var i = 0; i < files.length; i++) {
						list.push(Webos.File.get(files[i]));
					}
					
					that.options.select(list);
				}).css({
					position: 'absolute',
					top: 0,
					left: 0,
					height: '100%',
					width: '100%',
					margin: 0,
					padding: 0,
					opacity: 0
				});
				
				if (this.options.selectMultiple) {
					input.attr('multiple', 'multiple');
				}
				
				input.appendTo(content);
				
				item.appendTo(this.options._content.list('content'));
			}
		}
	}
});
$.webos.widget('nautilusFileSelectorShortcuts', nautilusFileSelectorShortcutsProperties);

$.webos.nautilusFileSelectorShortcuts = function(opts) {
	return $('<div></div>').nautilusFileSelectorShortcuts(opts);
};