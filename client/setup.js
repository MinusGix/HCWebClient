var frontpage = [
	"                            _           _         _       _   ",
	"                           | |_ ___ ___| |_   ___| |_ ___| |_ ",
	"                           |   |_ ||  _| '_| |  _|   |_ ||  _|",
	"                           |_|_|__/|___|_,_|.|___|_|_|__/|_|  ",
	"",
	"",
	"Welcome to hack.chat, a minimal, distraction-free chat application.",
	"Channels are created, joined and shared with the url, create your own channel by changing the text after the question mark.",
	"If you wanted your channel name to be 'your-channel': https://hack.chat/?your-channel",
	"There are no channel lists, so a secret channel name can be used for private discussions.",
	"",
	"Here are some pre-made channels you can join:",
	"?lounge ?meta",
	"?math ?physics ?chemistry",
	"?technology ?programming",
	"?games ?banana",
	"And here's a random one generated just for you: ?" + Math.random().toString(36).substr(2, 8),
	"",
	"Formatting:",
	"Whitespace is preserved, so source code can be pasted verbatim.",
	"Surround LaTeX with a dollar sign for inline style $\\zeta(2) = \\pi^2/6$, and two dollars for display. $$\\int_0^1 \\int_0^1 \\frac{1}{1-xy} dx dy = \\frac{\\pi^2}{6}$$",
	"For syntax highlight, the first line of the code block must begin with #<format> where <format> can be html, js or any known format.",
	"",
	"Current Github for main hack.chat: https://github.com/hack-chat",
	"Real hack.chat website: https://hack.chat/",
	"Github for this web client: https://github.com/MinusGix/HCWebClient",
	"Legacy GitHub: https://github.com/AndrewBelt/hack.chat",
	"",
	"Bots, Android clients, desktop clients, browser extensions, docker images, programming libraries, server modules and more:",
	"https://github.com/hack-chat/3rd-party-software-list",
	"",
	"Server and web client released under the WTFPL and MIT open source license.",
	"No message history is retained on the hack.chat server."
].join("\n");

var verifyNickname = function (nick) {
	return /^[a-zA-Z0-9_]{1,24}$/.test(nick);
}

function removeElementChildren (element) {
	while (element.firstChild) {
		element.removeChild(element.firstChild);
	}
}

function insertAtCursor(text) {
	var input = document.getElementById('chatinput');
	var start = input.selectionStart || 0;
	var before = input.value.substr(0, start);
	var after = input.value.substr(start);

	before += text;
	input.value = before + after;
	input.selectionStart = input.selectionEnd = before.length;

	updateInputSize();
}

function parseLinks(g0) {
	var a = document.createElement('a');

	a.innerHTML = g0;

	var url = a.textContent;

	a.href = url;
	a.target = '_blank';

	return a.outerHTML;
}

function isAtBottom() {
	return (window.innerHeight + window.scrollY) >= (document.body.scrollHeight - 1);
}


var Sockets = {};
let focusedSocketId = null;
var myNick = localStorage.getItem('my-nick') || '';
var myChannel = window.location.search.replace(/^\?/, '');
var lastSent = [""];
var lastSentPos = 0;
var windowActive = true;
var unread = 0;
// User list
var onlineUsers = [];
var ignoredUsers = [];

function getNick () {
	return myNick.split('#')[0];
}

function getFocusedSocketData () {
	return Sockets[focusedSocketId] || null;
}

function getFocusedSocket () {
	let data = getFocusedSocketData();

	if (data === null) {
		return null;
	} else {
		return data.ws;
	}
}

function constructSocketObject (id) {
	return {
		id: id,
		ws: null,
		address: 'wss://hack.chat/chat-ws',
		wasConnected: false,
		data: {},
	};
}

// Construct a socket object for HC
function constructHCSocketObject (id, nick=null, pass=null, channel=null) {
	let socketData = constructSocketObject(id);

	socketData.data.nick = nick;
	socketData.data.pass = pass;
	socketData.data.channel = channel;

	return socketData;
}

function getSocketObject (id) {
	if (!Sockets.hasOwnProperty(id)) {
		Sockets[id] = constructSocketObject(id);

		if (Object.keys(Sockets) === 1) {
			focusedSocketId = id;
		}
	}
	return Sockets[id];
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

function userIgnore(nick) {
	ignoredUsers.push(nick);
}

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