function showSidebar (e) {
	document.getElementById('sidebar-content').classList.remove('hidden');
    document.getElementById('sidebar').classList.add('expand');
	e.stopPropagation();
}

function hideSidebar (e) {
	if (!document.getElementById('pin-sidebar').checked) {
		document.getElementById('sidebar-content').classList.add('hidden');
        document.getElementById('sidebar').classList.remove('expand');
	}
}

document.getElementById('sidebar').addEventListener('mouseenter', showSidebar);
document.getElementById('sidebar').addEventListener('touchstart', showSidebar);

document.getElementById('sidebar').addEventListener('mouseleave', hideSidebar);
document.addEventListener('touchstart', hideSidebar);

document.getElementById('clear-messages').addEventListener('click', function () {
	// Delete children elements
	removeElementChildren(document.getElementById('messages'));
});

// Restore settings from localStorage

if (localStorage.getItem('pin-sidebar') == 'true') {
	document.getElementById('pin-sidebar').checked = true;
	document.getElementById('sidebar-content').classList.remove('hidden');
}

if (localStorage.getItem('joined-left') == 'false') {
	document.getElementById('joined-left').checked = false;
}

if (localStorage.getItem('parse-latex') == 'false') {
	document.getElementById('parse-latex').checked = false;
}

document.getElementById('pin-sidebar').addEventListener('change', function (e) {
	localStorage.setItem('pin-sidebar', !!e.target.checked);
});

document.getElementById('joined-left').addEventListener('change', function (e) {
	localStorage.setItem('joined-left', !!e.target.checked);
});

document.getElementById('parse-latex').addEventListener('change', function (e) {
	localStorage.setItem('parse-latex', !!e.target.checked);
});