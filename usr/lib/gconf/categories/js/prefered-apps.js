var confWindow = args.getParam(0);
var content = confWindow.window('content');

var types = {
	'web-browser': {
		title: 'Websites'
	},
	'email-client': {
		title: 'E-mails'
	},
	'calendar': {
		title: 'Calendar'
	},
	'music-player': {
		title: 'Music'
	},
	'video-player': {
		title: 'Videos'
	},
	'image-viewer': {
		title: 'Pictures'
	}
};

confWindow.window('loading', true);
W.Application.list([function(apps) {
	for (var key in types) {
		(function(key, type) {
			var item = $.w.selectButton(type.title), choices = {}, nbrChoices = 0;

			item.bind('selectbuttonchange', function(e, data) {
				confWindow.window('loading', true);
				Webos.Application.setPrefered(data.value, key, function() {
					confWindow.window('loading', false);
				});
			});

			for (var i in apps) {
				var app = apps[i];
				if (app.exists('type') && $.inArray(key, app.get('type')) != -1) {
					choices[app.get('command')] = app.get('title');
					nbrChoices++;
				}
			}

			item.selectButton('option', 'choices', choices);

			W.Application.getPrefered(key, [function(app) {
				if (app) {
					if (!choices[app.get('command')]) {
						choices[app.get('command')] = app.get('title');
						nbrChoices++;
						item.selectButton('option', 'choices', choices);
					}

					item.selectButton('option', 'value', app.get('command'));
				}

				if (nbrChoices == 0) {
					item.selectButton('option', 'choices', { '': 'No application available' });
				}

				item.appendTo(content);
			}, function(response) {
				item.appendTo(content);
			}]);
		})(key, types[key]);
	}
	confWindow.window('loading', false);
}, function(response) {
	confWindow.window('loading', false);
	response.triggerError('Can\'t get available applications\' list');
}]);