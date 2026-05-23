(function () {
    function getCurrentPage() {
        var path = window.location.pathname || '';
        var segments = path.split('/');
        var page = segments[segments.length - 1];
        return page || 'main.html';
    }

    function setActiveLink() {
        var currentPage = getCurrentPage();
        var links = document.querySelectorAll('.sidebar-link[data-page]');

        links.forEach(function (link) {
            if (link.getAttribute('data-page') === currentPage) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    function setUserName() {
        var userNameNode = document.getElementById('sidebar-user-name');
        if (!userNameNode) return;

        var user = {};
        try {
            user = JSON.parse(localStorage.getItem('user') || '{}');
        } catch (error) {
            user = {};
        }

        userNameNode.textContent = user.name || 'Guest User';
    }

    function handleSidebarToggle() {
        var toggle = document.getElementById('sidebar-toggle');
        if (!toggle) return;

        var collapsed = localStorage.getItem('sidebarCollapsed') === 'true';
        document.body.classList.toggle('sidebar-collapsed', collapsed);

        toggle.addEventListener('click', function () {
            var isCollapsed = document.body.classList.toggle('sidebar-collapsed');
            localStorage.setItem('sidebarCollapsed', String(isCollapsed));
        });
    }

    function handleLogout() {
        var logoutLink = document.getElementById('sidebar-logout');
        if (!logoutLink) return;

        logoutLink.addEventListener('click', function (event) {
            event.preventDefault();
            localStorage.clear();
            window.location.href = 'index.html';
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        setActiveLink();
        setUserName();
        handleSidebarToggle();
        handleLogout();
    });
})();
