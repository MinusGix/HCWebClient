
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
	document.getElementById('scheme-link').href = "schemes/" + scheme + ".css";
	localStorage.setItem('scheme', scheme);
}


// Add scheme options to dropdown selector
schemes.forEach(function (scheme) {
	var option = document.createElement('option');
	option.textContent = scheme;
	option.value = scheme;
	document.getElementById('scheme-selector').appendChild(option);
});

document.getElementById('scheme-selector').addEventListener("change", function (e) {
	setScheme(e.target.value);
});

// Load sidebar configaration values from local storage if available
if (localStorage.getItem('scheme')) {
	setScheme(localStorage.getItem('scheme'));
}

document.getElementById('scheme-selector').value = currentScheme;