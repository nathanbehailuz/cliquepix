function toggleFkey() {
    const fkey = document.getElementById('fkey');
    if (!fkey) {
        return;
    }
    if (fkey.style.visibility === 'hidden') {
        fkey.style.visibility = 'visible';
    } else {
        fkey.style.visibility = 'hidden';
    }
}

const filterDropdown = document.querySelector('.filter-dropdown');

if (filterDropdown) {
    const urlParams = new URLSearchParams(window.location.search);
    const currentFilter = urlParams.get('filterby') || 'all';
    filterDropdown.value = currentFilter;

    filterDropdown.addEventListener('change', () => {
        const selectedValue = encodeURIComponent(filterDropdown.value);
        if (selectedValue !== currentFilter) {
            window.location.href = `/main-page?filterby=${selectedValue}`;
        }
    });
}
