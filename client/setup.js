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


var ws;
var myNick = localStorage.getItem('my-nick') || '';
var myChannel = window.location.search.replace(/^\?/, '');
var lastSent = [""];
var lastSentPos = 0;
var windowActive = true;
var unread = 0;
// User list
var onlineUsers = [];
var ignoredUsers = [];
