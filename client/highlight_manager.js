var highlights = [
	'agate',
	'androidstudio',
	'atom-one-dark',
	'darcula',
	'github',
	'rainbow',
	'tomorrow',
	'xcode',
	'zenburn'
];

var currentHighlight = highlights[3];

function setHighlight(scheme) {
	currentHighlight = scheme;
	document.getElementById('highlight-link').href = "//cdnjs.cloudflare.com/ajax/libs/highlight.js/9.12.0/styles/" + scheme + ".min.css";
	localStorage.setItem('highlight', scheme);
}

highlights.forEach(function (scheme) {
	var option = document.createElement('option');
	option.textContent = scheme;
	option.value = scheme;
	document.getElementById('highlight-selector').appendChild(option);
});

document.getElementById('highlight-selector').addEventListener('change', function (e) {
	setHighlight(e.target.value);
});

document.getElementById('highlight-selector').value = currentHighlight;