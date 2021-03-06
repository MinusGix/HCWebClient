// This is a modification to the hack.chat client code to add more useful features and the like

let serviceTabs = {
	
}

function join(channel, socketId=null) {
	if (socketId === null) {
		socketId = Math.random().toString(36).slice(2);
	}

	var socketData = getSocketObject(socketId);

	socketData.ws = new WebSocket(socketData.address);

	socketData.ws.addEventListener('open', function () {
		if (!socketData.wasConnected) {
			if (location.hash) {
				myNick = location.hash.substr(1);
			} else {
				myNick = prompt('Nickname:', myNick);
			}
		}

		if (myNick) {
			localStorage.setItem('my-nick', myNick);
			send({ cmd: 'join', channel: channel, nick: myNick }, socketData.ws);
		}

		socketData.wasConnected = true;
	});

	socketData.ws.addEventListener('close', function () {
		if (socketData.wasConnected) {
			pushMessage({ nick: '!', text: "Server disconnected. Attempting to reconnect. . ." });
		}

		window.setTimeout(function () {
			join(channel, socketData);
		}, 2000);
	})

	socketData.ws.addEventListener('message', function (message) {
		var args;
		try {
			args = JSON.parse(message.data);
		} catch (err) {
			console.warn("There was an error in parsing json received from websocket.");
			console.log(socketData.ws, message, message.data);
			return;
		}

		if (!COMMANDS.hasOwnProperty(args.cmd)) {
			console.warn("There was an issue, the args received by the client contained a command that was unknown.");
			console.log(socketData.ws, message, message.data, args);
			return;
		}

		COMMANDS[args.cmd](args, socketData.ws);
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

	if (
		document.getElementById('syntax-highlight').checked &&
		textEl.textContent.startsWith('```') &&
		textEl.textContent.endsWith('```')
	) {
		var lang = textEl.textContent.split(/\s+/g)[0].replace('```', '').trim();

		var langLen = lang.length;

		if (lang == '') {
			lang = 'text';
			langLen = 0;
		}

		var codeEl = document.createElement('code');
		codeEl.classList.add(lang);
		var content = textEl.textContent.substr(3 + langLen, textEl.textContent.length - (6 + langLen)).trim();
		codeEl.textContent = content;
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

function send(data, socket) {
	if (socket && socket.readyState === socket.OPEN) {
		socket.send(JSON.stringify(data));
	} else {
		console.warn("Socket tried to send", data, "but socket either didn't exist or wasn't open. socket:", socket);
	}
}

document.getElementById('chatinput').addEventListener('keydown', function (e) {
	if (e.keyCode == 13 /* ENTER */ && !e.shiftKey) {
		e.preventDefault();

		// Submit message
		if (e.target.value != '') {
			var text = e.target.value;
			e.target.value = '';

			send({ cmd: 'chat', text: text }, getFocusedSocket());

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

function userInvite(nick) {
	send({ cmd: 'invite', nick: nick }, getFocusedSocket());
}

/* main */

if (myChannel == '') {
	pushMessage({ text: frontpage });
	document.getElementById('footer').classList.add('hidden');
	document.getElementById('sidebar').classList.add('hidden');
} else {
	join(myChannel);
}
