let pageOpenCount = 0;

window.addEventListener('popstate', function() {
  pageOpenCount++;

  if (pageOpenCount > 2) {
    history.pushState(null, null, window.location.href);
    alert('You cannot navigate back any further.');
  }
});

window.addEventListener('load', function() {
  pageOpenCount = 0;
});