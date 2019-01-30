// This is a modification to the hack.chat client code to add more useful features and the like

function join(channel) {
	ws = new WebSocket('wss://hack.chat/chat-ws');

	var wasConnected = false;

	ws.onopen = function () {
		if (!wasConnected) {
			if (location.hash) {
				myNick = location.hash.substr(1);
			} else {
				myNick = prompt('Nickname:', myNick);
			}
		}

		if (myNick) {
			localStorage.setItem('my-nick', myNick);
			send({ cmd: 'join', channel: channel, nick: myNick });
		}

		wasConnected = true;
	}

	ws.onclose = function () {
		if (wasConnected) {
			pushMessage({ nick: '!', text: "Server disconnected. Attempting to reconnect. . ." });
		}

		window.setTimeout(function () {
			join(channel);
		}, 2000);
	}

	ws.onmessage = function (message) {
		var args = JSON.parse(message.data);
		var cmd = args.cmd;
		var command = COMMANDS[cmd];
		command.call(null, args);
	}
}

var COMMANDS = {
	chat: function (args) {
		if (ignoredUsers.indexOf(args.nick) >= 0) {
			return;
		}

		pushMessage(args);
	},

	info: function (args) {
		args.nick = '*';

		pushMessage(args);
	},

	warn: function (args) {
		args.nick = '!';

		pushMessage(args);
	},

	onlineSet: function (args) {
		var nicks = args.nicks;

		usersClear();

		nicks.forEach(function (nick) {
			userAdd(nick);
		});

		pushMessage({ nick: '*', text: "Users online: " + nicks.join(", ") })
	},

	onlineAdd: function (args) {
		var nick = args.nick;

		userAdd(nick);

		if ($('#joined-left').checked) {
			pushMessage({ nick: '*', text: nick + " joined" });
		}
	},

	onlineRemove: function (args) {
		var nick = args.nick;

		userRemove(nick);

		if ($('#joined-left').checked) {
			pushMessage({ nick: '*', text: nick + " left" });
		}
	}
}

function pushMessage(args) {
	// Message container
	var messageEl = document.createElement('div');

	if (args.text.includes('@' + myNick.split('#')[0] + ' ')) {
		messageEl.classList.add('refmessage');
	} else {
		messageEl.classList.add('message');
	}

	if (verifyNickname(myNick) && args.nick == myNick) {
		messageEl.classList.add('me');
	} else if (args.nick == '!') {
		messageEl.classList.add('warn');
	} else if (args.nick == '*') {
		messageEl.classList.add('info');
	} else if (args.admin) {
		messageEl.classList.add('admin');
	} else if (args.mod) {
		messageEl.classList.add('mod');
	}

	// Nickname
	var nickSpanEl = document.createElement('span');
	nickSpanEl.classList.add('nick');
	messageEl.appendChild(nickSpanEl);

	if (args.trip) {
		var tripEl = document.createElement('span');
		tripEl.textContent = args.trip + " ";
		tripEl.classList.add('trip');
		nickSpanEl.appendChild(tripEl);
	}

	if (args.nick) {
		var nickLinkEl = document.createElement('a');
		nickLinkEl.textContent = args.nick;

		nickLinkEl.onclick = function () {
			insertAtCursor("@" + args.nick + " ");
			$('#chatinput').focus();
		}

		var date = new Date(args.time || Date.now());
		nickLinkEl.title = date.toLocaleString();
		nickSpanEl.appendChild(nickLinkEl);
	}

	// Text
	var textEl = document.createElement('pre');
	textEl.classList.add('text');

	textEl.textContent = args.text || '';
	textEl.innerHTML = textEl.innerHTML.replace(/(\?|https?:\/\/)\S+?(?=[,.!?:)]?\s|$)/g, parseLinks);

	if ($('#syntax-highlight').checked && textEl.textContent.indexOf('#') == 0) {
		var lang = textEl.textContent.split(/\s+/g)[0].replace('#', '');
		var codeEl = document.createElement('code');
		codeEl.classList.add(lang);
		var content = textEl.textContent.replace('#' + lang, '');
		codeEl.textContent = content.trim();
		hljs.highlightBlock(codeEl);
		textEl.innerHTML = '';
		textEl.appendChild(codeEl);
	} else if ($('#parse-latex').checked) {
		// Temporary hotfix for \rule spamming, see https://github.com/Khan/KaTeX/issues/109
		textEl.innerHTML = textEl.innerHTML.replace(/\\rule|\\\\\s*\[.*?\]/g, '');
		try {
			renderMathInElement(textEl, {
				delimiters: [
					{ left: "$$", right: "$$", display: true },
					{ left: "$", right: "$", display: false },
				]
			})
		} catch (e) {
			console.warn(e);
		}
	}

	messageEl.appendChild(textEl);

	// Scroll to bottom
	var atBottom = isAtBottom();
	$('#messages').appendChild(messageEl);
	if (atBottom) {
		window.scrollTo(0, document.body.scrollHeight);
	}

	unread += 1;
	updateTitle();
}

function send(data) {
	if (ws && ws.readyState == ws.OPEN) {
		ws.send(JSON.stringify(data));
	}
}

window.onfocus = function () {
	windowActive = true;

	updateTitle();
}

window.onblur = function () {
	windowActive = false;
}

window.onscroll = function () {
	if (isAtBottom()) {
		updateTitle();
	}
}

function updateTitle() {
	if (windowActive && isAtBottom()) {
		unread = 0;
	}

	var title;
	if (myChannel) {
		title = "?" + myChannel;
	} else {
		title = "hack.chat";
	}

	if (unread > 0) {
		title = '(' + unread + ') ' + title;
	}

	document.title = title;
}

$('#footer').onclick = function () {
	$('#chatinput').focus();
}

$('#chatinput').onkeydown = function (e) {
	if (e.keyCode == 13 /* ENTER */ && !e.shiftKey) {
		e.preventDefault();

		// Submit message
		if (e.target.value != '') {
			var text = e.target.value;
			e.target.value = '';

			send({ cmd: 'chat', text: text });

			lastSent[0] = text;
			lastSent.unshift("");
			lastSentPos = 0;

			updateInputSize();
		}
	} else if (e.keyCode == 38 /* UP */) {
		// Restore previous sent messages
		if (e.target.selectionStart === 0 && lastSentPos < lastSent.length - 1) {
			e.preventDefault();

			if (lastSentPos == 0) {
				lastSent[0] = e.target.value;
			}

			lastSentPos += 1;
			e.target.value = lastSent[lastSentPos];
			e.target.selectionStart = e.target.selectionEnd = e.target.value.length;

			updateInputSize();
		}
	} else if (e.keyCode == 40 /* DOWN */) {
		if (e.target.selectionStart === e.target.value.length && lastSentPos > 0) {
			e.preventDefault();

			lastSentPos -= 1;
			e.target.value = lastSent[lastSentPos];
			e.target.selectionStart = e.target.selectionEnd = 0;

			updateInputSize();
		}
	} else if (e.keyCode == 27 /* ESC */) {
		e.preventDefault();

		// Clear input field
		e.target.value = "";
		lastSentPos = 0;
		lastSent[lastSentPos] = "";

		updateInputSize();
	} else if (e.keyCode == 9 /* TAB */) {
		// Tab complete nicknames starting with @
		e.preventDefault();

		var pos = e.target.selectionStart || 0;
		var text = e.target.value;
		var index = text.lastIndexOf('@', pos);

		if (index >= 0) {
			var stub = text.substring(index + 1, pos).toLowerCase();
			// Search for nick beginning with stub
			var nicks = onlineUsers.filter(function (nick) {
				return nick.toLowerCase().indexOf(stub) == 0
			});

			if (nicks.length == 1) {
				insertAtCursor(nicks[0].substr(stub.length) + " ");
			}
		}
	}
}

function updateInputSize() {
	var atBottom = isAtBottom();

	var input = $('#chatinput');
	input.style.height = 0;
	input.style.height = input.scrollHeight + 'px';
	document.body.style.marginBottom = $('#footer').offsetHeight + 'px';

	if (atBottom) {
		window.scrollTo(0, document.body.scrollHeight);
	}
}

$('#chatinput').oninput = function () {
	updateInputSize();
}

updateInputSize();


/* sidebar */

$('#sidebar').onmouseenter = $('#sidebar').ontouchstart = function (e) {
	$('#sidebar-content').classList.remove('hidden');
        $('#sidebar').classList.add('expand');
	e.stopPropagation();
}

$('#sidebar').onmouseleave = document.ontouchstart = function () {
	if (!$('#pin-sidebar').checked) {
		$('#sidebar-content').classList.add('hidden');
                $('#sidebar').classList.remove('expand');
	}
}

$('#clear-messages').onclick = function () {
	// Delete children elements
	var messages = $('#messages');
	while (messages.firstChild) {
		messages.removeChild(messages.firstChild);
	}
}

// Restore settings from localStorage

if (localStorage.getItem('pin-sidebar') == 'true') {
	$('#pin-sidebar').checked = true;
	$('#sidebar-content').classList.remove('hidden');
}

if (localStorage.getItem('joined-left') == 'false') {
	$('#joined-left').checked = false;
}

if (localStorage.getItem('parse-latex') == 'false') {
	$('#parse-latex').checked = false;
}

$('#pin-sidebar').onchange = function (e) {
	localStorage.setItem('pin-sidebar', !!e.target.checked);
}

$('#joined-left').onchange = function (e) {
	localStorage.setItem('joined-left', !!e.target.checked);
}

$('#parse-latex').onchange = function (e) {
	localStorage.setItem('parse-latex', !!e.target.checked);
}

function userAdd(nick) {
	var user = document.createElement('a');
	user.textContent = nick;

	user.onclick = function (e) {
		userInvite(nick)
	}

	var userLi = document.createElement('li');
	userLi.appendChild(user);
	$('#users').appendChild(userLi);
	onlineUsers.push(nick);
}

function userRemove(nick) {
	var users = $('#users');
	var children = users.children;

	for (var i = 0; i < children.length; i++) {
		var user = children[i];
		if (user.textContent == nick) {
			users.removeChild(user);
		}
	}

	var index = onlineUsers.indexOf(nick);
	if (index >= 0) {
		onlineUsers.splice(index, 1);
	}
}

function usersClear() {
	var users = $('#users');

	while (users.firstChild) {
		users.removeChild(users.firstChild);
	}

	onlineUsers.length = 0;
}

function userInvite(nick) {
	send({ cmd: 'invite', nick: nick });
}

function userIgnore(nick) {
	ignoredUsers.push(nick);
}

/* color scheme switcher */

var schemes = [
	'android',
	'atelier-dune',
	'atelier-forest',
	'atelier-heath',
	'atelier-lakeside',
	'atelier-seaside',
	'bright',
	'chalk',
	'default',
	'eighties',
	'greenscreen',
	'mariana',
	'mocha',
	'monokai',
	'nese',
	'ocean',
	'pop',
	'railscasts',
	'solarized',
	'tomorrow'
];


var currentScheme = schemes[1];

function setScheme(scheme) {
	currentScheme = scheme;
	$('#scheme-link').href = "schemes/" + scheme + ".css";
	localStorage.setItem('scheme', scheme);
}


// Add scheme options to dropdown selector
schemes.forEach(function (scheme) {
	var option = document.createElement('option');
	option.textContent = scheme;
	option.value = scheme;
	$('#scheme-selector').appendChild(option);
});

$('#scheme-selector').onchange = function (e) {
	setScheme(e.target.value);
}

// Load sidebar configaration values from local storage if available
if (localStorage.getItem('scheme')) {
	setScheme(localStorage.getItem('scheme'));
}

if (localStorage.getItem('highlight')) {
	setHighlight(localStorage.getItem('highlight'));
}

$('#scheme-selector').value = currentScheme;

/* main */

if (myChannel == '') {
	pushMessage({ text: frontpage });
	$('#footer').classList.add('hidden');
	$('#sidebar').classList.add('hidden');
} else {
	join(myChannel);
}
