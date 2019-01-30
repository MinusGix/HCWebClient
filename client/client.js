// This is a modification to the hack.chat client code to add more useful features and the like

function join(channel) {
	ws = new WebSocket('wss://hack.chat/chat-ws');

	var wasConnected = false;

	ws.addEventListener('open', function () {
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
	});

	ws.addEventListener('close', function () {
		if (wasConnected) {
			pushMessage({ nick: '!', text: "Server disconnected. Attempting to reconnect. . ." });
		}

		window.setTimeout(function () {
			join(channel);
		}, 2000);
	})

	ws.addEventListener('message', function (message) {
		var args;
		try {
			args = JSON.parse(message.data);
		} catch (err) {
			console.warn("There was an error in parsing json received from websocket.");
			console.log(ws, message, message.data);
			return;
		}

		if (!COMMANDS.hasOwnProperty(args.cmd)) {
			console.warn("There was an issue, the args received by the client contained a command that was unknown.");
			console.log(ws, message, message.data, args);
			return;
		}

		COMMANDS[args.cmd](args);
	});
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

		if (document.getElementById('joined-left').checked) {
			pushMessage({ nick: '*', text: nick + " joined" });
		}
	},

	onlineRemove: function (args) {
		var nick = args.nick;

		userRemove(nick);

		if (document.getElementById('joined-left').checked) {
			pushMessage({ nick: '*', text: nick + " left" });
		}
	},

	captcha: function (args) {
		pushMessage({ nick: '#', text: args.text });
	}
}

function pushMessage(args) {
	// Message container
	var messageEl = document.createElement('div');

	if (args.text.includes('@' + getNick() + ' ')) {
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
	} else if (args.nick == '#') { // to make the captcha fit into the view
		messageEl.style.fontSize = '4px';
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

		nickLinkEl.addEventListener('click', function () {
			insertAtCursor("@" + args.nick + " ");
			document.getElementById('chatinput').focus();
		})

		var date = new Date(args.time || Date.now());
		nickLinkEl.title = date.toLocaleString();
		nickSpanEl.appendChild(nickLinkEl);
	}

	// Text
	var textEl = document.createElement('pre');
	textEl.classList.add('text');

	textEl.textContent = args.text || '';
	textEl.innerHTML = textEl.innerHTML.replace(/(\?|https?:\/\/)\S+?(?=[,.!?:)]?\s|$)/g, parseLinks);

	if (document.getElementById('syntax-highlight').checked && textEl.textContent.indexOf('#') == 0) {
		var lang = textEl.textContent.split(/\s+/g)[0].replace('#', '');
		var codeEl = document.createElement('code');
		codeEl.classList.add(lang);
		var content = textEl.textContent.replace('#' + lang, '');
		codeEl.textContent = content.trim();
		hljs.highlightBlock(codeEl);
		textEl.innerHTML = '';
		textEl.appendChild(codeEl);
	} else if (document.getElementById('parse-latex').checked) {
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
	document.getElementById('messages').appendChild(messageEl);
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

window.addEventListener('focus', function () {
	windowActive = true;

	updateTitle();
})

window.addEventListener('blur', function () {
	windowActive = false;
});

window.addEventListener('scroll', function () {
	if (isAtBottom()) {
		updateTitle();
	}
});

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

document.getElementById('footer').addEventListener('click', function () {
	document.getElementById('chatinput').focus();
});

document.getElementById('chatinput').addEventListener('keydown', function (e) {
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
				return nick.toLowerCase().indexOf(stub) == 0;
			});

			if (nicks.length == 1) {
				insertAtCursor(nicks[0].substr(stub.length) + " ");
			}
		}
	}
});

function updateInputSize() {
	var atBottom = isAtBottom();

	var input = document.getElementById('chatinput');
	input.style.height = 0;
	input.style.height = input.scrollHeight + 'px';
	document.body.style.marginBottom = document.getElementById('footer').offsetHeight + 'px';

	if (atBottom) {
		window.scrollTo(0, document.body.scrollHeight);
	}
}

document.getElementById('chatinput').addEventListener('input', function () {
	updateInputSize();
});

updateInputSize();


/* sidebar */

function userAdd(nick) {
	addUserToSidebar(nick);
	
	onlineUsers.push(nick);
}

function userRemove(nick) {
	removeUserFromSidebar(nick);

	var index = onlineUsers.indexOf(nick);
	if (index >= 0) {
		onlineUsers.splice(index, 1);
	}
}

function usersClear() {
	clearSidebarUserList();

	onlineUsers.length = 0;
}

function userInvite(nick) {
	send({ cmd: 'invite', nick: nick });
}

function userIgnore(nick) {
	ignoredUsers.push(nick);
}

/* main */

if (myChannel == '') {
	pushMessage({ text: frontpage });
	document.getElementById('footer').classList.add('hidden');
	document.getElementById('sidebar').classList.add('hidden');
} else {
	join(myChannel);
}
